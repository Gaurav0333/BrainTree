/* eslint-disable no-shadow */
'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Begin', function (_, res, next) {
    var { vaultMode } = require('*/cartridge/config/braintreePreferences');

    if (vaultMode) {
        this.on('route:BeforeComplete', function () {
            var paypalOptions = res.getViewData().braintree.payPalButtonConfig.options;
            paypalOptions.flow = 'checkout';
            paypalOptions.requestBillingAgreement = true;
            paypalOptions.billingAgreementDetails = {
                description: paypalOptions.billingAgreementDescription
            };
        });
    }
    return next();
});

module.exports = server.exports();
