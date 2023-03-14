'use strict';

const paypalRestApi = require('./paypalRestApi');

/**
 * Calculates financing options available for a transaction
 * https://developer.paypal.com/docs/limited-release/financing-options/api/#calculated-financing-options_calculate
 *
 * @param {Obejct} data - Request data
 * @returns {Object} Response object
 */
function getCalculatedFinancingOptions(data) {
    return paypalRestApi.call('POST', 'credit/calculated-financing-options', data);
}

module.exports = {
    getCalculatedFinancingOptions: getCalculatedFinancingOptions
};
