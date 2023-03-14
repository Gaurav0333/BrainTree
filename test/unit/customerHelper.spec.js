var { expect } = require('chai');
var { customerHelperPath } = require('./path');
var { stub, assert } = require('sinon');
require('dw-api-mock/demandware-globals');

const prefs = {
    paymentMethods: {
        BRAINTREE_PAYPAL: {
            paymentMethodId: 'BRAINTREE_PAYPAL'
        },
        BRAINTREE_CREDIT: {
            paymentMethodId: 'BRAINTREE_CREDIT'
        },
        BRAINTREE_APPLEPAY: {
            paymentMethodId: 'BRAINTREE_APPLEPAY'
        },
        BRAINTREE_VENMO: {
            paymentMethodId: 'BRAINTREE_VENMO'
        }
    }
};

const customerHelper = require('proxyquire').noCallThru()(customerHelperPath, {
    'dw/svc': {},
    'dw/system/Transaction': dw.system.Transaction,
    'dw/system': dw.system,
    'dw/order': dw.order,
    'dw/customer': dw.customer,
    '~/cartridge/config/braintreePreferences': prefs
});

describe('customerHelper file', () => {
    describe('getCustomerPaymentInstruments', () => {
        const getPaymentInstruments = stub();
        before(() => {
            stub(customer, 'getProfile');
            customer.getProfile.returns({
                getWallet: () => {
                    return {
                        getPaymentInstruments
                    };
                }
            });

            stub(dw.customer.CustomerMgr, 'getProfile');
            dw.customer.CustomerMgr.getProfile.withArgs(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId).returns({
                getWallet: () => {
                    return {
                        getPaymentInstruments
                    };
                }
            });
        });
        after(() => {
            dw.customer.CustomerMgr.getProfile.restore();
            customer.getProfile.restore();
        });

        describe('Payment method from customers payment methods list customerId == false', () => {
            before(() => {
                customer.authenticated = true;
            });

            it('customer.authenticated == true', () => {
                customerHelper.getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
                assert.calledWith(getPaymentInstruments, prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
            });
        });

        describe('Returns null', () => {
            before(() => {
                customer.authenticated = undefined;
            });

            it('payment instrument == null', () => {
                expect(customerHelper.getDefaultCustomerPaypalPaymentInstrument()).to.be.null;
            });
        });
    });

    describe('getCustomerPaymentInstrument', () => {
        let uuid = '11111';
        let paymentInstrument = {
            UUID: uuid
        };
        let iter = () => {
            return new dw.util.Iterator([paymentInstrument]);
        };
        let getPaymentInstruments = () => ({
            size: stub(),
            iterator: iter
        });

        describe('Returns false', () => {
            before(() => {
                customer.authenticated = false;
            });
            after(() => {
                customer.authenticated = undefined;
            });

            it('!customer.authenticated', () => {
                uuid = '11111';
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.be.false;
            });
        });

        describe('cutomet payment indstrument', () => {
            let paymentInstruments = null;
            before(() => {
                customer.authenticated = true;
                stub(customer, 'getProfile');
                customer.getProfile.returns({
                    getWallet: () => {
                        return {
                            getPaymentInstruments: () => paymentInstruments
                        };
                    }
                });
            });
            after(() => {
                customer.authenticated = undefined;
                customer.getProfile.restore();
            });

            it('uuid === null', () => {
                uuid = '55555';
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.be.false;
            });
            it('customerPaymentInstruments === null', () => {
                uuid = '11111';
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.be.false;
            });
            it('customerPaymentInstruments.size() < 1', () => {
                uuid = '11111';
                paymentInstruments = {};
                paymentInstruments.size = () => 0;
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.be.false;
            });
        });

        describe('cutomet payment indstrument', () => {
            before(() => {
                customer.authenticated = true;
                stub(customer, 'getProfile');
                customer.getProfile.returns({
                    getWallet: () => {
                        return {
                            getPaymentInstruments: getPaymentInstruments
                        };
                    }
                });
            });
            after(() => {
                customer.authenticated = undefined;
                customer.getProfile.restore();
            });

            it('return instrument', () => {
                uuid = '11111';
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.deep.equal(paymentInstrument);
            });
        });

        describe('return false', () => {
            before(() => {
                customer.authenticated = true;
                stub(customer, 'getProfile');
                customer.getProfile.returns({
                    getWallet: () => {
                        return {
                            getPaymentInstruments: getPaymentInstruments
                        };
                    }
                });
            });
            after(() => {
                customer.authenticated = undefined;
                customer.getProfile.restore();
            });

            it('return instrument', () => {
                uuid = '55555';
                expect(customerHelper.getCustomerPaymentInstrument(uuid)).to.be.false;
            });
        });
    });

    describe('getDefaultCustomerPaypalPaymentInstrument', () => {
        const paymentInstrument = {
            custom: {
                braintreeDefaultCard: true
            }
        };
        const customerId = '11111';
        const instruments = [paymentInstrument];
        instruments.iterator = () => {
            return new dw.util.Iterator([paymentInstrument]);
        };

        describe('Returns the payment instruments', () => {
            it('customerPaymentInstruments != null', () => {
                expect(customerHelper.getDefaultCustomerPaypalPaymentInstrument(customerId)).to.deep.equal(paymentInstrument);
            });
        });

        describe('Returns the payment instruments', () => {
            it('customerPaymentInstruments != null but no braintreeDefaultCard', () => {
                paymentInstrument.custom.braintreeDefaultCard = false;
                expect(customerHelper.getDefaultCustomerPaypalPaymentInstrument(customerId)).to.deep.equal(paymentInstrument);
            });
        });

        describe('Returns null', () => {
            before(() => {
                customerHelper.getCustomerPaymentInstruments.returns(null);
            });
            it('payment instrument == null', () => {
                expect(customerHelper.getDefaultCustomerPaypalPaymentInstrument(customerId)).to.be.null;
            });
        });

        before(() => {
            stub(customerHelper, 'getCustomerPaymentInstruments').returns(
                instruments
            );
        });
        after(() => {
            customerHelper.getCustomerPaymentInstruments.restore();
        });
    });

    describe('getPaypalCustomerPaymentInstrumentByEmail', () => {
        const email = 'a@a.com';
        const braintreePaypalAccountEmail = email;
        const paymentInstrument = {
            custom: {
                braintreePaypalAccountEmail
            }
        };

        const customerPaymentInstruments = {
            iterator: () => {
                return new dw.util.Iterator([paymentInstrument]);
            }
        };

        describe('Returns the payment instruments', () => {
            it('customerPaymentInstruments != null', () => {
                expect(customerHelper.getPaypalCustomerPaymentInstrumentByEmail(email)).to.deep.equal(paymentInstrument);
            });
        });

        describe('Returns null', () => {
            before(() => {
                customerHelper.getCustomerPaymentInstruments.returns(
                    null
                );
            });
            it('customerPaymentInstruments == null', () => {
                expect(customerHelper.getPaypalCustomerPaymentInstrumentByEmail(email)).to.be.null;
            });
        });

        before(() => {
            stub(customerHelper, 'getCustomerPaymentInstruments').returns(
                customerPaymentInstruments
            );
        });
        after(() => {
            customerHelper.getCustomerPaymentInstruments.restore();
        });
    });

    describe('createCustomerId function', () => {
        let siteName = 'SiteGenesis';
        describe('if customer was registered', () => {
            before(() => {
                stub(dw.system.Site, 'getCurrent').returns({
                    getID: () => siteName
                });
            });
            after(() => {
                dw.system.Site.getCurrent.restore();
            });

            afterEach(function () {
                session.privacy.customerId = null;
            });

            const customr = {
                isRegistered: () => true,
                getProfile: () => {
                    return {
                        getCustomerNo: () => '123'
                    };
                }
            };
            it('should return site name_customer id', () => {
                expect(customerHelper.createCustomerId(customr)).to.be.equal('sitegenesis_123');
            });

            describe('if site name has more than allowed', () => {
                it('should cut string to allowed length', () => {
                    siteName = 'SiteGenesisWithVeryLongTestStringName';
                    expect(customerHelper.createCustomerId(customr)).to.be.equal('sitegenesiswithverylongtests_123');
                });
            });
        });
    });

    describe('saveCustomerCreditCard', () => {
        let createPaymentMethodResponseData;
        let creditType;
        let creditOwner;
        createPaymentMethodResponseData = {
            creditCard: {
                expirationMonth: '02',
                expirationYear: '2022',
                last4: '2356',
                token: '2323fwf23'
            }
        };
        let paymentInstrument = {
            setCreditCardHolder: stub(),
            setCreditCardNumber: stub(),
            setCreditCardExpirationMonth: stub(),
            setCreditCardExpirationYear: stub(),
            setCreditCardType: stub(),
            creditCardToken: ''
        };

        before(() => {
            stub(customer, 'getProfile');
            customer.getProfile.returns({
                getWallet: () => {
                    return {
                        createPaymentInstrument: () => (paymentInstrument)
                    };
                }
            });
        });
        after(() => {
            customer.getProfile.restore();
        });

        it('return object with address details', function () {
            creditType = 'visa';
            creditOwner = 'usBank';
            customerHelper.saveCustomerCreditCard(createPaymentMethodResponseData, creditType, creditOwner);
            expect(customerHelper.saveCustomerCreditCard(createPaymentMethodResponseData, creditType, creditOwner)).to.deep.equal(
                {
                    expirationMonth: '02',
                    expirationYear: '2022',
                    number: Date.now().toString().substr(0, 11) + createPaymentMethodResponseData.creditCard.last4,
                    type: 'visa',
                    owner: 'usBank',
                    paymentMethodToken: '2323fwf23'
                }
            );
        });
        it('expect customerPaymentInstrument setCreditCardHolder', function () {
            assert.calledWith(paymentInstrument.setCreditCardHolder);
        });
        it('expect customerPaymentInstrument setCreditCardNumber', function () {
            assert.calledWith(paymentInstrument.setCreditCardNumber);
        });
        it('expect customerPaymentInstrument setCreditCardExpirationMonth', function () {
            assert.calledWith(paymentInstrument.setCreditCardExpirationMonth);
        });
        it('expect customerPaymentInstrument setCreditCardExpirationYear', function () {
            assert.calledWith(paymentInstrument.setCreditCardExpirationYear);
            assert.calledWith(paymentInstrument.setCreditCardType);
        });
        it('expect customerPaymentInstrument setCreditCardType', function () {
            assert.calledWith(paymentInstrument.setCreditCardType);
        });

        it('return error message', function () {
            paymentInstrument = {};
            creditType = 'visa';
            creditOwner = 'usBank';
            customerHelper.saveCustomerCreditCard(createPaymentMethodResponseData, creditType, creditOwner);
            expect(customerHelper.saveCustomerCreditCard(createPaymentMethodResponseData, creditType, creditOwner)).to.deep.equal(
                {
                    error: 'customerPaymentInstrument.setCreditCardHolder is not a function'
                }
            );
        });
    });

    describe('getVenmoCustomerPaymentInstrumentByUserID', () => {
        const userId = '23523gergs';
        const paymentInstrument = {
            custom: {
                braintreeVenmoUserId: userId
            }
        };

        const customerPaymentInstruments = {
            iterator: () => {
                return new dw.util.Iterator([paymentInstrument]);
            }
        };

        before(() => {
            stub(customerHelper, 'getCustomerPaymentInstruments').returns(
                customerPaymentInstruments
            );
        });
        after(() => {
            customerHelper.getCustomerPaymentInstruments.restore();
        });

        describe('If customerPaymentInstruments exists', () => {
            it('should return the payment instrument', () => {
                expect(customerHelper.getVenmoCustomerPaymentInstrumentByUserID(userId)).to.deep.equal(paymentInstrument);
            });
        });

        describe('If there is no customerPaymentInstruments', () => {
            before(() => {
                customerHelper.getCustomerPaymentInstruments.returns(
                    null
                );
            });
            it('should return null', () => {
                expect(customerHelper.getVenmoCustomerPaymentInstrumentByUserID(userId)).to.be.null;
            });
        });
    });
});