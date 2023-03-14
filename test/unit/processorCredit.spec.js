var { expect } = require('chai');
var { processorCreditPath } = require('./path');
var { stub, assert } = require('sinon');
require('dw-api-mock/demandware-globals');

const isCustomerExistInVault = stub();
const createCustomerId = stub();
const createGuestCustomerData = stub();
const getISO3Country = stub();
const createAddressData = stub();
const saveGeneralTransactionData = stub();
const handleErrorCode = stub();

const currencyCode = 'USD';
const items = [{
    id: 'item'
}];
const prefs = {
    creditCardDescriptorName: 'Descriptor_Name',
    creditCardDescriptorPhone: 'Descriptor_Phone',
    creditCardDescriptorUrl: 'Descriptor_Url',
    isFraudToolsEnabled: false,
    isSettle: true,
    vaultMode: true,
    isL2L3: false,
    creditCardMethodName: 'creditCard'
};

const {
    saveCustomerCreditCard,
    saveTransactionData,
    authorizeFailedFlow,
    createSaleTransactionData
} = require('proxyquire').noCallThru()(processorCreditPath, {
    'dw/order/OrderMgr': dw.order.OrderMgr,
    'dw/order/PaymentMgr': dw.order.PaymentMgr,
    'dw/system/Transaction': dw.system.Transaction,
    '~/cartridge/config/braintreePreferences': prefs,
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
        getCustomFields: () => '<test>value</test>',
        createBaseSaleTransactionData: () => ({
            options: {}
        }),
        saveGeneralTransactionData
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
    const billing = {
        id: 'billing'
    };
    const shipping = {
        id: 'shipping'
    };
    const orderBilling = {
        id: 'orderBilling'
    };
    const orderShipping = {
        id: 'orderShipping'
    };
    const customerLocale = 'US';
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
        getBillingAddress: () => (orderBilling),
        getDefaultShipment: () => ({
            getShippingAddress: () => (orderShipping)
        }),
        getShippingTotalPrice: () => ({
            value: 12
        })
    };
    createCustomerId.returns('1730');
    createGuestCustomerData.returns(customerData);
    createAddressData.withArgs(orderBilling).returns(billing);
    createAddressData.withArgs(orderShipping).returns(shipping);
    getISO3Country.withArgs(customerLocale).returns('USA');
    const paymentInstrument = {
        creditCardToken: 'testToken',
        custom: {
            braintreeIs3dSecureRequired: false,
            braintreePaymentMethodNonce: 'testNonce',
            braintreeFraudRiskData: 'riskData'
        }
    };

    describe('if phone, name, url descriptors  exist', () => {
        let result;
        before(() => {
            prefs.creditCardDescriptorName = 'Descriptor_Name';
            prefs.creditCardDescriptorPhone = 'Descriptor_Phone';
            prefs.creditCardDescriptorUrl = 'Descriptor_Url';
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set descriptor name value equal custom pref', () => {
            expect(result.descriptor.name).to.be.equal('Descriptor_Name');
        });
        it('should set descriptor phone value equal custom pref', () => {
            expect(result.descriptor.phone).to.be.equal('Descriptor_Phone');
        });
        it('should set descriptor url value equal custom pref', () => {
            expect(result.descriptor.url).to.be.equal('Descriptor_Url');
        });
    });

    describe('if isFraudToolsEnabled enabled', () => {
        let result;
        before(() => {
            prefs.isFraudToolsEnabled = true;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set deviceData value equal custom pref', () => {
            expect(result.deviceData).to.be.equal('riskData');
        });
    });

    describe('if phone, name, url descriptors  do not exist', () => {
        let result;
        before(() => {
            prefs.creditCardDescriptorName = null;
            prefs.creditCardDescriptorPhone = null;
            prefs.creditCardDescriptorUrl = null;
            result = createSaleTransactionData(order, paymentInstrument);
        });
        it('should set empty descriptor name', () => {
            expect(result.descriptor.name).to.be.equal('');
        });
        it('should set empty descriptor phone', () => {
            expect(result.descriptor.phone).to.be.equal('');
        });
        it('should set empty descriptor url', () => {
            expect(result.descriptor.url).to.be.equal('');
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
    let orderCustom = {};
    let paymentInstrumentCustom = {};
    const order = {
        getCustomer: () => ({
            isRegistered: () => authStatus,
            getProfile: () => ({
                custom: profileCustom
            })
        }),
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
        it('should set braintreeSaveCreditCard as null in paymentInstrument', () => {
            expect(paymentInstrumentCustom.braintreeSaveCreditCard).to.be.null;
        });
        it('should set braintreeCreditCardMakeDefault as null in paymentInstrument', () => {
            expect(paymentInstrumentCustom.braintreeCreditCardMakeDefault).to.be.null;
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
    const orderCustom = {};
    let authStatus = false;
    const paymentInstrumentCustom = {};
    const customerCustom = {};
    const paymentInstrument = {
        getPaymentTransaction: () => ({
            setTransactionID,
            setAmount
        }),
        setCreditCardNumber: stub(),
        setCreditCardExpirationMonth: stub(),
        setCreditCardExpirationYear: stub(),
        creditCardToken: '',
        custom: paymentInstrumentCustom
    };
    const responseTransaction = {
        id: 'av11',
        amount: '22',
        status: 'created',
        creditCard: {
            token: 'xiou1t'
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
        custom: orderCustom
    };

    describe('if valid transaction response was send', () => {
        before(() => {
            isCustomerExistInVault.returns(false);
            saveTransactionData(order, paymentInstrument, responseTransaction);
        });

        describe('if no threeDSecureInfo was found in transaction response', () => {
            it('should not set payment instrument custom attribute braintree3dSecureStatus', () => {
                expect(paymentInstrumentCustom.braintree3dSecureStatus).to.be.null;
            });
        });

        describe('if no creditCard data was provided in transaction response', () => {
            it('should not set credit card number of payment instrument', () => {
                assert.notCalled(paymentInstrument.setCreditCardNumber);
            });
            it('should not set credit card mounth of payment instrument', () => {
                assert.notCalled(paymentInstrument.setCreditCardExpirationMonth);
            });
            it('should not set credit card year of payment instrument', () => {
                assert.notCalled(paymentInstrument.setCreditCardExpirationYear);
            });
            it('should not set creditCardToken', () => {
                expect(paymentInstrument.creditCardToken).to.equal(responseTransaction.creditCard.token);
            });
        });

        describe('if customer is guest', () => {
            it('should not set order custom attribute isBraintree', () => {
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
            expect(orderCustom.braintreeFraudRiskData).to.be.equal('approved');
        });
        it('should set payment instrument custom attribute braintreeFraudRiskData equal riskData decision', () => {
            expect(paymentInstrumentCustom.braintreeFraudRiskData).to.be.equal('approved');
        });
    });

    describe('if threeDSecureInfo was found in transaction response', () => {
        before(() => {
            responseTransaction.threeDSecureInfo = {
                status: 'ok'
            };
            saveTransactionData(order, paymentInstrument, responseTransaction);
        });
        it('should set payment instrument custom attribute braintree3dSecureStatus as threeDSecureInfo status', () => {
            expect(paymentInstrumentCustom.braintree3dSecureStatus).to.be.equal('ok');
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

describe('saveCustomerCreditCard', () => {
    const createPaymentInstrument = stub();
    const customerPaymentInstrument = {
        setCreditCardHolder: stub(),
        setCreditCardNumber: stub(),
        setCreditCardExpirationMonth: stub(),
        setCreditCardExpirationYear: stub(),
        setCreditCardType: stub(),
        custom: {}
    };
    const saleTransactionResponseData = {
        transaction: {
            creditCard: {
                expirationMonth: '04',
                expirationYear: '24',
                last4: '1111',
                token: 'testToken'
            }
        }
    };
    const paymentInstrument = {
        creditCardType: 'Visa',
        creditCardHolder: 'Test Test'
    };
    before(() => {
        dw.order.PaymentInstrument.METHOD_CREDIT_CARD = 'CREDIT_CARD';
        createPaymentInstrument.returns(customerPaymentInstrument);
        stub(customer, 'getProfile').returns({
            getWallet: () => ({
                createPaymentInstrument
            })
        });
        saveCustomerCreditCard(paymentInstrument, saleTransactionResponseData);
    });


    after(function () {
        customer.getProfile.restore();
    });

    it('should create customers payment instrument with CREDIT_CARD processor', () => {
        assert.calledWith(createPaymentInstrument, 'CREDIT_CARD');
    });
    it('should created payment instrument card holder', () => {
        assert.calledWith(customerPaymentInstrument.setCreditCardHolder, 'Test Test');
    });
    it('should created payment instrument card number', () => {
        let args = customerPaymentInstrument.setCreditCardNumber.getCall(0).args[0];
        expect(args).to.have.string('1111');
    });
    it('should created payment instrument card month', () => {
        assert.calledWith(customerPaymentInstrument.setCreditCardExpirationMonth, 4);
    });
    it('should created payment instrument card year', () => {
        assert.calledWith(customerPaymentInstrument.setCreditCardExpirationYear, 24);
    });
    it('should created payment instrument card type', () => {
        assert.calledWith(customerPaymentInstrument.setCreditCardType, 'Visa');
    });
});

