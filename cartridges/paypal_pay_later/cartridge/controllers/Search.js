'use strict';

var page = module.superModule;
var server = require('server');

const creditMessageAvaliable = require('dw/system/Site').current.getCustomPreferenceValue('PP_Show_On_Category');
server.extend(page);

server.append('Show', function (req, res, next) {
    if (!creditMessageAvaliable) return next();
    var { categoryMessageConfig } = require('../config/creditMessageConfig');
    const basket = require('dw/order/BasketMgr').getCurrentBasket();
    var clientToken = require('*/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls').getClientToken();

    res.setViewData({
        paypal: {
            bannerConfig: categoryMessageConfig,
            clientToken: clientToken,
            paypalAmount: (basket && basket.totalGrossPrice.value) || 0
        },
        creditMessageAvaliable: creditMessageAvaliable
    });

    next();
});

module.exports = server.exports();
