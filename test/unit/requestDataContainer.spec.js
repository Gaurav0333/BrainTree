const { expect } = require('chai');
const { requestDataContainerPath } = require('./path');
const { stub } = require('sinon');

let prefs = {
    isSettle: true
};

const customerHelper = {
    createCustomerId: stub()
};

const paymentHelper = {
    createAddressData: stub()
};

const file = require('proxyquire').noCallThru()(requestDataContainerPath, {
    '~/cartridge/config/braintreePreferences': () => prefs,
    '~/cartridge/scripts/braintree/helpers/customerHelper': customerHelper,
    '~/cartridge/scripts/braintree/helpers/paymentHelper': paymentHelper,
    'dw.order.OrderAddress': {}
});

describe('requestDataContainer', () => {
    let dataObj = {};
    beforeEach(() => {
        customerHelper.createCustomerId.reset();
        paymentHelper.createAddressData.reset();
    });

    it("should throw an error if data isn't provided", () => {
        expect(file.bind(null, null, dataObj)).to.throw('No data provided for call');
    });
    it('case : createCustomer if paymentMethodNonce is true', () => {
        dataObj = {
            customerId: '12we',
            firstName: 'Anna',
            lastName: 'Smith',
            email: 'anna_smith@mail.com',
            company: 'WebBlue',
            phone: '+123456789012',
            fax: '12345',
            website: 'www.website.com',
            paymentMethodNonce: true,
            paypalPayeeEmail: 'Kristine Walker',
            creditCard: {
                cardholderName: 'Anna Smith',
                makeDefault: true,
                verifyCard: true,
                token: '12er'

            },
            billingAddress: new dw.order.OrderAddress()

        };
        let billingAddress = {
            id: '1234'
        };
        paymentHelper.createAddressData.returns(billingAddress);
        expect(file('createCustomer', dataObj)).to.deep.equal({
            xmlType: 'customer_create',
            requestPath: 'customers',
            customerId: dataObj.customerId,
            firstName: dataObj.firstName,
            lastName: dataObj.lastName,
            email: dataObj.email,
            company: dataObj.company,
            phone: dataObj.phone,
            fax: dataObj.fax,
            website: dataObj.website,
            paymentMethodNonce: dataObj.paymentMethodNonce,
            paypalPayeeEmail: dataObj.paypalPayeeEmail,
            creditCard: {
                cardholderName: dataObj.cardholderName,
                billingAddress: billingAddress,
                makeDefault: dataObj.makeDefault,
                verifyCard: dataObj.verifyCard,
                token: dataObj.paymentMethodToken
            }
        });
    });
    it('case : createCustomer if paymentMethodNonce is false', () => {
        dataObj = {
            customerId: '12we',
            firstName: 'Anna',
            lastName: 'Smith',
            email: 'anna_smith@mail.com',
            company: 'WebBlue',
            phone: '+123456789012',
            fax: '12345',
            website: 'www.website.com',
            paymentMethodNonce: false,
            paypalPayeeEmail: 'Kristine Walker'
        };
        expect(file('createCustomer', dataObj)).to.deep.equal({
            xmlType: 'customer_create',
            requestPath: 'customers',
            customerId: dataObj.customerId,
            firstName: dataObj.firstName,
            lastName: dataObj.lastName,
            email: dataObj.email,
            company: dataObj.company,
            phone: dataObj.phone,
            fax: dataObj.fax,
            website: dataObj.website,
            paymentMethodNonce: dataObj.paymentMethodNonce,
            paypalPayeeEmail: dataObj.paypalPayeeEmail
        });
    });
    it('case : findPaymentMethod', () => {
        dataObj = {
            token: 'qw'
        };
        expect(file('findPaymentMethod', dataObj)).to.deep.equal({
            xmlType: 'empty',
            requestPath: 'payment_methods/any/' + dataObj.token,
            requestMethod: 'GET'
        });
    });
    it('case : createPaymentMethod', () => {
        dataObj = {
            customerId: 3,
            paymentMethodNonce: true,
            billingAddress: '23 Railway street, Yorksheer, UK',
            billingAddressId: 'uk23',
            makeDefault: false,
            failOnDuplicatePaymentMethod: true,
            verifyCard: true,
            cardHolderName: 'Jimmy Bong'
        };
        expect(file('createPaymentMethod', dataObj)).to.deep.equal({
            xmlType: 'payment_method',
            requestPath: 'payment_methods',
            customerId: dataObj.customerId,
            paymentMethodNonce: dataObj.paymentMethodNonce,
            billingAddress: dataObj.billingAddress,
            billingAddressId: dataObj.billingAddressId,
            makeDefault: dataObj.makeDefault,
            failOnDuplicatePaymentMethod: dataObj.failOnDuplicatePaymentMethod,
            verifyCard: dataObj.verifyCard,
            cardHolderName: dataObj.cardHolderName
        });
    });
    it('case : updatePaymentMethod if data.billingAddress was not added', () => {
        dataObj = {
            token: '0073wO',
            customerId: '12345',
            paymentMethodNonce: true,
            billingAddress: '',
            billingAddressId: '55UK',
            makeDefault: true,
            failOnDuplicatePaymentMethod: false,
            verifyCard: true,
            cardHolderName: 'Nick'
        };
        expect(file('updatePaymentMethod', dataObj)).to.deep.equal({
            xmlType: 'payment_method',
            requestPath: `payment_methods/any/${dataObj.token}`,
            requestMethod: 'PUT',
            customerId: dataObj.customerId,
            paymentMethodNonce: dataObj.paymentMethodNonce,
            billingAddress: dataObj.billingAddress,
            billingAddressId: dataObj.billingAddressId,
            makeDefault: dataObj.makeDefault,
            failOnDuplicatePaymentMethod: dataObj.failOnDuplicatePaymentMethod,
            verifyCard: dataObj.verifyCard,
            cardHolderName: dataObj.cardHolderName
        });
    });
    it('case : updatePaymentMethod if data.billingAddress was added', () => {
        dataObj = {
            token: '0073wO',
            customerId: '12345',
            paymentMethodNonce: true,
            billingAddress: {
                updateExisting: true
            },
            billingAddressId: null,
            bllingAddressUpdateExisting: true,
            makeDefault: true,
            failOnDuplicatePaymentMethod: false,
            verifyCard: true,
            cardHolderName: 'Nick'
        };
        expect(file('updatePaymentMethod', dataObj)).to.deep.equal({
            xmlType: 'payment_method',
            requestPath: `payment_methods/any/${dataObj.token}`,
            requestMethod: 'PUT',
            customerId: dataObj.customerId,
            paymentMethodNonce: dataObj.paymentMethodNonce,
            billingAddress: {
                updateExisting: dataObj.bllingAddressUpdateExisting
            },
            billingAddressId: null,
            makeDefault: dataObj.makeDefault,
            failOnDuplicatePaymentMethod: dataObj.failOnDuplicatePaymentMethod,
            verifyCard: dataObj.verifyCard,
            cardHolderName: dataObj.cardHolderName
        });
    });
    it('case : deletePaymentMethod', () => {
        dataObj = {
            token: 'PayPal'
        };
        expect(file('deletePaymentMethod', dataObj)).to.deep.equal({
            xmlType: 'empty',
            requestPath: `payment_methods/any/${dataObj.token}`,
            requestMethod: 'DELETE'
        });
    });
    it('case : createAddress', () => {
        dataObj = {
            customer: 'Anna Smith',
            address: '23 Railway street, Yorksheer, UK'
        };
        paymentHelper.createAddressData.returns({});
        customerHelper.createCustomerId.returns('12');

        expect(file('createAddress', dataObj)).to.be.deep.equal({
            xmlType: 'address_create',
            requestPath: 'customers/12/addresses'
        });
    });

    it('case : updateAddress', () => {
        dataObj = {
            address: {
                custom: ({
                    braintreeAddressId: 191
                })
            },
            customer: 'Jack'
        };
        paymentHelper.createAddressData.returns({});
        customerHelper.createCustomerId.returns('12');

        expect(file('updateAddress', dataObj)).to.deep.equal({
            xmlType: 'address_create',
            requestPath: `customers/12/addresses/${dataObj.address.custom.braintreeAddressId}`,
            requestMethod: 'PUT'
        });
    });

    it('case : deleteAddress', () => {
        dataObj = {
            customer: 'Anna Smith',
            address: {
                custom: {
                    braintreeAddressId: 'qwe123'
                }
            }
        };
        customerHelper.createCustomerId.returns('12');

        expect(file('deleteAddress', dataObj)).to.deep.equal({
            xmlType: 'empty',
            requestPath: 'customers/12/addresses/' +
            dataObj.address.custom.braintreeAddressId,
            requestMethod: 'DELETE'
        });
    });
    it('case : default', () => {
        expect(file.bind(null, null, dataObj)).to.throw('No request data find for provided API method');
    });
});
