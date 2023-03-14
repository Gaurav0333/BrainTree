'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

/**
 * Any customization on this endpoint, also requires update for Default-Start endpoint
 */
server.append('Show', function (req, res, next) {
    var { bannerSize, publisherID, isActive } = require('../config/financialPreferences');

    res.setViewData({
        bannerSize: bannerSize,
        publisherID: publisherID,
        isActive: isActive
    });
    next();
});

module.exports = server.exports();
