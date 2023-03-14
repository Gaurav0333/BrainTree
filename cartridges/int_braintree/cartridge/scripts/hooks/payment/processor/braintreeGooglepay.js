'use strict';

var braintreeGooglepayProcessor = require('~/cartridge/scripts/braintree/processors/processorGooglepay');
var Transaction = require('dw/system/Transaction');

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Object} basket Arguments of the HTTP call
 * @param {Object} billingData billingData object
 * @param {string} paymentMethodID payment Method Id
 * @param {Object} req req object
 * @returns {Object} handle call result
 */
function Handle(basket, billingData, paymentMethodID, req) {
    var data = {};
    if (!empty(req.body)) {
        // data from client ajax { nonce, saveGpAccount, paymentCardDescription, billingAddress, shippingAddress }
        try {
            data = JSON.parse(req.body);
        } catch (error) {
            throw new Error(error);
        }
    } else {
        data.nonce = req.form.braintreeGooglePayNonce;
        data.paymentCardDescription = req.form.braintreeGooglePayCardDescription;
        data.billingAddress = req.form.braintreeGooglePayBillingAddress;
        data.shippingAddress = req.form.braintreeGooglePayShippingAddress;
        data.accountUUID = req.form.braintreeGooglepayAccountsList;
        data.saveGpAccount = req.form.braintreeSaveGooglepayAccount === 'true';
        data.paymentType = req.form.braintreeGooglepayPaymentType;
    }
    data.paymentMethodID = paymentMethodID;

    if (!empty(session.privacy.emailFromBillingPage)
            && basket.getCustomerEmail() !== session.privacy.emailFromBillingPage) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(session.privacy.emailFromBillingPage);
        });
    }

    if (empty(data.nonce) && empty(data.accountUUID)) {
        return { error: true };
    }

    return braintreeGooglepayProcessor.handle(basket, data);
}

/**
 * Create sale transaction and handle result
 * @param {string} orderNumber Order Number
 * @param {Object} paymentInstrument Payment Instrument
 * @param {Object} paymentProcessor Payment Processor
 * @returns {Object} sale call result
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var result;
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        result = braintreeGooglepayProcessor.authorize(order, paymentInstrument, paymentProcessor);
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
        result = { error: true };
    }
    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
