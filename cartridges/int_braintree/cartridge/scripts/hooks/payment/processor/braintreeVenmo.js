'use strict';

var braintreeVenmoProcessor = require('~/cartridge/scripts/braintree/processors/processorVenmo');

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Object} basket Basket
 * @returns {Object} handle call result
 */
function Handle(basket) {
    var result = braintreeVenmoProcessor.handle(basket);
    return result;
}

/**
 * Create sale transaction and handle result
 * @param {string} orderNumber Order Number
 * @param {Object} paymentInstrument Payment Instrument
 * @returns {Object} sale call result
 */
function Authorize(orderNumber, paymentInstrument) {
    var result = braintreeVenmoProcessor.authorize(orderNumber, paymentInstrument);
    return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;
