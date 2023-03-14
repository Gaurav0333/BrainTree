var { expect } = require('chai');
var { processorHelperPath } = require('./path');
const proxyquire = require('proxyquire').noCallThru();
var { stub, assert } = require('sinon');
require('dw-api-mock/demandware-globals');
require('babel-register')({
    plugins: ['babel-plugin-rewire']
});

const prefs = {
    customFields: {},
    isL2L3: false,
    isSettle: false
};
const customFieldsKey = 'testfield:Test_Field';
const customFieldsXml = '<testfield>Test_Field</testfield>';
const items = [{
    id: 'item'
}];
const currencyCode = 'USD';
const getBraintreePaymentInstrument = stub();
const createCustomerId = stub();
const customerHelper = stub();
const isCustomerExistInVault = stub();
const createAddressData = stub();

const processorHelper = proxyquire(processorHelperPath, {
    'dw/svc': {},
    'dw/system': dw.system,
    'dw/order': dw.order,
    'dw/customer': dw.customer,
    'dw/web/Resource': dw.web.Resource,
    'dw/value/Money': dw.value.Money,
    'dw/order/PaymentTransaction': dw.order.PaymentTransaction,
    '~/cartridge/config/braintreePreferences': prefs,
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApi': {},
    '~/cartridge/scripts/braintree/helpers/paymentHelper': {
        getBraintreePaymentInstrument,
        customerHelper,
        createAddressData,
        getOrderLevelDiscountTotal: () => '0.15',
        getLineItems: () => (items),
        getAmountPaid: () => new dw.value.Money(15, currencyCode)
    },
    '~/cartridge/scripts/braintree/helpers/customerHelper': {
        createCustomerId
    },
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls': {
        isCustomerExistInVault
    }
});
describe('processorHelper file', () => {
    describe('createFullName function', () => {
        const createFullName = processorHelper.__get__('createFullName');
        describe('trim, split an input string and assign a value', () => {
            let name;
            it('should return a firstName, lastName, secondName if the name.length === 3', () => {
                name = ' Svitlana Serhiivna  Melashenko ';
                expect(createFullName(name)).to.deep.equal({
                    firstName: 'Svitlana',
                    secondName: 'Serhiivna',
                    lastName: 'Melashenko'
                });
            });
            it('should return a firstName, lastName if the name.length === 2', () => {
                name = ' Svitlana  Melashenko ';
                expect(createFullName(name)).to.deep.equal({
                    firstName: 'Svitlana',
                    secondName: null,
                    lastName: 'Melashenko'
                });
            });
            it('should return firstName if name.length === 1', () => {
                name = 'Svitlana';
                expect(createFullName(name)).to.deep.equal(
                    {
                        firstName: 'Svitlana',
                        secondName: null,
                        lastName: null
                    }
                );
            });
        });
    });

    describe('getCustomFields', () => {
        const order = {};
        const paymentInstrument = {
            getPaymentTransaction: () => ({
                getPaymentProcessor: () => ({
                    ID: 'BRAINTREE_TestProcessor'
                })
            })
        };
        before(() => {
            getBraintreePaymentInstrument.returns(paymentInstrument);
        });

        describe('if NOT exist customFields', () => {
            it('Returns an empty custom fields string', () => {
                expect(processorHelper.getCustomFields(order, paymentInstrument)).to.be.equal('');
            });
        });
        describe('if exist customFields', () => {
            before(function () {
                prefs.customFields = {
                    key: customFieldsKey
                }
            });
            after(() => {
                prefs.customFields = {};
            });
            it('Returns a prepared custom fields string from customFields preference', () => {
                expect(processorHelper.getCustomFields(order, paymentInstrument)).to.be.equal(customFieldsXml);
            });
        });


    });

    describe('getISO3Country', () => {
        before(() => {
            stub(dw.util.Locale, 'getLocale');
            dw.util.Locale.getLocale.withArgs('US').returns({ getISO3Country: () => { return 'USA'; } });
        });
        after(() => {
            dw.util.Locale.getLocale.restore();
        });

        it('return a three-letter abbreviation for this lLocales country, or an empty string', () => {
            expect(processorHelper.getISO3Country('US')).to.be.equal('USA');
        });
    });

    describe('createGuestCustomerData', () => {
        let registeredCustomer;
        let shippingAddressGetPhone;
        let billingAddressGetPhone;
        let profileGetPhoneMobile;
        let profileGetPhoneHome;
        let profileGetPhoneBusiness;
        let order = {
            getCustomer: () => ({
                getProfile: () => ({
                    getFirstName: () => 'Mike',
                    getLastName: () => 'Obama',
                    getEmail: () => 'a@test.com',
                    getPhoneMobile: () => profileGetPhoneMobile,
                    getPhoneHome: () => profileGetPhoneHome,
                    getPhoneBusiness: () => profileGetPhoneBusiness,
                    getCompanyName: () => 'SF',
                    getFax: () => '22222'
                }),
                isRegistered: () => registeredCustomer
            }),
            getBillingAddress: () => ({
                getFirstName: () => 'Mike',
                getLastName: () => 'Obama',
                getPhone: () => billingAddressGetPhone
            }),
            getDefaultShipment: () => ({
                getShippingAddress: () => ({
                    getPhone: () => shippingAddressGetPhone
                })
            }),
            getCustomerEmail: () => 'a@test.com'
        };

        before(() => {
            createCustomerId.returns('123');
        });
        after(() => {
            createCustomerId.reset();
        });

        it('return Customer data for request customer.isRegistered() == false, billingAddress.getPhone() == true', () => {
            registeredCustomer = false;
            billingAddressGetPhone = '+380';
            expect(processorHelper.createGuestCustomerData(order)).to.deep.equal({
                id: null,
                firstName: 'Mike',
                lastName: 'Obama',
                email: 'a@test.com',
                phone: '+380',
                company: '',
                fax: ''
            });
        });

        it('return Customer data for request customer.isRegistered() == false, shippingAddress.getPhone() == true ', () => {
            registeredCustomer = false;
            billingAddressGetPhone = null;
            shippingAddressGetPhone = '+381';
            expect(processorHelper.createGuestCustomerData(order)).to.deep.equal({
                id: null,
                firstName: 'Mike',
                lastName: 'Obama',
                email: 'a@test.com',
                phone: '+381',
                company: '',
                fax: ''
            });
        });
    });

    describe('isCountryCodesUpperCase function', () => {
        before(() => {
            session.forms = {
                billing: {
                    billingAddress: {
                        addressFields: {
                            country: {
                                getOptions: () => {
                                    return {
                                        option1: {
                                            value: 'uk '
                                        },
                                        option2: {
                                            value: 'usa'
                                        }
                                    };
                                }
                            }
                        }
                    }
                }
            };
        });
        after(() => {
            session.forms = {};
        });
        it('should return boolean value false', () => {
            expect(processorHelper.isCountryCodesUpperCase()).equal(false);
        });
    });

    describe('isCountryCodesUpperCase function', () => {
        before(() => {
            session.forms = {
                billing: {
                    billingAddress: {
                        addressFields: {
                            country: {
                                getOptions: () => {
                                    return {
                                        option1: {
                                            value: 'UK'
                                        }
                                    };
                                }
                            }
                        }
                    }
                }
            };
        });
        after(() => {
            session.forms = {};
        });

        it('should return boolean value true', () => {
            expect(processorHelper.isCountryCodesUpperCase()).equal(true);
        });

        describe('billingForm == null', () => {
            before(() => {
                session.forms = {
                    billing: null
                };
            });
            it('should return boolean value true', () => {
                expect(processorHelper.isCountryCodesUpperCase()).equal(true);
            });
        });
    });

    describe('updateBillingAddress', () => {
        const basket = {
            getBillingAddress: stub(),
            createBillingAddress: stub(),
            setCustomerEmail: stub()
        };
        const billingAddress = {
            setCountryCode: stub(),
            setCity: stub(),
            setAddress1: stub(),
            setAddress2: stub(),
            setPostalCode: stub(),
            setStateCode: stub(),
            setPhone: stub(),
            setFirstName: stub(),
            setLastName: stub()
        };
        const isCountryCodesUpperCase = stub();
        describe('if customer has saved payment method', () => {
            before(() => {
                isCountryCodesUpperCase.returns(false);
                basket.getBillingAddress.returns(billingAddress);
                const newBillingAddress = {
                    countryCodeAlpha2: 'CO',
                    locality: 'testLocality',
                    streetAddress: 'testStreetAddress',
                    extendedAddress: 'testExtendedAddress',
                    postalCode: 'testPostalCode',
                    region: 'testRegion',
                    phone: 'testPhone',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'newEmail'
                };
                processorHelper.updateBillingAddress(newBillingAddress, basket);
            });

            it('should set country code into billing address', () => {
                assert.calledWith(billingAddress.setCountryCode, 'CO');
            });
            it('should set city into billing address', () => {
                assert.calledWith(billingAddress.setCity, 'testLocality');
            });
            it('should set address 1 into billing address', () => {
                assert.calledWith(billingAddress.setAddress1, 'testStreetAddress');
            });
            it('should set address2 into billing address', () => {
                assert.calledWith(billingAddress.setAddress2, 'testExtendedAddress');
            });
            it('should set postal code into shipping address', () => {
                assert.calledWith(billingAddress.setPostalCode, 'testPostalCode');
            });
            it('should set state code into billing address', () => {
                assert.calledWith(billingAddress.setStateCode, 'testRegion');
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
            it('should set customers email into basket', () => {
                assert.calledWith(basket.setCustomerEmail, 'newEmail');
            });
        });
    });

    describe('isTokenExists Return boolean Token Exists value', () => {
        let isCustomerExistInVault;
        let paymentInstrument = {
            creditCardToken: 'token',
            custom: {
                braintreePaymentMethodNonce: 'nonce',
                braintreeIs3dSecureRequired: false
            }
        };

        describe('isTokenAllowed', () => {
            it('isCustomerExistInVault === false', () => {
                isCustomerExistInVault = false;
                expect(processorHelper.isTokenExists(isCustomerExistInVault, paymentInstrument)).to.be.false;
            });
            it('isCustomerExistInVault === true, braintreePaymentMethodToken === false', () => {
                isCustomerExistInVault = true;
                paymentInstrument.creditCardToken = null;
                expect(processorHelper.isTokenExists(isCustomerExistInVault, paymentInstrument)).to.be.false;
            });
            it('isCustomerExistInVault === true, braintreePaymentMethodToken === true, !braintreeIs3dSecureRequired', () => {
                isCustomerExistInVault = true;
                expect(processorHelper.isTokenExists(isCustomerExistInVault, paymentInstrument)).to.be.false;
            });
        });

        describe('return isTokenAllowed , braintreePaymentMethodNonce == null', () => {
            it('isCustomerExistInVault === false', () => {
                isCustomerExistInVault = false;
                expect(processorHelper.isTokenExists(isCustomerExistInVault, paymentInstrument)).to.be.false;
            });
        });



    });

    describe('saveGeneralTransactionData Save General Transaction Data', () => {
        let order = {
            custom: {
                isBraintree: true,
                braintreePaymentStatus: true
            },
            getCurrencyCode: () => currencyCode
        };
        let responseTransaction = {
            type: 'sale',
            status: 'authorized',
            amount: 100,
            id: '111test'
        };

        const setTransactionID = stub();
        const setAmount = stub();
        let setType;
        const paymentInstrument = {
            custom: {
                braintreePaymentMethodNonce: 'testNonce'
            },
            getPaymentTransaction: () => ({
                setTransactionID,
                setAmount,
                setType
            })
        };

        describe('paymentTransaction.setType PT.TYPE_AUTH', () => {
            it('should use braintreePaymentMethodNonce as paymentMethodNonce', () => {
                before(() => {
                    setType = stub(processorHelper, 'saveGeneralTransactionData').withArgs('PT.TYPE_AUTH', 'AUTH');
                });
                after(() => {
                    setType = null;
                })
            });
        });

        describe('paymentTransaction.setType PT.TYPE_CAPTURE', () => {
            responseTransaction.status = 'settling'
            it('should use braintreePaymentMethodNonce as paymentMethodNonce', () => {
                before(() => {
                    setType = stub(processorHelper, 'saveGeneralTransactionData').withArgs('PT.TYPE_CAPTURE', 'CAPTURE');
                });
                after(() => {
                    setType = null;
                })
            });
        });
    });

    describe('updateShippingAddress', () => {
        const getShippingAddress = stub();
        const createShippingAddress = stub();
        const orderShippingAddress = {
            getShippingAddress,
            createShippingAddress
        };
        const shippingAddress = {
            setCountryCode: stub(),
            setCity: stub(),
            setAddress1: stub(),
            setAddress2: stub(),
            setPostalCode: stub(),
            setStateCode: stub(),
            setPhone: stub(),
            setFirstName: stub(),
            setSecondName: stub(),
            setLastName: stub()
        };
        const createFullName = stub();
        const isCountryCodesUpperCase = stub();
        describe('if full name not required, shipping address exists, country code in lower case', () => {
            before(() => {
                createFullName.withArgs('John Doe').returns('John Doe');
                isCountryCodesUpperCase.returns(false);
                getShippingAddress.returns(shippingAddress);
                const braintreePaypalShippingAddress = {
                    countryCodeAlpha2: 'CA',
                    locality: 'locality',
                    streetAddress: 'streetAddress',
                    extendedAddress: 'extendedAddress',
                    postalCode: 'postalCode',
                    region: 'region',
                    phone: 'phone',
                    firstName: 'firstName',
                    lastName: 'lastName'
                };
                processorHelper.updateShippingAddress(JSON.stringify(braintreePaypalShippingAddress), orderShippingAddress);
            });
            after(() => {
                createFullName.reset();
                isCountryCodesUpperCase.reset();
            });
            it('should set country code into shipping address in lower case', () => {
                assert.calledWith(shippingAddress.setCountryCode, 'CA');
            });
            it('should set city into shipping address', () => {
                assert.calledWith(shippingAddress.setCity, 'locality');
            });
            it('should set address 1 into shipping address', () => {
                assert.calledWith(shippingAddress.setAddress1, 'streetAddress');
            });
            it('should set address2 into shipping address', () => {
                assert.calledWith(shippingAddress.setAddress2, 'extendedAddress');
            });
            it('should set postal code into shipping address', () => {
                assert.calledWith(shippingAddress.setPostalCode, 'postalCode');
            });
            it('should set state code into shipping address', () => {
                assert.calledWith(shippingAddress.setStateCode, 'region');
            });
            it('should set phone into shipping address', () => {
                assert.calledWith(shippingAddress.setPhone, 'phone');
            });
            it('should set first name into shipping address', () => {
                assert.calledWith(shippingAddress.setFirstName, 'firstName');
            });
            it('should set last name into shipping address', () => {
                assert.calledWith(shippingAddress.setLastName, 'lastName');
            });
        });
        describe('if full name required, shipping address not exists, country code in upper case', () => {
            before(() => {
                createFullName.withArgs('John secondName Doe').returns({
                    firstName: 'John',
                    secondName: 'secondName',
                    lastName: 'Doe'
                });
                isCountryCodesUpperCase.returns(true);
                getShippingAddress.returns(null);
                createShippingAddress.returns(shippingAddress);
                const braintreePaypalShippingAddress = {
                    countryCodeAlpha2: 'CO',
                    locality: 'testLocality',
                    streetAddress: 'testStreetAddress',
                    extendedAddress: 'testExtendedAddress',
                    postalCode: 'testPostalCode',
                    region: 'testRegion',
                    phone: 'testPhone',
                    recipientName: 'John secondName Doe'
                };
                processorHelper.updateShippingAddress(JSON.stringify(braintreePaypalShippingAddress), orderShippingAddress);
            });
            after(() => {
                createFullName.reset();
                isCountryCodesUpperCase.reset();

            })
            it('should create shipping address', () => {
                assert.calledOnce(createShippingAddress);
            });
            it('should set country code into shipping address in upper case', () => {
                assert.calledWith(shippingAddress.setCountryCode, 'CO');
            });
            it('should set city into shipping address', () => {
                assert.calledWith(shippingAddress.setCity, 'testLocality');
            });
            it('should set address 1 into shipping address', () => {
                assert.calledWith(shippingAddress.setAddress1, 'testStreetAddress');
            });
            it('should set address2 into shipping address', () => {
                assert.calledWith(shippingAddress.setAddress2, 'testExtendedAddress');
            });
            it('should set postal code into shipping address', () => {
                assert.calledWith(shippingAddress.setPostalCode, 'testPostalCode');
            });
            it('should set state code into shipping address', () => {
                assert.calledWith(shippingAddress.setStateCode, 'testRegion');
            });
            it('should set phone into shipping address', () => {
                assert.calledWith(shippingAddress.setPhone, 'testPhone');
            });
            it('should set first name into shipping address', () => {
                assert.calledWith(shippingAddress.setFirstName, 'John');
            });
            it('should set second name into shipping address', () => {
                assert.calledWith(shippingAddress.setSecondName, 'secondName');
            });
            it('should set last name into shipping address', () => {
                assert.calledWith(shippingAddress.setLastName, 'Doe');
            });
        });
    });

    describe('createBaseSaleTransactionData', () => {
        let authStatus;
        let registeredCustomer;
        let customer;
        const orderShipping = {
            id: 'orderShipping'
        };
        const customerLocale = 'en_US';

        let order = {
            getCustomer: () => ({
                isAuthenticated: () => authStatus,
                isRegistered: () => registeredCustomer
            }),

            getOrderNo: () => '00095503',
            getCurrencyCode: () => currencyCode,
            getTotalTax: () => ({
                toNumberString: () => 12
            }),
            getCustomerLocaleID: () => customerLocale,
            getDefaultShipment: () => ({
                getShippingAddress: () => (orderShipping)
            }),
            getShippingTotalPrice: () => ({
                value: '12'
            })
        };
        let paymentInstrument = {
            creditCardToken: '78616fab-b968-0224-1836-1f1a6df32c32',
            custom: {
                braintreePaymentMethodNonce: 'ba7c3ddd-293f-08e2-12b4-6498edca2d5d'
            }
        };
        processorHelper.__set__('getCustomFields', () => {
            return customFieldsXml;
        });

        describe('if customer is in vault, isTokenExists is true, prefL2L3 is false', () => {
            before(() => {
                customer = {
                    email: 'p.lorentest@epam.com',
                    firstName: 'Paul',
                    lastName: 'Lorens',
                    phone: '408-425-9805'
                }
                authStatus = true;
                createCustomerId.returns('mobilefirst_00085002');
                isCustomerExistInVault.returns(true);
                processorHelper.__set__('isTokenExists', () => {
                    return true;
                });
            });
            after(() => {
                customer = undefined;
                authStatus = undefined;
                createCustomerId.reset();
                isCustomerExistInVault.reset();
                processorHelper.__ResetDependency__('isTokenExists', () => {
                    return undefined;
                });
            });
            it('should set data options', () => {
                let data = {
                    xmlType: 'transaction',
                    requestPath: 'transactions',
                    orderId: '00095503',
                    amount: 15,
                    currencyCode: 'USD',
                    customFields: customFieldsXml,
                    customerId: 'mobilefirst_00085002',
                    paymentMethodToken: '78616fab-b968-0224-1836-1f1a6df32c32',
                    options: {
                        submitForSettlement: false
                    }
                }
                expect(processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs)).to.be.deep.equal(data);
            });
        });

        describe('if customer is NOT in vault, isTokenExists is false, prefL2L3 is false', () => {
            before(() => {
                authStatus = false;
                createCustomerId.returns(null)
                isCustomerExistInVault.returns(false);
                processorHelper.__set__('createGuestCustomerData', () => {
                    return customer;
                });
                processorHelper.__set__('isTokenExists', () => {
                    return false;
                });
            });
            after(() => {
                authStatus = null;
                createCustomerId.reset();
                isCustomerExistInVault.reset();
                processorHelper.__ResetDependency__('createGuestCustomerData', () => {
                    return undefined;
                });
                processorHelper.__ResetDependency__('isTokenExists', () => {
                    return undefined;
                });
            });
            it('should set data options', () => {
                registeredCustomer = false;
                let data = {
                    xmlType: 'transaction',
                    requestPath: 'transactions',
                    orderId: '00095503',
                    amount: 15,
                    currencyCode: 'USD',
                    customFields: customFieldsXml,
                    customerId: null,
                    paymentMethodNonce: 'ba7c3ddd-293f-08e2-12b4-6498edca2d5d',
                    customer: customer,
                    options: {
                        submitForSettlement: false
                    }
                }
                expect(processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs)).to.be.deep.equal(data);
            });
        });

        describe('prefL2L3 is true, paymentMethod is PayPal', () => {
            const orderShipping = {
                id: 'orderShipping'
            };
            let shipping = {
                level_2_3_processing: true,
                countryCodeAlpha2: 'IT',
                countryName: 'Italy',
                firstName: 'Joy',
                lastName: 'Gray',
                locality: 'Sevierville',
                phoneNumber: '408-425-9805',
                postalCode: '37862',
                region: 'TN',
                streetAddress: '473 Wiseman Street'
            };
            before(() => {
                customer = {
                    email: 'p.lorentest@epam.com',
                    firstName: 'Paul',
                    lastName: 'Lorens',
                    phone: '408-425-9805'
                }
                authStatus = true;
                paymentInstrument.paymentMethod = 'PayPal';
                createCustomerId.returns('mobilefirst_00085002');
                isCustomerExistInVault.returns(true);
                createAddressData.withArgs(orderShipping).returns(shipping);
                processorHelper.__set__('isTokenExists', () => {
                    return true;
                });
                processorHelper.__set__('getISO3Country', () => {
                    return 'USA';
                });
                prefs.isL2L3 = true;
            });
            after(() => {
                customer = undefined;
                authStatus = undefined;
                paymentInstrument.paymentMethod = undefined;
                createCustomerId.reset();
                isCustomerExistInVault.reset();
                createAddressData.reset();
                processorHelper.__ResetDependency__('isTokenExists', () => {
                    return undefined;
                });
                processorHelper.__ResetDependency__('getISO3Country', () => {
                    return undefined;
                });
                prefs.isL2L3 = false;
            });
            it('should set data options and L2L3', () => {
                let data = {
                    xmlType: 'transaction',
                    requestPath: 'transactions',
                    orderId: '00095503',
                    amount: 15,
                    currencyCode: 'USD',
                    customFields: customFieldsXml,
                    customerId: 'mobilefirst_00085002',
                    paymentMethodToken: '78616fab-b968-0224-1836-1f1a6df32c32',
                    shipping: {
                        level_2_3_processing: true,
                        countryCodeAlpha2: 'IT',
                        countryName: 'Italy',
                        firstName: 'Joy',
                        lastName: 'Gray',
                        locality: 'Sevierville',
                        phoneNumber: '408-425-9805',
                        postalCode: '37862',
                        region: 'TN',
                        streetAddress: '473 Wiseman Street'
                    },
                    level_2_3_processing: true,
                    taxAmount: 12,
                    l2_only: true,
                    options: {
                        submitForSettlement: false
                    }
                }
                expect(processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs)).to.be.deep.equal(data);
            });
        });

        describe('prefL2L3 is true, paymentMethod is NOT PayPal', () => {
            const orderShipping = {
                id: 'orderShipping'
            };
            let shipping = {
                level_2_3_processing: true,
                countryCodeAlpha2: 'US',
                countryCodeAlpha3: 'USA',
                countryName: 'United States',
                firstName: 'Joy',
                lastName: 'Gray',
                locality: 'Sevierville',
                phoneNumber: '408-425-9805',
                postalCode: '37862',
                region: 'TN',
                streetAddress: '473 Wiseman Street'
            };
            before(() => {
                customer = {
                    email: 'p.lorentest@epam.com',
                    firstName: 'Paul',
                    lastName: 'Lorens',
                    phone: '408-425-9805'
                }
                authStatus = true;
                paymentInstrument.paymentMethod = 'Venmo';
                createCustomerId.returns('mobilefirst_00085002');
                isCustomerExistInVault.returns(true);
                createAddressData.withArgs(orderShipping).returns(shipping);
                processorHelper.__set__('isTokenExists', () => {
                    return true;
                });
                processorHelper.__set__('getISO3Country', () => {
                    return 'USA';
                });
                prefs.isL2L3 = true;
            });
            after(() => {
                customer = undefined;
                authStatus = undefined;
                paymentInstrument.paymentMethod = undefined;
                createCustomerId.reset();
                isCustomerExistInVault.reset();
                createAddressData.reset();
                processorHelper.__ResetDependency__('isTokenExists', () => {
                    return undefined;
                });
                processorHelper.__ResetDependency__('getISO3Country', () => {
                    return undefined;
                });
                prefs.isL2L3 = false;
            });
            it('should set data options and L2L3', () => {
                let data = {
                    xmlType: 'transaction',
                    requestPath: 'transactions',
                    orderId: '00095503',
                    amount: 15,
                    currencyCode: 'USD',
                    customFields: customFieldsXml,
                    customerId: 'mobilefirst_00085002',
                    paymentMethodToken: '78616fab-b968-0224-1836-1f1a6df32c32',
                    shipping: {
                        level_2_3_processing: true,
                        countryCodeAlpha2: 'US',
                        countryCodeAlpha3: 'USA',
                        countryName: 'United States',
                        firstName: 'Joy',
                        lastName: 'Gray',
                        locality: 'Sevierville',
                        phoneNumber: '408-425-9805',
                        postalCode: '37862',
                        region: 'TN',
                        streetAddress: '473 Wiseman Street'
                    },
                    level_2_3_processing: true,
                    taxAmount: 12,
                    shippingAmount: '12',
                    discountAmount: '0.15',
                    lineItems: [
                        {
                            id: 'item'
                        }
                    ],
                    options: {
                        submitForSettlement: false
                    }
                }
                expect(processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs)).to.be.deep.equal(data);
            });
        });

        describe('if isSettle is true', () => {
            let result;
            before(() => {
                prefs.isSettle = true;
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);
            });
            it('should set submitForSettlement option as true', () => {
                expect(result.options.submitForSettlement).to.be.true;
            });
        });
        describe('if isSettle is false', () => {
            let result;
            before(() => {
                prefs.isSettle = false;
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);;
            });
            it('should set submitForSettlement option as false', () => {
                expect(result.options.submitForSettlement).to.be.false;
            });
        });

        describe('if vaultMode is true', () => {
            let result;
            before(() => {
                prefs.vaultMode = true;
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);
            });
            it('should set storeInVault option as true', () => {
                expect(result.options.storeInVaultOnSuccess).to.be.true;
            });
        });
        describe('if vaultMode is false', () => {
            let result;
            before(() => {
                prefs.vaultMode = false;
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);
            });
            it('should not set storeInVaultOnSuccess option', () => {
                expect(result.options.storeInVaultOnSuccess).to.be.undefined;
            });
        });

        describe('if paymentMethod is GooglePay, but googlepayPaymentType is AndroidPayCard', () => {
            let result;
            before(() => {
                prefs.vaultMode = true;
                paymentInstrument.paymentMethod = 'GooglePay';
                session.privacy.googlepayPaymentType = 'AndroidPayCard';
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);
            });
            it('should set storeInVault option as true', () => {
                expect(result.options.storeInVaultOnSuccess).to.be.true;
            });
        });
        describe('if paymentMethod is GooglePay, but googlepayPaymentType is not AndroidPayCard', () => {
            let result;
            before(() => {
                prefs.vaultMode = true;
                paymentInstrument.paymentMethod = 'GooglePay';
                session.privacy.googlepayPaymentType = 'NOT AndroidPayCard';
                result = processorHelper.createBaseSaleTransactionData(order, paymentInstrument, prefs);
            });
            it('should not set storeInVaultOnSuccess option', () => {
                expect(result.options.storeInVaultOnSuccess).to.be.undefined;
            });
        });

    });
});
