/* eslint-disable no-shadow */
'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Show', function (_, res, next) {
    const Site = require('dw/system/Site');
    const creditMessageAvaliable = Site.current.getCustomPreferenceValue('PP_Show_On_Cart');
    const basket = require('dw/order/BasketMgr').getCurrentBasket();
    var { vaultMode } = require('*/cartridge/config/braintreePreferences');
    var { braintree } = res.getViewData();
    if (!basket) return next();

    if (creditMessageAvaliable || vaultMode) {
        this.on('route:BeforeComplete', function () {
            var { isPaypalButtonEnabled } = require('*/cartridge/scripts/braintree/helpers/paymentHelper');
            const { cartMessageConfig } = require('../config/creditMessageConfig');

            if (vaultMode && braintree && braintree.payPalButtonConfig) {
                var paypalOptions = res.getViewData().braintree.payPalButtonConfig.options;
                paypalOptions.flow = 'checkout';
                paypalOptions.requestBillingAgreement = true;
                paypalOptions.billingAgreementDetails = {
                    description: paypalOptions.billingAgreementDescription
                };
            }

            res.setViewData({
                paypalAmount: basket.totalGrossPrice.value,
                bannerConfig: cartMessageConfig,
                creditMessageAvaliable: creditMessageAvaliable,
                isCartButtonEnabled: isPaypalButtonEnabled('cart')
            });
        });
    }
    return next();
});

server.append('MiniCartShow', function (_, res, next) {
    var { vaultMode } = require('*/cartridge/config/braintreePreferences');
    var { braintree } = res.getViewData();

    if (vaultMode && braintree && braintree.payPalButtonConfig) {
        this.on('route:BeforeComplete', function () {
            var viewData = res.getViewData();
            viewData.braintree.payPalButtonConfig.options.flow = 'checkout';
            viewData.braintree.payPalButtonConfig.options.requestBillingAgreement = true;
        });
    }
    return next();
});

module.exports = server.exports();
