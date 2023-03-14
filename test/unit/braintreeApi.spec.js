var { expect } = require('chai');
var { braintreeApiPath } = require('./path');
var { stub } = require('sinon');

let xmlData = stub();

let prefs = {};

const braintreeApi = require('proxyquire').noCallThru()(braintreeApiPath, {
    './braintreeXmlData': xmlData,
    '~/cartridge/config/braintreePreferences': prefs,
    '~/cartridge/scripts/braintree/braintreeAPI/braintreeApi': {}
});

describe('braintreeApi file', () => {
    describe('createXml function', () => {
        let data;
        let xmlString;
        let resultString;
        beforeEach(() => {
            xmlData.reset();
        });
        before(() => {
            stub(braintreeApi, 'createMerchantAccountXml').returns('<merchant-account-id>ua value</merchant-account-id>');
        });
        after(() => {
            braintreeApi.createMerchantAccountXml.restore();
        });
        describe('case: empty', () => {
            it('should return close tag string', () => {
                data = {};
                expect(braintreeApi.createXml('empty', data)).equal('');
            });
        });
        describe('case: client_token', () => {
            before(() => {
                resultString = '<client_token><version type="integer">2</version><merchant-account-id>ua value</merchant-account-id></client_token>';
                xmlString = '<client_token><version type="integer">2</version><merchant-account-id/></client_token>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should replace <merchant-account-id/>', () => {
                expect(braintreeApi.createXml('client_token', data)).equal(resultString.trim().replace('\n', ''));
            });
        });
        describe('case: customer', () => {
            before(() => {
                xmlString = '<customer><id>test</id><first-name>test</first-name><last-name>test</last-name><company>test</company><phone>test</phone><fax>test</fax><email>test</email></customer>';
                xmlData.returns(xmlString.trim());
            });
            it('should return data', () => {
                expect(braintreeApi.createXml('customer', data)).to.be.equal(xmlString.trim());
            });
        });
        describe('case: billing', () => {
            before(() => {
                xmlString = `<billing><first-name>firstName</first-name><last-name>lastName</last-name>
                <company>company</company><street-address>streetAddress</street-address>
                <extended-address>extendedAddress</extended-address><locality>locality</locality><region>region</region>
                <postal-code>postalCode</postal-code><country-code-alpha2>countryCodeAlpha2</country-code-alpha2>
                <country-name>countryName</country-name></billing>`;
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should return xmlData as a string', () => {
                expect(braintreeApi.createXml('billing', data)).equal(xmlString.trim().replace('\n', ''));
            });
        });
        describe('case billing_address if updateExisting is true', () => {
            before(() => {
                resultString = '<billing-address><options><update-existing type="boolean">true</update-existing></options></billing-address>';
                xmlString = '<billing-address><options/></billing-address>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should replace', () => {
                data = {
                    updateExisting: true
                };
                expect(braintreeApi.createXml('billing_address', data)).to.be.equal(resultString.trim().replace('\n', ''));
            });
        });
        describe('case billing_address if updateExisting is false', () => {
            before(() => {
                xmlString = '<billing-address><options/></billing-address>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should return data', () => {
                data = {
                    updateExisting: false
                };
                expect(braintreeApi.createXml('billing_address', data)).to.be.equal(xmlString.trim().replace('\n', ''));
            });
        });
        describe('case: shipping', () => {
            before(() => {
                resultString = '<shipping><country-code-alpha3>Alpha 3</country-code-alpha3></shipping>';
                xmlString = '<shipping><country-code-alpha/></shipping>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            after(() => {
                xmlData.reset(xmlString);
            });
            it('should check if data.level_2_3_processing is true', () => {
                data = {
                    level_2_3_processing: true,
                    countryCodeAlpha3: 'Alpha 3'
                };
                expect(braintreeApi.createXml('shipping', data)).equal(resultString.trim().replace('\n', ''));
            });
        });
        describe('case: shipping', () => {
            before(() => {
                resultString = '<shipping><country-code-alpha2>Alpha 2</country-code-alpha2></shipping>';
                xmlString = '<shipping><country-code-alpha/></shipping>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should check if data.level_2_3_processing is false', () => {
                data = {
                    level_2_3_processing: false,
                    countryCodeAlpha2: 'Alpha 2'
                };
                expect(braintreeApi.createXml('shipping', data)).equal(resultString.trim().replace('\n', ''));
            });
        });
        describe('case: descriptor', () => {
            before(() => {
                resultString = '<descriptor><name>Nataly</name><phone>+320991853482</phone><url>url/url</url></descriptor>';
                xmlString = '<descriptor><name/><phone/><url/></descriptor>';
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should replace <name/> <phone/> <url/> for real data', () => {
                data = {
                    name: 'Nataly',
                    phone: '+320991853482',
                    url: 'url/url'
                };
                expect(braintreeApi.createXml('descriptor', data)).equal(resultString.trim().replace('\n', ''));
            });
        });
        describe('case: transaction', () => {
            describe('data.descriptor is true', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('descriptor', 'descriptor').returns('<descriptor>test</descriptor>');
                    resultString = '<descriptor>test</descriptor>';
                    xmlString = '<descriptor/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            descriptor: true
                        },
                        descriptor: 'descriptor'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'transaction', data));
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('data.customer is true', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('customer', 'customer').returns('<customer>test</customer>');
                    resultString = '<customer>test</customer>';
                    xmlString = '<customer/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            customer: true
                        },
                        customer: 'customer'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'transaction', data));
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('data.billing is true', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('billing', 'billing').returns('<billing>test</billing>');
                    resultString = '<billing>test</billing>';
                    xmlString = '<billing/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            billing: true
                        },
                        billing: 'billing'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'transaction', data));
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('data.shipping is true', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('shipping', 'shipping').returns('<shipping>test</shipping>');
                    resultString = '<shipping>test</shipping>';
                    xmlString = '<shipping/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            shipping: true
                        },
                        shipping: 'shipping'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'transaction', data));
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('addShippingAddress is true', () => {
                before(() => {
                    resultString = '<transaction><store-shipping-address-in-vault type="boolean">true</store-shipping-address-in-vault></transaction>';
                    xmlString = '<transaction><store-shipping-address-in-vault/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        options: {
                            addShippingAddress: true
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if addBillingAddress', () => {
                before(() => {
                    resultString = '<transaction><options><add-billing-address-to-payment-method type="boolean">true</add-billing-address-to-payment-method></options></transaction>';
                    xmlString = '<transaction><options><add-billing-address-to-payment-method/></options></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('true - should replace <add-billing-address-to-payment-method/>', () => {
                    data = {
                        options: {
                            addBillingAddress: true,
                            currencyCode: 'ua',
                            is3dSecureRequired: true
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
                it('false - should not replace <add-billing-address-to-payment-method/>', () => {
                    data = {
                        options: {
                            addBillingAddress: false,
                            currencyCode: 'ua',
                            is3dSecureRequired: true
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('if data.options.storeInVaultOnSuccess', () => {
                before(() => {
                    resultString = '<transaction><options><store-in-vault-on-success type="boolean">true</store-in-vault-on-success></options></transaction>';
                    xmlString = '<transaction><options><store-in-vault-on-success/></options></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('true - should replace <store-in-vault-on-success/>', () => {
                    data = {
                        options: {
                            storeInVaultOnSuccess: true
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
                it('false - should not replace <store-in-vault-on-success/>', () => {
                    data = {
                        options: {
                            storeInVaultOnSuccess: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('payeeEmail is true', () => {
                before(() => {
                    resultString = '<paypal><payee_email>true</payee_email></paypal>';
                    xmlString = '<paypal/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        options: {
                            payeeEmail: true
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.billingAddressId', () => {
                before(() => {
                    resultString = '<transaction><billing-address-id>123deL</billing-address-id></transaction>';
                    xmlString = '<transaction><billing-address-id/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('true - should replace <billing-address-id/>', () => {
                    data = {
                        billingAddressId: '123deL',
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
                it('false - should not replace <billing-address-id/>', () => {
                    data = {
                        billingAddressId: '',
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('shippingAddressId is true', () => {
                before(() => {
                    resultString = '<shipping-address-id>12</shipping-address-id>';
                    xmlString = '<shipping-address-id/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        shippingAddressId: '12',
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.paymentMethodNonce', () => {
                before(() => {
                    resultString = '<transaction><payment-method-nonce>true</payment-method-nonce></transaction>';
                    xmlString = '<transaction><payment-method-identificator/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('true - should replace <payment-method-identificator/>', () => {
                    data = {
                        paymentMethodNonce: true,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
                it('false - should not replace <payment-method-identificator/>', () => {
                    data = {
                        paymentMethodNonce: false,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('paymentMethodToken is true', () => {
                before(() => {
                    resultString = '<payment-method-token>pp</payment-method-token>';
                    xmlString = '<payment-method-identificator/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        paymentMethodToken: 'pp',
                        options: {
                            addShippingAddress: false
                        }

                    };
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.deviceData', () => {
                before(() => {
                    resultString = '<transaction><device-data>true</device-data></transaction>';
                    xmlString = '<transaction><device-data/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('true - should replace <device-data/>', () => {
                    data = {
                        deviceData: true,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
                it('false - should not replace <device-data/>', () => {
                    data = {
                        deviceData: false,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('customFields is true', () => {
                before(() => {
                    resultString = '<custom-fields>true</custom-fields>';
                    xmlString = '<custom-fields/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        customFields: true,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('level_2_3_processing is true', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml')
                        .withArgs('line-items')
                        .returns('<line-items>test</line-items>');
                });
                after(function () {
                    braintreeApi.createXml.restore();
                });

                describe('if <purchase-order-number/>', () => {
                    before(() => {
                        resultString = '<purchase-order-number/>';
                        xmlString = '<purchase-order-number/>';
                        xmlData.returns(xmlString.trim().replace('\n', ''));
                    });
                    it('should replace', () => {
                        data = {
                            orderId: '12',
                            level_2_3_processing: true,
                            options: {
                                addShippingAddress: false
                            }
                        };
                        expect(originalf('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                    });
                });
                describe('if <tax-amount/>', () => {
                    before(() => {
                        resultString = '<tax-amount>12</tax-amount>';
                        xmlString = '<tax-amount/>';
                        xmlData.returns(xmlString.trim().replace('\n', ''));
                    });
                    it('should replace', () => {
                        data = {
                            taxAmount: '12',
                            level_2_3_processing: true,
                            options: {
                                addShippingAddress: false
                            }
                        };
                        expect(originalf('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                    });
                });
                describe('if <shipping-amount/>', () => {
                    before(() => {
                        resultString = '<shipping-amount>12</shipping-amount>';
                        xmlString = '<shipping-amount/>';
                        xmlData.returns(xmlString.trim().replace('\n', ''));
                    });
                    it('should replace', () => {
                        data = {
                            shippingAmount: '12',
                            level_2_3_processing: true,
                            options: {
                                addShippingAddress: false
                            }
                        };
                        expect(originalf('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                    });
                });
                describe('if <discount-amount/>', () => {
                    before(() => {
                        resultString = '<discount-amount>12</discount-amount>';
                        xmlString = '<discount-amount/>';
                        xmlData.returns(xmlString.trim().replace('\n', ''));
                    });
                    it('should replace', () => {
                        data = {
                            discountAmount: '12',
                            level_2_3_processing: true,
                            options: {
                                addShippingAddress: false
                            }
                        };
                        expect(originalf('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                    });
                });
                describe('if <line-items/>', () => {
                    before(() => {
                        resultString = '<line-items>test</line-items>';
                        xmlString = '<line-items/>';
                        xmlData.returns(xmlString.trim().replace('\n', ''));
                    });
                    it('should replace', () => {
                        data = {
                            level_2_3_processing: true,
                            options: {
                                addShippingAddress: false,
                                lineItems: true
                            },
                            lineItems: 'lineItems'
                        };
                        expect(originalf('transaction', data)).to.be.equal(resultString.trim().replace('\n', ''));
                    });
                });
            });
            describe('if all data values do not exist should change <merchant-account-id/> and <three_d_secure/>', () => {
                before(() => {
                    resultString = '<transaction><merchant-account-id>ua value</merchant-account-id><three_d_secure><required type="boolean">true</required></three_d_secure></transaction>';
                    xmlString = '<transaction><merchant-account-id/><three_d_secure/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('for is3dSecuteRequires equal true - should replace <three_d_secure/>', () => {
                    data = {
                        is3dSecureRequired: true,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if all data values do not exist should change <merchant-account-id/> and <three_d_secure/>', () => {
                before(() => {
                    resultString = '<transaction><merchant-account-id>ua value</merchant-account-id></transaction>';
                    xmlString = '<transaction><merchant-account-id/><three_d_secure/></transaction>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('for is3dSecuteRequires equal false - should replace <three_d_secure/> to empty string', () => {
                    data = {
                        is3dSecureRequired: false,
                        options: {
                            addShippingAddress: false
                        }
                    };
                    expect(braintreeApi.createXml('transaction', data)).equal(resultString.trim().replace('\n', ''));
                });
            });
        });
        describe('case: search_transactions_by_ids', () => {
            it('should return idsStr', () => {
                data = {
                    ids: [12, 13, 14]
                };
                let idsStr = '<item>12</item><item>13</item><item>14</item>';
                let result = `<search><ids type="array">${idsStr}</ids></search>`;
                expect(braintreeApi.createXml('search_transactions_by_ids', data)).equal(result);
            });
        });
        describe('case payment_method', () => {
            describe('if data.billingAddress exists', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('billing_address', 'billingAddress').returns('<billing-address>test</billing-address>');
                    resultString = '<billing-address>test</billing-address>';
                    xmlString = '<billing-address/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            billingAddress: true
                        },
                        billingAddress: 'billingAddress'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'payment_method', data));
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.customerId exists', () => {
                before(() => {
                    resultString = '<customer-id>12</customer-id>';
                    xmlString = '<customer-id/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        customerId: '12'
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.customerId does not exist', () => {
                before(() => {
                    resultString = '';
                    xmlString = '<customer-id/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should return empty string', () => {
                    data = {
                        customerId: null
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.paymentMethodNonce exists', () => {
                before(() => {
                    resultString = '<payment-method-nonce>test</payment-method-nonce>';
                    xmlString = '<payment-method-nonce/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        paymentMethodNonce: 'test'
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.paymentMethodNonce does not exist', () => {
                before(() => {
                    resultString = '';
                    xmlString = '<payment-method-nonce/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should return empty string', () => {
                    data = {
                        paymentMethodNonce: null
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.billingAddressId exists', () => {
                before(() => {
                    resultString = '<billing-address-id>12</billing-address-id>';
                    xmlString = '<billing-address-id/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace', () => {
                    data = {
                        billingAddressId: '12'
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if data.billingAddressId does not exist', () => {
                before(() => {
                    resultString = '';
                    xmlString = '<billing-address-id/>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should return empty string', () => {
                    data = {
                        billingAddressId: null
                    };
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
        });
        describe('case: credit_card', () => {
            describe('credit_card', () => {
                before(() => {
                    xmlString = `<credit-card><billing-address/><cardholder-name>test</cardholder-name>
                    <options><make-default>test</make-default><verify-card>test</verify-card><token>test</token></options></credit-card>`;
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should return xmlData', () => {
                    data = {
                        makeDefault: true,
                        billingAddress: false
                    };
                    expect(braintreeApi.createXml('credit_card', data)).equal(xmlString.trim().replace('\n', ''));
                });
            });
            describe('if data.billingAddress exists', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('billing_address', 'billingAddress').returns('<billing-address>test</billing-address>');
                    resultString = '<payment-method><billing-address>test</billing-address></payment-method>';
                    xmlString = '<payment-method><billing-address/></payment-method>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            billingAddress: true
                        },
                        billingAddress: 'billingAddress'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'payment_method', data));
                    expect(braintreeApi.createXml('payment_method', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
        });
        describe('case: customer_create', () => {
            describe('if paymentMethodNonce is true', () => {
                before(() => {
                    resultString = '<customer><payment-method-nonce>true</payment-method-nonce></customer>';
                    xmlString = '<customer><credit-card/></customer>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });
                it('should replace <credit-card/>', () => {
                    data = {
                        paymentMethodNonce: true
                    };
                    expect(braintreeApi.createXml('customer_create', data)).equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if creditCard exists', () => {
                const originalf = braintreeApi.createXml;
                before(() => {
                    stub(braintreeApi, 'createXml').withArgs('credit_card', 'creditCard').returns('<credit-card>test</credit-card>');
                    resultString = '<payment-method><credit-card>test</credit-card></payment-method>';
                    xmlString = '<payment-method><credit-card/></payment-method>';
                    xmlData.returns(xmlString.trim().replace('\n', ''));
                });

                after(function () {
                    braintreeApi.createXml.restore();
                });

                it('should replace', () => {
                    data = {
                        options: {
                            creditCard: true
                        },
                        creditCard: 'creditCard'
                    };
                    braintreeApi.createXml.returns(originalf.call(null, 'customer_create', data));
                    expect(braintreeApi.createXml('customer_create', data)).to.be.equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if paypalPayeeEmail is true', () => {
                before(() => {
                    resultString = '<customer><paypal><payeeEmail>true</payeeEmail></paypal></customer>';
                    xmlString = '<customer><paypal-payee-email/></customer>';
                    xmlData.returns(resultString.trim().replace('\n', ''));
                });
                it('should replace <paypal-payee-email/>', () => {
                    data = {
                        paypalPayeeEmail: true
                    };
                    expect(braintreeApi.createXml('customer_create', data)).equal(resultString.trim().replace('\n', ''));
                });
            });
            describe('if paypalPayeeEmail is false', () => {
                before(() => {
                    resultString = '<customer></customer>';
                    xmlString = '<customer><paypal-payee-email/></customer>';
                    xmlData.returns(resultString.trim().replace('\n', ''));
                });
                it('should return empty string', () => {
                    data = {
                        paypalPayeeEmail: false
                    };
                    expect(braintreeApi.createXml('customer_create', data)).equal(resultString.trim().replace('\n', ''));
                });
            });
        });

        describe('case: address_create', () => {
            before(() => {
                xmlString = `<address><first-name>test</first-name><last-name>test</last-name><company>test</company><street-address>test</street-address>
                <extended-address>test</extended-address><locality>test</locality><region>test</region><postal-code>test</postal-code>
                <country-code-alpha2>test</country-code-alpha2><country-name>test</country-name></address>`;
                xmlData.returns(xmlString.trim().replace('\n', ''));
            });
            it('should return xmlData', () => {
                expect(braintreeApi.createXml('address_create', data)).equal(xmlString.trim().replace('\n', ''));
            });
        });
        describe('case line-items', () => {
            it('should map and return data', () => {
                data = [{
                    name: 'test',
                    kind: 'test',
                    quantity: 'test',
                    unitAmount: 'test',
                    unitOfMeasure: 'test',
                    totalAmount: 'test',
                    taxAmount: 'test',
                    discountAmount: 'test',
                    productCode: 'test',
                    commodityCode: 'test'
                }];
                let lineItem = '<line-item><name>test</name><kind>test</kind><quantity>test</quantity><unit-amount>test</unit-amount><unit-of-measure>test</unit-of-measure><total-amount>test</total-amount><tax-amount>test</tax-amount><discount-amount>test</discount-amount><product-code>test</product-code><commodity-code>test</commodity-code></line-item>';
                let result = `<line-items type="array">${lineItem}</line-items>`;
                expect(braintreeApi.createXml('line-items', data)).to.be.equal(result.trim().replace('\n', ''));
            });
        });
    });

    describe('prepareXmlData', function () {
        let result;
        before(function () {
            result = braintreeApi.prepareXmlData({
                test1: null,
                test2: {
                    test3: 'test',
                    test4: null
                }
            });
        });

        it('should replace inappropriate values in request data object into empty string', function () {
            const expectedResult = { test1: '', test2: { test3: 'test', test4: '' } };
            expect(result).to.deep.equals(expectedResult);
        });
    });

    describe('createMerchantAccountXml', function () {
        before(function () {
            prefs.merchantAccountIDs = {
                key: 'USD:6v6t7x'
            };
        });

        describe('if merchant account id exist', () => {
            it('should return merchant-account-id tag with merchant account id', () => {
                expect(braintreeApi.createMerchantAccountXml('usd')).to.be.equal('<merchant-account-id>6v6t7x</merchant-account-id>');
            });
        });
        describe('if merchant account id wasnn"t found for diven currency', () => {
            it('should return empty merchant-account-id', () => {
                expect(braintreeApi.createMerchantAccountXml('eur')).to.be.equal('<merchant-account-id/>');
            });
        });
    });
});
