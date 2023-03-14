var { expect } = require('chai');
var { processorPaypalPath } = require('./path');
var { stub, assert } = require('sinon');
require('dw-api-mock/demandware-globals');

const isCustomerExistInVault = stub();
const createCustomerId = stub();
const createGuestCustomerData = stub();
const createAddressData = stub();
const createFullName = stub();
const isCountryCodesUpperCase = stub();
const createPaymentMethod = stub();
const saveGeneralTransactionData = stub();
const handleErrorCode = stub();

const currencyCode = 'USD';
const items = [{
    id: 'item'
}];
const prefs = {
    paypalDescriptorName: 'Descriptor_Name',
    isPaypalFraudToolsEnabled: false,
    vaultMode: true,
    isL2L3: false,
    paymentMethods: {
        BRAINTREE_PAYPAL: {
            paymentMethodId: 'BRAINTREE_PAYPAL'
        },
        BRAINTREE_CREDIT: {
            paymentMethodId: 'BRAINTREE_CREDIT'
        },
        BRAINTREE_APPLEPAY: {
            paymentMethodId: 'BRAINTREE_APPLEPAY'
        }
    }
};

const {
	savePaypalAccount,
	saveTransactionData,
	authorizeFailedFlow,
	createSaleTransactionData,
	intentOrderFlow
} = require('proxyquire').noCallThru()(processorPaypalPath, {
    'dw/order/OrderMgr': dw.order.OrderMgr,
    'dw/order/PaymentMgr': dw.order.PaymentMgr,
    'dw/system/Transaction': dw.system.Transaction,
    '~/cartridge/config/braintreePreferences': prefs,
    '~/cartridge/scripts/braintree/helpers/paymentHelper': {
        getLogger: () => { },
        createAddressData,
        getAmountPaid: () => new dw.value.Money(15, currencyCode),
        getLineItems: () => (items),
        handleErrorCode
    },
    '~/cartridge/scripts/braintree/helpers/customerHelper': {
        createCustomerId
    },
    '~/cartridge/scripts/braintree/processors/processorHelper': {
        createGuestCustomerData,
        createFullName,
        isCountryCodesUpperCase,
        getCustomFields: () => ({ 'custom': 'value' }),
        createBaseSaleTransactionData: () => ({
            options:{}
        }),
        saveGeneralTransactionData
    },
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls': {
        isCustomerExistInVault,
        createPaymentMethod
    }
});

describe('createSaleTransactionData', () => {
    let authStatus;
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
    const paymentInstrument = {
        creditCardToken: 'testToken',
        custom: {
            braintreeIs3dSecureRequired: false,
            braintreePaymentMethodNonce: 'testNonce',
            braintreeFraudRiskData: 'riskData'
        }
    };

    describe('if name descriptors exists', () => {
        let result;
        before(() => {
            prefs.paypalDescriptorName = 'Descriptor_Name';
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set descriptor name value equal custom pref', () => {
            expect(result.descriptor.name).to.be.equal('Descriptor_Name');
        });
    });

    describe('if isPaypalFraudToolsEnabled enabled', () => {
        let result;
        before(() => {
            prefs.isPaypalFraudToolsEnabled = true;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set deviceData value equal custom pref', () => {
            expect(result.deviceData).to.be.equal('riskData');
        });
    });

    describe('if name descriptors does not exist', () => {
        let result;
        before(() => {
            prefs.paypalDescriptorName = null;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set empty descriptor name', () => {
            expect(result.descriptor.name).to.be.equal('');
        });
    });

    describe('if vaultMode is true', () => {
        let result;
        before(() => {
            prefs.vaultMode = true;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set addBillingAddress option as true', () => {
            expect(result.options.addBillingAddress).to.be.true;
        });
    });

    describe('if vaultMode is false', () => {
        let result;
        before(() => {
            prefs.vaultMode = false;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should not set addBillingAddress option', () => {
            expect(result.options.addBillingAddress).to.be.undefined;
        });
    });

    describe('if no braintreePaymentMethodNonce and braintreePaymentMethodToken was found in payment instrument', () => {
        const message = 'paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty';
        before(() => {
            paymentInstrument.custom.braintreePaymentMethodNonce = null;
            paymentInstrument.creditCardToken = null;
        });

        it('should throw an error', () => {
            expect(createSaleTransactionData.bind(null, order, paymentInstrument)).to.throw(message);
        });
    });
});

describe('authorizeFailedFlow', () => {
    let authStatus = false;
    let profileCustom = {};
    const order = {
        getCustomer: () => ({
            isRegistered: () => authStatus,
            getProfile: () => ({
                custom: profileCustom
            })
        }),
        custom: {}
    };
    const paymentInstrument = {
        custom: {}
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
            expect(order.custom.isBraintree).to.be.true;
        });
        it('should set braintreeFailReason in paymentInstrument', () => {
            expect(paymentInstrument.custom.braintreeFailReason).to.be.equal(braintreeError);
        });
        describe('if customer is guest', () => {
            it('should not set isBraintree in customer profile', () => {
                expect(profileCustom.isBraintree).to.be.undefined;
            });
        });
    });
    describe('if payment error occurs and customer registered and exist in vault', () => {
        before(() => {
            authStatus = true;
            isCustomerExistInVault.returns(true);
            authorizeFailedFlow(order, paymentInstrument, braintreeError);
        });
        it('should set isBraintree true in customer profile', () => {
            expect(profileCustom.isBraintree).to.be.true;
        });
    });
});

describe('saveTransactionData', () => {
    const setTransactionID = stub();
    const setAmount = stub();
    let authStatus = false;
    const customerCustom = {};
    const paymentInstrument = {
        getPaymentTransaction: () => ({
            setTransactionID,
            setAmount
        }),
        setCreditCardNumber: stub(),
        setCreditCardExpirationMonth: stub(),
        setCreditCardExpirationYear: stub(),
        custom: {}
    };
    const responseTransaction = {
        id: 'av11',
        amount: '22',
        status: 'created',
        paypal: {
            token: 'mmo12c'
        }
    };
    const order = {
        getCustomer: () => ({
            isRegistered: () => authStatus,
            getProfile: () => ({
                custom: customerCustom
            })
        }),
        getCurrencyCode: () => 'USD',
        custom: {}
    };

    describe('if valid transaction response was send', () => {
        before(() => {
            isCustomerExistInVault.returns(false);
            saveTransactionData(order, paymentInstrument, responseTransaction);
        });

        describe('if token was created during sale transaction call', () => {
            it('should set payment instrument creditCardToken', () => {
                expect(paymentInstrument.creditCardToken).to.be.equal(responseTransaction.paypal.token);
            });
        });

        describe('if customer is guest', () => {
            it('should set order custom attribute isBraintree as true', () => {
                expect(customerCustom.isBraintree).to.be.undefined;
            });
        });
    });

    describe('if riskData was found in transaction response', () => {
        before(() => {
            responseTransaction.riskData = {
                decision: 'approved'
            };
            saveTransactionData(order, paymentInstrument, responseTransaction);
        });
        it('should set order custom attribute braintreeFraudRiskData equal riskData decision', () => {
            expect(order.custom.braintreeFraudRiskData).to.be.equal('approved');
        });
        it('should set payment instrument custom attribute braintreeFraudRiskData equal riskData decision', () => {
            expect(paymentInstrument.custom.braintreeFraudRiskData).to.be.equal('approved');
        });
    });

    describe('if customer is logged in storefront and exist in Vault', () => {
        before(() => {
            authStatus = true;
            isCustomerExistInVault.returns(true);
            saveTransactionData(order, paymentInstrument, responseTransaction);
        });
        it('should set profile custom attribute isBraintree as true', () => {
            expect(customerCustom.isBraintree).to.be.true;
        });
    });
});

describe('savePaypalAccount', () => {
    const createPaymentInstrument = stub();
    const customerPaymentInstrument = {
        setCreditCardType: stub(),
        creditCardToken: '',
        custom: {}
    };
    const saleTransactionResponseData = {
        transaction: {
            paypal: {
                payerEmail: 'payerEmail',
                token: 'testToken'
            }
        }
    };
    const order = {
        getBillingAddress: () => ({
            getFirstName: () => 'firstName',
            getLastName: () => 'lastName',
            getCountryCode: () => ({ value: 'country code' }),
            getCity: () => 'city',
            getAddress1: () => 'address1',
            getAddress2: () => 'address2',
            getPostalCode: () => 'postalCode',
            getStateCode: () => 'state',
            getPhone: () => 'phone'
        })
    };

    before(() => {
        stub(customer, 'getProfile').returns({
            getWallet: () => ({
                createPaymentInstrument
            })
        });
    });

    after(function () {
        customer.getProfile.restore();
    });

    describe('if no error occurs', () => {
        let result;
        before(() => {
            createPaymentInstrument.returns(customerPaymentInstrument);
            result = savePaypalAccount(order, saleTransactionResponseData.transaction.paypal);
        });

        it('should create customers payment instrument with PayPal processor', () => {
            assert.calledWith(createPaymentInstrument, prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        });
        it('should created payment instrument card type as visa', () => {
            assert.calledWith(customerPaymentInstrument.setCreditCardType, 'visa');
        });

        it('should save paypal account email', () => {
            expect(customerPaymentInstrument.custom.braintreePaypalAccountEmail).to.be.equal('payerEmail');
        });
        it('should save paypal account token', () => {
            expect(customerPaymentInstrument.creditCardToken).to.be.equal('testToken');
        });
        it('should save paypal account address', () => {
            const expectedData = {
                'firstName': 'firstName',
                'lastName': 'lastName',
                'countryCodeAlpha2': 'country code',
                'locality': 'city',
                'streetAddress': 'address1',
                'extendedAddress': 'address2',
                'postalCode': 'postalCode',
                'region': 'state',
                'phone': 'phone'
            };
            expect(customerPaymentInstrument.custom.braintreePaypalAccountAddresses).to.be.equal(JSON.stringify(expectedData));
        });
    });
});

describe('intentOrderFlow', () => {
    const paymentInstrument = {
        custom: {}
    };
    const order = {
        custom: {}
    };

    before(() => {
        paymentInstrument.custom.braintreePaymentMethodToken = 'testToken';
        intentOrderFlow(order, paymentInstrument);
    });

    describe('should set payment info if payment method token was found', () => {
        before(() => {
            paymentInstrument.custom.braintreePaymentMethodToken = 'testToken';
            intentOrderFlow(order, paymentInstrument);
        });

        it('should set order custom attribute isBraintree as true', () => {
            expect(order.custom.isBraintree).to.be.true;
        });
        it('should set order custom attribute isBraintreeIntentOrder as true', () => {
            expect(order.custom.isBraintreeIntentOrder).to.be.true;
        });
        it('should set order custom attribute braintreeFraudRiskData as null', () => {
            expect(paymentInstrument.custom.braintreeFraudRiskData).to.be.null;
        });
        it('should set order custom attribute braintreePaymentMethodToken as testToken', () => {
            expect(paymentInstrument.custom.braintreePaymentMethodToken).to.be.equal('testToken');
        });
    });

    describe('if no payment method token was found and customer is registered user', () => {
        before(() => {
            createPaymentMethod.returns('tokenFromNonce');
            paymentInstrument.custom.braintreePaymentMethodToken = null;
            stub(customer, 'isRegistered').returns(true);
            intentOrderFlow(order, paymentInstrument);
        });

        after(function () {
            customer.isRegistered.restore();
        });

        it('should set order custom attribute isBraintree as true', () => {
            expect(order.custom.isBraintree).to.be.true;
        });
        it('should set order custom attribute isBraintreeIntentOrder as true', () => {
            expect(order.custom.isBraintreeIntentOrder).to.be.true;
        });
        it('should set order custom attribute braintreeFraudRiskData as null', () => {
            expect(paymentInstrument.custom.braintreeFraudRiskData).to.be.null;
        });
        it('should set order custom attribute braintreePaymentMethodToken as tokenFromNonce', () => {
            expect(paymentInstrument.creditCardToken).to.be.equal('tokenFromNonce');
        });
    });
});
