'use strict';

var page = module.superModule;
var server = require('server');
var Transaction = require('dw/system/Transaction');
var prefs = require('~/cartridge/config/braintreePreferences');
var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');

server.extend(page);

server.append('DeletePayment', function (req, res, next) {
    var array = require('*/cartridge/scripts/util/array');

    var UUID = req.querystring.UUID;
    var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
    var paymentToDelete = array.find(paymentInstruments, function (item) {
        return UUID === item.UUID;
    });

    var token = paymentToDelete.raw.creditCardToken;
    if (token !== null) {
        braintreeApiCalls.deletePaymentMethod(token);
    }

    if (paymentToDelete.raw.paymentMethod === prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId
        && paymentToDelete.raw.custom.braintreeDefaultCard) {
        var newDefaultPaypalAccount = array.find(paymentInstruments, function (item) {
            return !item.raw.custom.braintreeDefaultCard;
        });
        if (!empty(newDefaultPaypalAccount)) {
            Transaction.wrap(function () {
                newDefaultPaypalAccount.raw.custom.braintreeDefaultCard = true;
            });
            res.json({ newDefaultPaypalAccount: newDefaultPaypalAccount.UUID });
        }
    }

    next();
});

module.exports = server.exports();
