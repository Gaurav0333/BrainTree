var { expect } = require('chai');
var { paymentHelperPath } = require('./path');
var { stub, assert } = require('sinon');
require('dw-api-mock/demandware-globals');

const deleteBillingAddress = stub();
const getCustomerPaymentInstruments = stub();

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
const service = {
    configuration: {
        credential: {
            custom: {
                BRAINTREE_Client_Id: 'g12345D'
            }
        }
    }
}

const paymentHelper = require('proxyquire').noCallThru()(paymentHelperPath, {
    'dw/svc': {},
    'dw/system': dw.system,
    'dw/value/Money': dw.value.Money,
    'dw/order': dw.order,
    'dw/customer': dw.customer,
    'dw/web/Resource': dw.web.Resource,
    '~/cartridge/config/braintreePreferences': prefs,
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApi': {},
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls': {
        deleteBillingAddress
    },
    '~/cartridge/scripts/braintree/helpers/customerHelper': {
        getCustomerPaymentInstruments
    },
    'dw/svc/LocalServiceRegistry': {
        createService: () => { return service; }
    }
});

describe('paymentHelper file', () => {
    describe('getLogger check error mode', () => {
        before(() => {
            stub(dw.system.Logger, 'getLogger');
            stub(dw.system.Logger, 'error');
            stub(dw.system.Logger, 'info');
            stub(dw.system.Logger, 'warn');
            dw.system.Logger.getLogger.withArgs('Braintree', 'Braintree_General').returns(dw.system.Logger);
        });

        after(() => {
            dw.system.Logger.getLogger.restore();
            dw.system.Logger.error.restore();
            dw.system.Logger.info.restore();
            dw.system.Logger.warn.restore();
        });

        afterEach(() => {
            dw.system.Logger.error.reset();
            dw.system.Logger.info.reset();
            dw.system.Logger.warn.reset();
        });

        describe('if prefs.loggingMode = "none"', () => {
            before(() => {
                prefs.loggingMode = 'none';
            });
            it('should not log error', () => {
                paymentHelper.getLogger().error('test');
                assert.notCalled(dw.system.Logger.error);
            });
            it('should not log info', () => {
                paymentHelper.getLogger().warn('test');
                assert.notCalled(dw.system.Logger.warn);
            });
            it('should not log warn', () => {
                paymentHelper.getLogger().info('test');
                assert.notCalled(dw.system.Logger.info);
            });
        });

        describe('if prefs.loggingMode = "none"', () => {
            before(() => {
                prefs.loggingMode = 'errors';
            });
            it('should log error', () => {
                paymentHelper.getLogger().error('test');
                assert.calledOnce(dw.system.Logger.error);
            });
            it('should not log info', () => {
                paymentHelper.getLogger().warn('test');
                assert.notCalled(dw.system.Logger.warn);
            });
            it('should not log warn', () => {
                paymentHelper.getLogger().info('test');
                assert.notCalled(dw.system.Logger.info);
            });
        });

        describe('if prefs.loggingMode = "none"', () => {
            before(() => {
                prefs.loggingMode = 'all';
            });
            it('should log error', () => {
                paymentHelper.getLogger().error('test');
                assert.calledOnce(dw.system.Logger.error);
            });
            it('should log info', () => {
                paymentHelper.getLogger().warn('test');
                assert.calledOnce(dw.system.Logger.warn);
            });
            it('should not warn', () => {
                paymentHelper.getLogger().info('test');
                assert.calledOnce(dw.system.Logger.info);
            });
        });
    });

    describe('createErrorMessage', () => {
        const error = stub();
        before(() => {
            stub(paymentHelper, 'getLogger').returns({
                error
            });
        });

        after(() => {
            paymentHelper.getLogger.restore();
        });

        describe('if general error occurs', () => {
            const err = {
                'errors': {
                    'transaction': {
                        'errors': [
                            {
                                'code': '81502',
                                'attribute': 'amount',
                                'message': 'Amount is required.'
                            }
                        ]
                    }
                },
                'message': 'Amount is required.'
            };
            let message;
            before(() => {
                message = paymentHelper.createErrorMessage(err);
            });

            after(() => {
                error.reset();
            });

            it('should return error', () => {
                expect(message).to.be.equal('Amount is required.\n');
            });

            it('should log error', () => {
                assert.calledOnce(error);
            });
        });
        describe('if payment error occurs', () => {
            const err = {
                'status': 'processor_declined',
                'processorResponseCode': '2000',
                'processorResponseText': 'Do Not Honor',
                'processorResponseType': 'soft_declined',
                'message': 'Do Not Honor'
            };
            let message;
            before(() => {
                message = paymentHelper.createErrorMessage(err);
            });

            after(() => {
                error.reset();
            });

            it('should return error', () => {
                expect(message).to.be.equal('Do Not Honor\n');
            });

            it('should log error', () => {
                assert.calledOnce(error);
            });
        });
    });

    describe('createAddressData', () => {
        const address = {
            getCompanyName: () => 'company',
            getCountryCode: () => ({
                getValue: () => 'USA',
                getDisplayValue: () => 'United States'
            }),
            getFirstName: () => 'firstName',
            getLastName: () => 'lastName',
            getPostalCode: () => 'locality',
            getCity: () => 'city',
            getStateCode: () => 'region',
            getAddress1: () => 'streetAddress1',
            getAddress2: () => 'getAddress2',
            getPhone: () => 'phone'
        };
        it('return object with address details', () => {
            expect(paymentHelper.createAddressData(address)).to.deep.equal(
                {
                    company: 'company',
                    countryCodeAlpha2: 'USA',
                    countryName: 'United States',
                    extendedAddress: 'getAddress2',
                    firstName: 'firstName',
                    lastName: 'lastName',
                    locality: 'city',
                    phoneNumber: 'phone',
                    postalCode: 'locality',
                    region: 'region',
                    streetAddress: 'streetAddress1'
                }
            );
        });
    });

    describe('getBraintreePaymentInstrument iterate over paymentInstrumentList', () => {
        let paymentProcessorId;
        const lineItemContainer = {
            getPaymentInstruments: () => ({
                iterator: () => {
                    return new dw.util.Iterator([{
                        getPaymentTransaction: () => ({
                            getPaymentProcessor: () => ({
                                ID: paymentProcessorId
                            })
                        })
                    }]);
                }
            })
        };

        describe('if paymentProcessorId is BRAINTREE_CREDIT', () => {
            it('return paymentInstrument form the list', () => {
                paymentProcessorId = 'BRAINTREE_CREDIT';
                expect(paymentHelper.getBraintreePaymentInstrument(lineItemContainer)).to.be.a('object');
            });
        });
        describe('if paymentProcessorId is BRAINTREE_PAYPAL', () => {
            it('return paymentInstrument form the list', () => {
                paymentProcessorId = 'BRAINTREE_PAYPAL';
                expect(paymentHelper.getBraintreePaymentInstrument(lineItemContainer)).to.be.a('object');
            });
        });
        describe('if paymentProcessorId is BRAINTREE_PAYPAL', () => {
            it('return paymentInstrument form the list', () => {
                paymentProcessorId = 'BRAINTREE_APPLEPAY';
                expect(paymentHelper.getBraintreePaymentInstrument(lineItemContainer)).to.be.a('object');
            });
        });
        describe('if paymentProcessorId is something else', () => {
            it('return paymentInstrument form the list', () => {
                paymentProcessorId = 'MASTERPASS';
                expect(paymentHelper.getBraintreePaymentInstrument(lineItemContainer)).to.be.null;
            });
        });
    });

    describe('addDefaultShipping', () => {
        let basket = {
            getDefaultShipment: () => ({
                shippingMethod: '',
                setShippingMethod: stub()
            })
        };

        before(() => {
            stub(dw.order.ShippingMgr, 'getDefaultShippingMethod');
            stub(dw.order.ShippingMgr, 'applyShippingCost');
            stub(dw.system.HookMgr, 'callHook');
        });
        after(() => {
            dw.order.ShippingMgr.getDefaultShippingMethod.restore();
            dw.order.ShippingMgr.applyShippingCost.restore();
            dw.system.HookMgr.callHook.restore();
        });

        it('Apply default shipping method for current cart', () => {
            paymentHelper.addDefaultShipping(basket);
            assert.calledWith(dw.system.HookMgr.callHook, 'dw.order.calculate', 'calculate', basket);
        });
    });

    describe('getNonGiftCertificateAmount', () => {
        let Decimal = function (value) {
            this.value = value;
        };
        Decimal.prototype.subtract = function (money) {
            return new Decimal(this.value - money.value);
        };
        Decimal.prototype.value = null;

        let getAmountPaid = new dw.value.Money(20);
        const gcPaymentInstrs = {
            iterator: () => {
                return new dw.util.Iterator([{
                    getPaymentTransaction: () => ({
                        getAmount: () => {
                            return getAmountPaid;
                        }
                    })
                }]);
            }
        };

        let basket = {
            getCurrencyCode: () => {
                return 'Us';
            },
            getGiftCertificatePaymentInstruments: () => {
                return gcPaymentInstrs;
            },
            getTotalGrossPrice: () => {
                return new dw.value.Money(100);
            }
        };

        it('Returns the open amount to be paid.', () => {
            expect(paymentHelper.getNonGiftCertificateAmount(basket).value).to.be.equal(80);
        });
    });

    describe('getOrderLevelDiscountTotal function', () => {
        describe("subtracting the basket's total including the discount from the basket's total excluding the order discount", () => {
            const lineItemContainer1 = {
                getAdjustedMerchandizeTotalPrice: () => {
                    return {
                        subtract: () => {
                            return {
                                getDecimalValue: () => 154.32
                            };
                        }
                    };
                }
            };
            it('should return the order discount amount as a string', () => {
                expect(paymentHelper.getOrderLevelDiscountTotal(lineItemContainer1)).to.be.equal('154.32');
            });
        });
    });

    describe('getLineItems function', () => {
        it('should return object with value details', () => {
            const dataLineItems = {
                toArray: () => ([{
                    getProductName: () => 'product123',
                    getQuantityValue: () => 5,
                    getProratedPrice: () => 11,
                    getPrice: () => ({
                        subtract: () => ({
                            getDecimalValue: () => '17.8'
                        }),
                        toNumberString: () => '124.7'
                    }),
                    getTax: () => ({
                        toNumberString: () => '2.8'
                    }),
                    getProduct: () => ({
                        custom: {
                            unitOfMeasure: 'kg',
                            commodityCode: '12'
                        },
                        getUPC: () => 'UM332',
                        getPriceModel: () => ({
                            getPrice: () => ({
                                toNumberString: () => '123.7'
                            })
                        })
                    })
                }])
            };
            expect(paymentHelper.getLineItems(dataLineItems)).to.deep.equal([
                {
                    name: 'product123',
                    kind: 'debit',
                    quantity: 5,
                    unitAmount: '123.7',
                    unitOfMeasure: 'kg',
                    totalAmount: '124.7',
                    taxAmount: '2.8',
                    discountAmount: '17.8',
                    productCode: 'UM332',
                    commodityCode: '12'
                }
            ]);
        });
    });

    describe('updateData', () => {
        let method;
        let braintreePaymentMethodToken;
        const dataObject = {
            customerId: '5434',
            deleteBillingAddress: { 'address': true },
            billingAddressId: {
                'st': '2348 Rardin Drive',
                'city': 'San Bruno',
                'state': 'CA',
                'zip': '94066'
            },
            token: '222ff'
        };
        let brainTreeCustom = {};

        before(() => {
            stub(dw.customer.CustomerMgr, 'getProfile');
            dw.customer.CustomerMgr.getProfile.withArgs(dataObject.customerId).returns({
                custom: brainTreeCustom
            });
            deleteBillingAddress.returns(() => {
                return {};
            });
        });
        after(() => {
            dw.customer.CustomerMgr.getProfile.restore();
        });

        describe('bindCustomer', () => {
            it('bindCustomer', () => {
                method = 'bindCustomer';
                paymentHelper.updateData(method, dataObject);
                expect(brainTreeCustom.isBraintree).to.be.true;
            });
        });

        describe('removeCustomer', () => {
            it('removeCustomerr', () => {
                method = 'removeCustomer';
                paymentHelper.updateData(method, dataObject);
                expect(brainTreeCustom.isBraintree).to.be.false;
            });
        });

        describe('updatePaymentMethod', () => {
            it('updatePaymentMethod', () => {
                method = 'updatePaymentMethod';
                paymentHelper.updateData(method, dataObject);
                assert.calledOnce(deleteBillingAddress);
            });
        });

        describe('deletePaymentMethod removed', () => {
            braintreePaymentMethodToken = '222ff';
            let removePaymentInstrument = stub();
            let paymentIn = {
                creditCardToken: braintreePaymentMethodToken
            };
            const customerPaymentInstruments = {
                iterator: () => {
                    return new dw.util.Iterator([paymentIn]);
                }
            };
            before(() => {
                getCustomerPaymentInstruments.returns(customerPaymentInstruments);
                dw.customer.CustomerMgr.getProfile.withArgs(dataObject.customerId).returns({
                    getWallet: () => {
                        return {
                            removePaymentInstrument
                        };
                    }
                });
            });

            it('deletePaymentMethod', function () {
                method = 'deletePaymentMethod';
                paymentHelper.updateData(method, dataObject);
                assert.calledWith(removePaymentInstrument, paymentIn);
            });
        });
        describe('deletePaymentMethod not removed', () => {
            braintreePaymentMethodToken = '2';
            let removePaymentInstrument = stub();
            let paymentIn = {
                creditCardToken: braintreePaymentMethodToken
            };
            const customerPaymentInstruments = {
                iterator: () => {
                    return new dw.util.Iterator([paymentIn]);
                }
            };
            before(() => {
                getCustomerPaymentInstruments.returns(customerPaymentInstruments);
                dw.customer.CustomerMgr.getProfile.withArgs(dataObject.customerId).returns({
                    getWallet: () => {
                        return {
                            removePaymentInstrument
                        };
                    }
                });
            });

            it('deletePaymentMethod not removed', function () {
                method = 'deletePaymentMethod';
                paymentHelper.updateData(method, dataObject);
            });
        });
    });

    describe('isPaypalButtonEnabled', () => {
        let targetPage;
        describe('if prefs.paypalButtonLocation.toLowerCase() == "none"', () => {
            before(() => {
                prefs.paypalButtonLocation = 'none';
            });

            it('displayPages == null', () => {
                expect(paymentHelper.isPaypalButtonEnabled()).to.be.false;
            });
        });

        describe('if prefs.paypalButtonLocation.toLowerCase() != "none"', () => {
            before(() => {
                prefs.paypalButtonLocation = 'cart';
            });

            it('targetPage != null', () => {
                expect(paymentHelper.isPaypalButtonEnabled(targetPage)).to.be.false;
            });
        });

        describe('if prefs.paypalButtonLocation.toLowerCase() !== "none"', () => {
            before(() => {
                prefs.paypalButtonLocation = 'cart';
                targetPage = 'cart';
            });

            it('targetPage != null', () => {
                expect(paymentHelper.isPaypalButtonEnabled(targetPage)).to.be.true;
            });
        });

        describe('if prefs.paypalButtonLocation.toLowerCase() !== "none"', () => {
            before(() => {
                prefs.paypalButtonLocation = 'cart';
                targetPage = 'pdp';
            });

            it('targetPage != null', () => {
                expect(paymentHelper.isPaypalButtonEnabled(targetPage)).to.be.false;
            });
        });
    });

    describe('calculateAppliedGiftCertificatesAmount Calculate amount of gift certificates in the order', () => {
        const amount = 123;
        const order = {
            getGiftCertificatePaymentInstruments: () => ({
                iterator: () => {
                    return new dw.util.Iterator([{
                        getPaymentTransaction: () => ({
                            getAmount: () => (amount)
                        })
                    }]);
                }
            }),
            getCurrencyCode: stub()
        };

        describe('Calculate amount', () => {
            it('return amount', () => {
                expect(paymentHelper.calculateAppliedGiftCertificatesAmount(order)).to.be.a('object');
            });
        });
    });

    describe('updateOrderBillingAddress', () => {
        let order = {
            getBillingAddress: stub(),
            createBillingAddress: stub(),
            setCustomerEmail: stub()
        };
        const billingAddress = {
            setFirstName: stub(),
            setLastName: stub(),
            setCountryCode: stub(),
            setPhone: stub()
        };
        before(() => {
            order.getBillingAddress.returns(billingAddress);
            const newBillingAddress = {
                countryCode: 'CO',
                phone: 'testPhone',
                firstName: 'John',
                lastName: 'Doe',
                email: 'newEmail'
            };
            paymentHelper.updateOrderBillingAddress(order, newBillingAddress);
        });
        it('should set country code into billing address', () => {
            assert.calledWith(billingAddress.setCountryCode, 'CO');
        });
        it('should set phone into billing address', () => {
            assert.calledWith(billingAddress.setPhone, 'testPhone');
        });
        it('should set first name into billing address', () => {
            assert.calledWith(billingAddress.setFirstName, 'John');
        });
        it('should set last name into billing address', () => {
            assert.calledWith(billingAddress.setLastName, 'Doe');
        });
        it('should set customers email to order', () => {
            assert.calledWith(order.setCustomerEmail, 'newEmail');
        });
    });

    describe('getActiveLocalPaymentMethod', () => {
        let paymentProcessorId;
        const paymentMethod = 'p24';
        const order = {
            getPaymentInstruments: () => ({
                iterator: () => {
                    return new dw.util.Iterator([{
                        getPaymentTransaction: () => ({
                            getPaymentProcessor: () => ({
                                ID: paymentProcessorId
                            })
                        }),
                        getPaymentMethod: () => paymentMethod
                    }]);
                }
            })
        };

        describe('If paymentProcessorId === BRAINTREE_LOCAL', () => {
            before(() => {
                paymentProcessorId = 'BRAINTREE_LOCAL';
            });
            it('should return the payment method name', () => {
                expect(paymentHelper.getActiveLocalPaymentMethod(order)).to.be.equal('p24');
            });
        });

        describe('If paymentProcessorId is not braintree local', () => {
            before(() => {
                paymentProcessorId = 'BRAINTREE_CREDIT';
            });
            it('should return null', () => {
                expect(paymentHelper.getActiveLocalPaymentMethod(order)).to.be.null;
            });
        });
    });

    describe('getActivePaymentMethods', () => {
        let activePaymentMethods = [
            {
                active: true,
                ID: 'ApplePay',
                paymentProcessor: {
                    ID: 'BRAINTREE_APPLEPAY'
                }
            },
            {
                active: true,
                ID: 'p24',
                paymentProcessor: {
                    ID: 'BRAINTREE_LOCAL'
                }
            }
        ];
        before(() => {
            Array.filter = function (a, b) {
                return Array.prototype.filter.call(a, b);
            };
            Array.forEach = function (a, b) {
                return Array.prototype.forEach.call(a, b);
            };
            stub(dw.order.PaymentMgr, 'getActivePaymentMethods');
            dw.order.PaymentMgr.getActivePaymentMethods.returns(activePaymentMethods);
        })

        describe('if payment methods braintree_applepay and braintree_local are active', () => {
            let paymentMethods = {
                BRAINTREE_APPLEPAY: {
                    isActive: true,
                    paymentMethodId: 'ApplePay'
                },
                BRAINTREE_CREDIT: {},
                BRAINTREE_PAYPAL: {},
                BRAINTREE_VENMO: {},
                BRAINTREE_LOCAL: {
                    isActive: true,
                    paymentMethodIds: ['p24']
                },
                BRAINTREE_GOOGLEPAY: {}
            };
            it('should return object with active payment methods id and active status', () => {
                expect(paymentHelper.getActivePaymentMethods()).to.deep.equal(paymentMethods);
            });
        });
    });

    describe('getApplicableLocalPaymentMethods', () => {
        let parameters = {
            applicablePaymentMethods: [
                { ID: 'ApplePay', name: 'ApplePay' },
                { ID: 'p24', name: 'p24' }
            ],
            paymentMethodIds: ['p24']
        };
        let lpmPaymentOptions = ['p24'];

        it('should return object with applicable local payment methods', () => {
            expect(paymentHelper.getApplicableLocalPaymentMethods(parameters)).to.deep.equal(lpmPaymentOptions);
        });
    });
});