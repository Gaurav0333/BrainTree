const { paypalRestApiPath } = require('./path');
const { stub, assert } = require('sinon');

const paypalApi = require('proxyquire').noCallThru()(paypalRestApiPath, {
    '*/cartridge/scripts/braintree/helpers/paymentHelper': {
        getLogger: () => { }
    },
    '~/cartridge/config/braintreePreferences': () => prefs
});


describe('paypalApi', function () {
    before(function () {
        stub(paypalApi, 'call');
    });

    afterEach(function () {
        paypalApi.call.reset();
    });

    after(function () {
        paypalApi.call.restore();
    });

    describe('getToken', function () {
        before(function () {
            paypalApi.oauth2.getToken();
        });
        it('should call paypal api with valid arguments', function () {
            assert.calledWith(paypalApi.call, 'POST', 'oauth2/token', {
                grant_type: 'client_credentials'
            }, 'application/x-www-form-urlencoded');
        });
    });
});
