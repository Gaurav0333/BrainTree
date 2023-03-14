var { expect } = require('chai');
var { processorApplepayPath } = require('./path');
var { stub } = require('sinon');
require('dw-api-mock/demandware-globals');

const isCustomerExistInVault = stub();
const createCustomerId = stub();
const createGuestCustomerData = stub();
const getISO3Country = stub();
const createAddressData = stub();
const createFullName = stub();
const isCountryCodesUpperCase = stub();
const handleErrorCode = stub();
const currencyCode = 'USD';
const items = [{
    id: 'item'
}];
const prefs = {
    isSettle: true,
    vaultMode: true,
    isL2L3: false,
    applePayMethodName: 'applePay'
};

const {
    authorizeFailedFlow
} = require('proxyquire').noCallThru()(processorApplepayPath, {
    'dw/order/OrderMgr': dw.order.OrderMgr,
    'dw/order/PaymentMgr': dw.order.PaymentMgr,
    'dw/system/Transaction': dw.system.Transaction,
    '~/cartridge/config/braintreePreferences': () => prefs,
    '~/cartridge/scripts/braintree/helpers/paymentHelper': {
        getLogger: () => { },
        createAddressData,
        getLineItems: () => (items),
        handleErrorCode
    },
    '~/cartridge/scripts/braintree/helpers/customerHelper': {
        createCustomerId
    },
    '~/cartridge/scripts/braintree/processors/processorHelper': {
        createGuestCustomerData,
        getISO3Country,
        createFullName,
        isCountryCodesUpperCase,
        getCustomFields: () => '<test>value</test>',
        createBaseSaleTransactionData: () => ({
            options:{}
        })

    },
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls': {
        isCustomerExistInVault
    }
});


describe('createSaleTransactionData', () => {
    before(() => {
        isCustomerExistInVault.reset();
    });

    let authStatus;
    const customerData = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phone: 'phone'
    };
    const shipping = {
        countryCodeAlpha2: 'US',
        id: 'shipping'
    };
    const orderShipping = {
        id: 'orderShipping'
    };
    const customerLocale = 'en_US';
    const order = {
        getCustomer: () => ({
            isAuthenticated: () => authStatus
        }),
        getOrderNo: () => '12222',
        getCurrencyCode: () => currencyCode,
        getTotalTax: () => ({
            toNumberString: () => 12
        }),
        getCustomerLocaleID: () => customerLocale,
        getDefaultShipment: () => ({
            getShippingAddress: () => (orderShipping)
        }),
        getShippingTotalPrice: () => ({
            value: 12
        })
    };
    createCustomerId.returns('1730');
    createGuestCustomerData.returns(customerData);
    createAddressData.withArgs(orderShipping).returns(shipping);
    getISO3Country.withArgs(customerLocale).returns('USA');
    const paymentInstrument = {
        custom: {
            braintreePaymentMethodNonce: 'testNonce'
        }
    };
});

describe('authorizeFailedFlow', () => {
    let orderCustom = {};
    let paymentInstrumentCustom = {};
    const order = {
        custom: orderCustom
    };
    const paymentInstrument = {
        custom: paymentInstrumentCustom
    };
    const braintreeError = 'braintreeError';

    describe('if payment error occurs', () => {
        let result;
        before(() => {
            result = authorizeFailedFlow(order, paymentInstrument, braintreeError);
        });
        it('should write info about failed order into payment instrument', () => {
            expect(result).to.deep.equal({ error: true });
        });
        it('should set isBraintree as true in order custom', () => {
            expect(orderCustom.isBraintree).to.be.true;
        });
        it('should set braintreeFailReason in paymentInstrument', () => {
            expect(paymentInstrumentCustom.braintreeFailReason).to.be.equal(braintreeError);
        });
    });
});
