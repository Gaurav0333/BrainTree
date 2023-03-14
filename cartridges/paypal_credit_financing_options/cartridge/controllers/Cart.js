'use strict';

var page = module.superModule;
var server = require('server');
server.extend(page);

server.append('Show', function (req, res, next) {
    const basket = require('dw/order/BasketMgr').getCurrentBasket();
    var { bannerSize, publisherID, isActive } = require('../config/financialPreferences');

    if (!basket) {
        return next();
    }

    res.setViewData({
        paypalCalculatedCost: basket.totalGrossPrice,
        bannerSize: bannerSize,
        publisherID: publisherID,
        isActive: isActive
    });
    next();
});

module.exports = server.exports();
