'use strict';

var page = module.superModule;
var server = require('server');

var {
    getActiveLocalPaymentMethod,
    getGooglepayCardDescriprionFromOrder
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

server.extend(page);

server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(req.querystring.ID);

    res.setViewData({
        braintree: {
            summaryEmail: null,
            currency: order.getCurrencyCode(),
            lpmActivePaymentMethod: getActiveLocalPaymentMethod(order),
            googlepayCardDescription: getGooglepayCardDescriprionFromOrder(order)
        }
    });
    next();
});

server.append('Details', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(req.querystring.orderID);

    res.setViewData({
        braintree: {
            summaryEmail: null,
            currency: order.getCurrencyCode()
        }
    });
    next();
});

module.exports = server.exports();
