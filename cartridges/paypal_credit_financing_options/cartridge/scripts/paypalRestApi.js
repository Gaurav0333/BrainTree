'use strict';

var logger = require('*/cartridge/scripts/braintree/helpers/paymentHelper').getLogger();

// https://developer.paypal.com/docs/api/overview/

var paypalApi = {};

/**
 * Executes request
 *
 * @param {string} methodType - Method type (DELETE, GET, PATCH, POST, PUT, REDIRECT)
 * @param {string} path - Resource/Endpoint
 * @param {Object} data - Request data
 * @param {string} contentType - Content type
 * @param {boolean} isUpadateBearToken - Is need Bear Token updating
 * @returns {Object} Response object
 */
paypalApi.call = function (methodType, path, data, contentType, isUpadateBearToken) {
    var createService = require('./paypalRestCreateService');
    var service;
    var result;
    var errorMsg;
    var responseData;

    try {
        service = createService();
    } catch (error) {
        errorMsg = 'Service int_paypal.http.rest.credit is undefined. Need to create int_paypal.http.rest.credit service in BM > Administration > Operations > Services';
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        result = service.setThrowOnError().call(methodType, path, data, contentType, paypalApi, isUpadateBearToken);
    } catch (error) {
        logger.error(error);
        throw new Error(error);
    }

    if (result.isOk()) {
        responseData = service.getResponse();
    } else {
        if (result.getErrorMessage() === null) {
            errorMsg = 'Likely Resource/Endpoint "' + path + '" is not supported by PayPal server';
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }
        responseData = JSON.parse(result.getErrorMessage());
        if (responseData.error === 'invalid_client') {
            logger.error('Double check Client ID (User field) and Sercret (Password field) in BM > Administration >  Operations >  Services > Service Credentials > ' + service.getConfiguration().getCredential().getID());
        }
        if (responseData.error === 'invalid_token') {
            return paypalApi.call(methodType, path, data, contentType, true);
        }
    }

    return responseData;
};

paypalApi.oauth2 = {};
/**
 * Gets oauth2 token
 * https://developer.paypal.com/docs/limited-release/financing-options/api/#active-merchant-financing-options
 * @returns {Object} Response object
 */
paypalApi.oauth2.getToken = function () {
    return paypalApi.call('POST', 'oauth2/token', {
        grant_type: 'client_credentials'
    }, 'application/x-www-form-urlencoded');
};

paypalApi.activities = {};
paypalApi.payments = {};
paypalApi.customer = {};
paypalApi.identity = {};
paypalApi.invoicing = {};

module.exports = paypalApi;
