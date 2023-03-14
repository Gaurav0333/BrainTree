'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Show', function (_, res, next) {
    const creditMessageAvaliable = require('dw/system/Site').current.getCustomPreferenceValue('PP_Show_On_PDP');
    var { vaultMode } = require('*/cartridge/config/braintreePreferences');
    var { isPaypalButtonEnabled } = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
    var { productDetailMessageConfig } = require('../config/creditMessageConfig');
    var { braintree } = res.getViewData();

    if (vaultMode && braintree && braintree.payPalButtonConfig) {
        this.on('route:BeforeComplete', function () {
            var paypalOptions = braintree.payPalButtonConfig.options;
            paypalOptions.flow = 'checkout';
            paypalOptions.requestBillingAgreement = true;
            paypalOptions.billingAgreementDetails = {
                description: paypalOptions.billingAgreementDescription
            };
        });
    }

    if (!creditMessageAvaliable) return next();

    res.setViewData({
        paypal: {
            bannerConfig: productDetailMessageConfig
        },
        creditMessageAvaliable: creditMessageAvaliable,
        isPDPButtonEnabled: isPaypalButtonEnabled('pdp')
    });

    return next();
});

module.exports = server.exports();
