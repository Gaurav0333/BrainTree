'use strict';


var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');

var {
    getAmountPaid,
    deleteBraintreePaymentInstruments,
    getLogger
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var prefs = require('~/cartridge/config/braintreePreferences');
var {
    createBaseSaleTransactionData,
    saveGeneralTransactionData
} = require('~/cartridge/scripts/braintree/processors/processorHelper');

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
    data.options.submitForSettlement = true;

    return data;
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} saleTransactionResponseData Response data from API call
 */
function saveTransactionData(order, paymentInstrument, saleTransactionResponseData) {
    var PT = require('dw/order/PaymentTransaction');
    var responseTransaction = saleTransactionResponseData.transaction;
    var paymentTransaction = paymentInstrument.getPaymentTransaction();

    Transaction.wrap(function () {
        paymentTransaction.setTransactionID(responseTransaction.id);
        paymentTransaction.setAmount(new Money(responseTransaction.amount, order.getCurrencyCode()));

        order.custom.isBraintree = true;
        order.custom.braintreePaymentStatus = responseTransaction.status;

        paymentInstrument.custom.braintreePaymentMethodNonce = null;

        if (responseTransaction.type === 'sale' && (responseTransaction.status === 'settling' || responseTransaction.status === 'submitted_for_settlement')) {
            paymentTransaction.setType(PT.TYPE_CAPTURE);
        }

        saveGeneralTransactionData(order, paymentInstrument, responseTransaction);
    });
}

/**
 * Create Braintree payment instrument
 * @param {dw.order.Order} order Order object
 * @param {string} lpmName Local Payment Method Name
 * @returns {Object} success object with Payment Instrument
 */
function createLpmPaymentInstrument(order, lpmName) {
    var lpmPaymentInstrument = null;
    if (Array.indexOf(prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds, lpmName) === -1) {
        return {
            error: true,
            message: Resource.msg('braintree.error.lpm_unconfigured_method', 'locale', null)
        };
    }
    var paymentProcessor = PaymentMgr.getPaymentMethod(lpmName).getPaymentProcessor();
    Transaction.wrap(function () {
        deleteBraintreePaymentInstruments(order);
        lpmPaymentInstrument = order.createPaymentInstrument(lpmName, getAmountPaid(order));
        lpmPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    return {
        success: true,
        lpmPaymentInstrument: lpmPaymentInstrument
    };
}

/**
 * Transaction sale call to confirm LPM transaction.
 * @param {dw.order.Order} order Order
 * @param {string} nonce Local Payment Method Nonce
 * @param {string} lpmName Local Payment Method Name
 * @returns {Object} success object
 */
function setLpmTransactionSale(order, nonce, lpmName) {
    var lmpPIHandle = null;
    try {
        lmpPIHandle = createLpmPaymentInstrument(order, lpmName);
        if (lmpPIHandle.error) {
            return {
                error: true,
                message: lmpPIHandle.message
            };
        }

        var paymentInstrument = lmpPIHandle.lpmPaymentInstrument;
        Transaction.wrap(function () {
            paymentInstrument.custom.braintreePaymentMethodNonce = nonce;
        });
        var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
        var saleTransactionResponseData = braintreeApiCalls.call(saleTransactionRequestData);
        saveTransactionData(order, paymentInstrument, saleTransactionResponseData);
    } catch (error) {
        getLogger().error(error);
        return {
            error: true,
            message: error.message
        };
    }

    return { success: true };
}

/*
 * Module exports
 */
exports.setLpmTransactionSale = setLpmTransactionSale;
