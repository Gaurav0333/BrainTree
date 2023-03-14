'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Start', function (req, res, next) {
    var { bannerSize, publisherID, isActive } = require('../config/financialPreferences');

    res.setViewData({
        bannerSize: bannerSize,
        publisherID: publisherID,
        isActive: isActive
    });
    next();
});

module.exports = server.exports();
