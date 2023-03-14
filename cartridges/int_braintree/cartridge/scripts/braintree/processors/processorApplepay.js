/* eslint-disable require-jsdoc */
'use strict';

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');

var {
    deleteBraintreePaymentInstruments,
    addDefaultShipping,
    getAmountPaid,
    handleErrorCode,
    getLogger
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    updateBillingAddress,
    updateShippingAddress,
    saveGeneralTransactionData,
    createBaseSaleTransactionData
} = require('~/cartridge/scripts/braintree/processors/processorHelper');

var prefs = require('~/cartridge/config/braintreePreferences');

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce');
    }
    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);

    return data;
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} object which indicates error
 */
function authorizeFailedFlow(orderRecord, paymentInstrumentRecord, braintreeError) {
    Transaction.wrap(function () {
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
    });

    handleErrorCode();

    return { error: true };
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @param {boolean} fromCart indicator for cart checkout
 * @returns {Object} success object
 */
function handle(basket, fromCart) {
    var httpParameterMap = request.httpParameterMap;
    var braintreeApplePayBillingAddress = httpParameterMap.braintreeApplePayBillingAddress.stringValue;
    var braintreeApplePayShippingAddress = httpParameterMap.braintreeApplePayShippingAddress.stringValue;
    var isNewBilling = !empty(braintreeApplePayBillingAddress) && braintreeApplePayBillingAddress !== '{}';
    var isNewShipping = !empty(braintreeApplePayShippingAddress) && braintreeApplePayShippingAddress !== '{}';
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_APPLEPAY.paymentMethodId).getPaymentProcessor();
    var applePayPaymentInstrument = null;

    if (!empty(fromCart)) {
        addDefaultShipping(basket);
    }

    Transaction.wrap(function () {
        if (!empty(fromCart)) {
            var paymentInstruments = basket.getPaymentInstruments();
            var iterator = paymentInstruments.iterator();
            var instument = null;
            while (iterator.hasNext()) {
                instument = iterator.next();
                basket.removePaymentInstrument(instument);
            }
        } else {
            deleteBraintreePaymentInstruments(basket);
        }

        applePayPaymentInstrument = basket.createPaymentInstrument(prefs.paymentMethods.BRAINTREE_APPLEPAY.paymentMethodId, getAmountPaid(basket));
        applePayPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    if (!httpParameterMap.braintreeApplePayNonce || httpParameterMap.braintreeApplePayNonce.stringValue === '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }

    if (isNewShipping && !!basket.getProductLineItems().size()) {
        updateShippingAddress(braintreeApplePayShippingAddress, basket.getDefaultShipment());
    }

    if (isNewBilling) {
        var newBilling = JSON.parse(braintreeApplePayBillingAddress);
        updateBillingAddress(newBilling, basket);
    }

    Transaction.wrap(function () {
        applePayPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreeApplePayNonce.stringValue;
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstrument Instrument
 * @returns {Object} success object
 */
function authorize(orderNo, paymentInstrument) {
    var order = OrderMgr.getOrder(orderNo);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            var saleTransactionResponseData = braintreeApiCalls.call(saleTransactionRequestData);
            Transaction.wrap(function () {
                saveGeneralTransactionData(order, paymentInstrument, saleTransactionResponseData.transaction);
                if (saleTransactionResponseData.transaction.applePay.token) {
                    paymentInstrument.creditCardToken = saleTransactionResponseData.transaction.applePay.token;
                }
            });
        } catch (error) {
            getLogger().error(error);
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

/*
 * Module exports
 */
exports.authorizeFailedFlow = authorizeFailedFlow;
exports.handle = handle;
exports.authorize = authorize;
exports.createSaleTransactionData = createSaleTransactionData;
