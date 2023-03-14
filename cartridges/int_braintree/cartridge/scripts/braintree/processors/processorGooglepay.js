/* eslint-disable require-jsdoc */
'use strict';

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');

var {
    getCustomerPaymentInstrument,
    getGooglePayCustomerPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');

var {
    deleteBraintreePaymentInstruments,
    getAmountPaid,
    handleErrorCode
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    updateBillingAddress,
    updateShippingAddress,
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    prepareBillingAddress,
    saveGooglePayAccount
} = require('~/cartridge/scripts/braintree/processors/processorHelper');

var prefs = require('~/cartridge/config/braintreePreferences');

var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
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
 * @param {Object} data data from processor handle hook
 * @returns {Object} success object
 */
function handle(basket, data) {
    var googlePayPaymentInstrument = null;
    var customerPaymentInstrument = null;
    var { paymentMethodID, nonce, paymentCardDescription, billingAddress, shippingAddress, accountUUID, saveGpAccount, paymentType } = data;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

    Transaction.wrap(function () {
        deleteBraintreePaymentInstruments(basket);
        googlePayPaymentInstrument = basket.createPaymentInstrument(paymentMethodID, getAmountPaid(basket));
        googlePayPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    if (!empty(accountUUID) && accountUUID !== 'newaccount') {
        customerPaymentInstrument = getCustomerPaymentInstrument(accountUUID);
        if (!customerPaymentInstrument) {
            return { error: true };
        }
    }

    if (!empty(shippingAddress)) {
        updateShippingAddress(shippingAddress, basket.getDefaultShipment());
    }

    var newBilling;
    if (customerPaymentInstrument) {
        newBilling = JSON.parse(customerPaymentInstrument.custom.braintreeGooglePayAccountAddresses);
    } else if (!empty(billingAddress)) {
        newBilling = JSON.parse(billingAddress);
    }
    if (!empty(newBilling)) {
        updateBillingAddress(newBilling, basket);
    }

    session.privacy.googlepayPaymentType = paymentType;

    Transaction.wrap(function () {
        googlePayPaymentInstrument.custom.braintreePaymentMethodNonce = customerPaymentInstrument ? '' : nonce;
        googlePayPaymentInstrument.custom.braintreeGooglePayCardDescription = customerPaymentInstrument ? '' : paymentCardDescription;
        googlePayPaymentInstrument.custom.braintreeSaveCreditCard = saveGpAccount;
        if (customerPaymentInstrument) {
            googlePayPaymentInstrument.creditCardToken = customerPaymentInstrument.creditCardToken;
        }
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {dw.order.Order} order - the order object
 * @param {Object} paymentInstrument Instrument
 * @param {Object} paymentProcessor Payment Processor
 * @returns {Object} success object
 */
function authorize(order, paymentInstrument, paymentProcessor) {
    try {
        var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
        var transactionResponseData = braintreeApiCalls.call(saleTransactionRequestData).transaction;

        Transaction.wrap(function () {
            saveGeneralTransactionData(order, paymentInstrument, transactionResponseData);
            paymentInstrument.getPaymentTransaction().setPaymentProcessor(paymentProcessor);
            // Save token for lightning order managment
            if (prefs.vaultMode && empty(paymentInstrument.creditCardToken)) {
                paymentInstrument.creditCardToken = transactionResponseData.androidPayCard.token;
            }
        });

        if (customer.authenticated && prefs.vaultMode && session.privacy.googlepayPaymentType === 'AndroidPayCard') {
            var existCustomerPaymentInstrument = getGooglePayCustomerPaymentInstrument();
            if (paymentInstrument.custom.braintreeSaveCreditCard && !existCustomerPaymentInstrument) {
                var googlePayAccountAddress = prepareBillingAddress(order);
                saveGooglePayAccount(transactionResponseData, googlePayAccountAddress);
                braintreeApiCalls.makeDefaultGooglePayAccount(transactionResponseData.androidPayCard.token);
                Transaction.wrap(function () {
                    customer.getProfile().custom.isBraintree = true;
                    paymentInstrument.custom.braintreeSaveCreditCard = null;
                });
            }
        }
        delete session.privacy.googlepayPaymentType;

        return { error: false };
    } catch (error) {
        return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
    }
}

/*
 * Module exports
 */
exports.authorizeFailedFlow = authorizeFailedFlow;
exports.handle = handle;
exports.authorize = authorize;
exports.createSaleTransactionData = createSaleTransactionData;
