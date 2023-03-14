'use strict';
var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var site = require('dw/system/Site').getCurrent();

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

var {
    getLogger,
    createAddressData,
    getAmountPaid,
    updateOrderBillingAddress,
    getWalletPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    saveCustomerCreditCard,
    getPaypalCustomerPaymentInstrumentByEmail,
    getCustomerPaymentInstruments
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    saveGooglePayAccount,
    updateShippingAddress,
    createPreferredAddressObj
} = require('~/cartridge/scripts/braintree/processors/processorHelper');

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var prefs = require('~/cartridge/config/braintreePreferences');


/**
* Creates config for hosted fields
* @param {Object} cardForm The string to repeat.
* @returns {Object} configuration object
*/
function createHostedFieldsConfig(cardForm) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: braintreeApiCalls.getClientToken(site.getDefaultCurrency()),
        messages: {
            validation: Resource.msg('braintree.creditcard.error.validation', 'locale', null),
            secure3DFailed: Resource.msg('braintree.creditcard.error.secure3DFailed', 'locale', null),
            HOSTED_FIELDS_FIELDS_EMPTY: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_EMPTY', 'locale', null),
            HOSTED_FIELDS_FIELDS_INVALID: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FIELDS_INVALID', 'locale', null),
            HOSTED_FIELDS_FAILED_TOKENIZATION: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_FAILED_TOKENIZATION', 'locale', null),
            HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR: Resource.msg('braintree.creditcard.error.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR', 'locale', null),
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        amount: 1,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName
        }
    };
}

/**
* Creates config for PayPal button on Profile page
* @returns {Object} configuration object
*/
function createAccountPaypalButtonConfig() {
    var config = {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId,
        clientToken: braintreeApiCalls.getClientToken(site.getDefaultCurrency()),
        options: {
            flow: 'vault',
            displayName: empty(prefs.paypalDisplayName) ? '' : prefs.paypalDisplayName,
            billingAgreementDescription: empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription
        },
        paypalConfig: {
            fundingSource: 'paypal',
            style: {
                layout: 'horizontal',
                label: 'paypal',
                maxbuttons: 1,
                fundingicons: false,
                shape: 'rect',
                size: 'medium',
                tagline: false
            }
        },
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null),
            PAYPAL_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.PAYPAL_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
            PAYPAL_INVALID_PAYMENT_OPTION: Resource.msg('braintree.error.PAYPAL_INVALID_PAYMENT_OPTION', 'locale', null),
            PAYPAL_FLOW_FAILED: Resource.msg('braintree.error.PAYPAL_FLOW_FAILED', 'locale', null),
            PAYPAL_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.PAYPAL_BROWSER_NOT_SUPPORTED', 'locale', null)
        }
    };
    return config;
}

/**
* Saves PayPal account
* @param {boolean} createPaymentMethodResponseData payment method response data
* @returns {Object} Object with token
*/
function savePaypalAccount(createPaymentMethodResponseData) {
    var Transaction = require('dw/system/Transaction');
    try {
        Transaction.begin();

        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        var paymentForm = server.forms.getForm('braintreepaypalaccount');

        customerPaymentInstrument.setCreditCardType('visa'); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreePaypalAccountEmail = createPaymentMethodResponseData.paypalAccount.email;
        customerPaymentInstrument.custom.braintreePaypalAccountAddresses = paymentForm.addresses.value;
        customerPaymentInstrument.creditCardToken = createPaymentMethodResponseData.paypalAccount.token;

        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: createPaymentMethodResponseData.paypalAccount.token
    };
}

/**
* Creates config for Venmo button on Profile page
* @returns {Object} configuration object
*/
function createAccountVenmoButtonConfig() {
    var config = {
        venmoAccountPage: true,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId,
        clientToken: braintreeApiCalls.getClientToken(site.getDefaultCurrency()),
        options: {
            flow: 'vault',
            displayName: empty(prefs.venmoDisplayName) ? '' : prefs.venmoDisplayName
        },
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null),
            VENMO_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.VENMO_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
            VENMO_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.VENMO_BROWSER_NOT_SUPPORTED', 'locale', null)
        }
    };
    return config;
}

/**
* Saves Venmo account
* @param {boolean} createPaymentMethodResponseData payment method response data
* @returns {Object} Object with token
*/
function saveVenmoAccount(createPaymentMethodResponseData) {
    var Transaction = require('dw/system/Transaction');
    try {
        Transaction.begin();

        var customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
        customerPaymentInstrument.setCreditCardType('visa'); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreeVenmoUserId = createPaymentMethodResponseData.venmoAccount.venmoUserId;
        customerPaymentInstrument.creditCardToken = createPaymentMethodResponseData.venmoAccount.token;

        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: createPaymentMethodResponseData.venmoAccount.token
    };
}

/**
* Creates config for Google Pay button on Profile page
* @returns {Object} button config object
*/
function createAccountGooglePayButtonConfig() {
    var googlepayButtonConfig = {
        clientToken: braintreeApiCalls.getClientToken(site.getDefaultCurrency()),
        paymentMethodName: prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null),
            saving_paypal_account_error: Resource.msg('braintree.account.error.savingpaypalaccount', 'locale', null)
        },
        options: {
            amount: 0.00,
            currency: prefs.currencyCode,
            displayName: prefs.googlepayDisplayName
        }
    };

    return googlepayButtonConfig;
}

server.get('GetPaymentMethodNonceByUUID',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var uuid = request.httpParameterMap.id.stringValue;
        if (!uuid) {
            res.setStatusCode(400);
            return;
        }
        var nonce = require('~/cartridge/scripts/braintree/controllerBase').getPaymentMethodNonceByUUID(uuid);
        if (!nonce) {
            res.setStatusCode(400);
            return;
        }
        res.json({
            nonce: nonce
        });
        next();
    });

server.use('CheckoutFromCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var processorHandle = null;

    if (customer.authenticated) {
        var customerPreferredAddress = customer.getProfile().getAddressBook().getPreferredAddress();
        if (customer.authenticated && customerPreferredAddress) {
            customerPreferredAddress = createPreferredAddressObj(customerPreferredAddress);
            updateShippingAddress(customerPreferredAddress, basket.getDefaultShipment());
        }
    }

    try {
        processorHandle = require('~/cartridge/scripts/braintree/processors/processorPaypal').handle(basket, true);
    } catch (error) {
        getLogger().error(error);
    }

    if (processorHandle && processorHandle.success) {
        res.json({ redirectUrl: URLUtils.https('Checkout-Begin', 'stage', 'placeOrder').toString() });
    } else {
        request.custom.isBraintreeCustomError = true;
        res.json({ redirectUrl: URLUtils.https('Cart-Show').toString() });
    }

    next();
    return;
});

server.post('AppleCheckoutFromCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var processorHandle = null;

    try {
        processorHandle = require('~/cartridge/scripts/braintree/processors/processorApplepay').handle(basket, true);
    } catch (error) {
        getLogger().error(error);
    }

    if (processorHandle && processorHandle.success) {
        res.json({
            success: true,
            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString()
        });
    } else {
        request.custom.isBraintreeCustomError = true;
        res.setStatusCode(500);
    }

    next();
});

server.post('GoogleCheckoutFromCart', server.middleware.https, function (req, res, next) {
    var HookMgr = require('dw/system/HookMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var processorHandle = null;
    session.custom.showGooglePayList = false;

    try {
        var paymentMethodID = prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId;
        var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

        processorHandle = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
            'Handle',
            basket,
            null,
            paymentMethodID,
            req
        );
    } catch (error) {
        getLogger().error(error);
    }

    if (processorHandle && processorHandle.success) {
        if (customer.authenticated &&
            getWalletPaymentInstrument(basket.customer.profile.wallet.paymentInstruments, 'GooglePay')
                .length) {
            session.custom.showGooglePayList = true;
        }
        res.json({
            success: true,
            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString()
        });
    } else {
        res.setStatusCode(500);
        res.print(Resource.msg('error.technical', 'checkout', null));
    }

    return next();
});

server.get(
    'AccountAddCreditCard',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        if (prefs.is3DSecureEnabled) {
            res.redirect(URLUtils.url('Account-Show'));
            return next();
        }
        var paymentForm = server.forms.getForm('creditCard');
        paymentForm.clear();
        res.render('braintree/account/editAddCreditCard', {
            paymentForm: paymentForm,
            braintree: {
                prefs: prefs,
                hostedFieldsConfig: createHostedFieldsConfig(paymentForm)
            },
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                },
                {
                    htmlValue: Resource.msg('page.heading.payments', 'payment', null),
                    url: URLUtils.url('Braintree-PaymentInstruments').toString()
                }
            ]
        });

        return next();
    }
);

server.post('AccountAddCreditCardHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var httpParameterMap = request.httpParameterMap;
        if (!braintreeApiCalls.isCustomerExistInVault(customer)) {
            var createCustomerOnBraintreeSideData = braintreeApiCalls.createCustomerOnBraintreeSide();
            if (createCustomerOnBraintreeSideData.error) {
                res.json({
                    success: false,
                    error: createCustomerOnBraintreeSideData.error
                });
                return next();
            }
        }
        var createPaymentMethodResponseData = braintreeApiCalls.createPaymentMethodOnBraintreeSide(httpParameterMap.braintreePaymentMethodNonce.stringValue, httpParameterMap.braintreeCreditCardMakeDefault.booleanValue);
        if (createPaymentMethodResponseData.error) {
            res.json({
                success: false,
                error: createPaymentMethodResponseData.error
            });
            return next();
        }
        var paymentForm = server.forms.getForm('creditCard');
        var card = saveCustomerCreditCard(createPaymentMethodResponseData, paymentForm.cardType.value, paymentForm.cardOwner.value);
        if (card.error) {
            res.json({
                success: false,
                error: card.error
            });
            return next();
        }
        if (httpParameterMap.makeDefaultPayment && httpParameterMap.makeDefaultPayment.value === 'on') {
            var makeDefaultCreditCardData = braintreeApiCalls.makeDefaultCreditCard(card.paymentMethodToken);
            if (makeDefaultCreditCardData.error) {
                res.json({
                    success: false,
                    error: makeDefaultCreditCardData.error
                });
                return next();
            }
        }
        paymentForm.clear();
        res.json({
            success: true,
            redirectUrl: URLUtils.https('Braintree-PaymentInstruments').toString()
        });
        return next();
    });

server.get(
    'AccountAddPaypalAccount',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('braintreepaypalaccount');
        paymentForm.clear();
        var paypalPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        res.render('braintree/account/editAddPaypalAccount', {
            paymentForm: paymentForm,
            braintree: {
                prefs: prefs,
                hasDefaultPaymentMethod: empty(paypalPaymentInstruments),
                accountPaypalButtonConfig: createAccountPaypalButtonConfig()
            },
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                },
                {
                    htmlValue: Resource.msg('page.heading.payments', 'payment', null),
                    url: URLUtils.url('Braintree-PaymentInstruments').toString()
                }
            ]
        });

        next();
    }
);

server.post('AccountAddPaypalHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('braintreepaypalaccount');
        var paypal = {
            email: paymentForm.email.value,
            nonce: paymentForm.nonce.value,
            makeDefault: paymentForm.makedefault.value
        };
        var paypalPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        if (empty(paypalPaymentInstruments)) {
            paypal.makeDefault = true;
        }

        if (!braintreeApiCalls.isCustomerExistInVault(customer)) {
            var createCustomerOnBraintreeSideData = braintreeApiCalls.createCustomerOnBraintreeSide();
            if (createCustomerOnBraintreeSideData.error) {
                res.json({
                    success: false,
                    error: createCustomerOnBraintreeSideData.error
                });
                return next();
            }
        }
        if (getPaypalCustomerPaymentInstrumentByEmail(paypal.email)) {
            res.json({
                success: false,
                error: Resource.msgf('braintree.paypal.addaccount.error.existAccount', 'locale', null, paypal.email)
            });
            return next();
        }
        var createPaymentMethodResponseData = braintreeApiCalls.createPaymentMethodOnBraintreeSide(paypal.nonce, paypal.makeDefault);
        if (createPaymentMethodResponseData.error) {
            res.json({
                success: false,
                error: createPaymentMethodResponseData.error
            });
            return next();
        }
        var paypalAccount = savePaypalAccount(createPaymentMethodResponseData);
        if (paypalAccount.error) {
            res.json({
                success: false,
                error: paypalAccount.error
            });
            return next();
        }
        if (paypal.makeDefault) {
            var makeDefaultCreditCardData = braintreeApiCalls.makeDefaultPaypalAccount(paypalAccount.token);
            if (makeDefaultCreditCardData.error) {
                res.json({
                    success: false,
                    error: makeDefaultCreditCardData.error
                });
                return next();
            }
        }
        paymentForm.clear();
        res.json({
            success: true,
            redirectUrl: URLUtils.https('Braintree-PaymentInstruments').toString()
        });

        return next();
    });

server.get(
    'AccountAddVenmoAccount',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('braintreevenmoaccount');
        paymentForm.clear();
        res.render('braintree/account/editAddVenmoAccount', {
            paymentForm: paymentForm,
            braintree: {
                prefs: prefs,
                accountVenmoButtonConfig: createAccountVenmoButtonConfig()
            },
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                },
                {
                    htmlValue: Resource.msg('page.heading.payments', 'payment', null),
                    url: URLUtils.url('Braintree-PaymentInstruments').toString()
                }
            ]
        });

        next();
    }
);

server.post('AccountAddVenmoHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('braintreevenmoaccount');
        var venmo = {
            nonce: paymentForm.nonce.value,
            makeDefault: paymentForm.makedefault.value
        };

        if (!braintreeApiCalls.isCustomerExistInVault(customer)) {
            var createCustomerOnBraintreeSideData = braintreeApiCalls.createCustomerOnBraintreeSide();
            if (createCustomerOnBraintreeSideData.error) {
                res.json({
                    success: false,
                    error: createCustomerOnBraintreeSideData.error
                });
                return next();
            }
        }

        var createPaymentMethodResponseData = braintreeApiCalls.createPaymentMethodOnBraintreeSide(venmo.nonce, venmo.makeDefault);
        if (createPaymentMethodResponseData.error) {
            res.json({
                success: false,
                error: createPaymentMethodResponseData.error
            });
            return next();
        }

        var venmoAccount = saveVenmoAccount(createPaymentMethodResponseData);
        if (venmoAccount.error) {
            res.json({
                success: false,
                error: venmoAccount.error
            });
            return next();
        }

        if (venmo.makeDefault) {
            var makeDefaultCreditCardData = braintreeApiCalls.makeDefaultVenmoAccount(venmoAccount.token);
            if (makeDefaultCreditCardData.error) {
                res.json({
                    success: false,
                    error: makeDefaultCreditCardData.error
                });
                return next();
            }
        }

        res.json({
            success: true,
            redirectUrl: URLUtils.https('Braintree-PaymentInstruments').toString()
        });

        return next();
    });

server.get('PaymentInstruments',
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var AccountModel = require('*/cartridge/models/account');
        var CREDIT_CARD = require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD;
        res.render('braintree/account/paymentInstruments', {
            paymentCardInstruments: AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(CREDIT_CARD)),
            paymentPaypalInstruments: AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId)),
            paymentVenmoInstruments: AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId)),
            paymentGooglePayInstruments: AccountModel.getCustomerPaymentInstruments(getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId)),
            actionUrl: URLUtils.url('PaymentInstruments-DeletePayment').toString(),
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }
            ],
            braintree: {
                prefs: prefs,
                isPaypalVaultAllowed: prefs.vaultMode && !prefs.paypalOrderIntent
            }
        });
        next();
    });

server.post('EditDefaultShippinAddressHandle', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var formErrors = require('*/cartridge/scripts/formErrors');

    var addressForm = server.forms.getForm('address');
    var addressFormObj = addressForm.toObject();

    if (addressForm.valid) {
        res.setViewData(addressFormObj);
        this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
            var formInfo = res.getViewData();
            Transaction.wrap(function () {
                var BasketMgr = require('dw/order/BasketMgr');
                var basket = BasketMgr.getCurrentBasket();
                var shippingAddress = basket.defaultShipment.createShippingAddress();

                shippingAddress.setFirstName(formInfo.firstName || '');
                shippingAddress.setLastName(formInfo.lastName || '');

                shippingAddress.setAddress1(formInfo.address1 || '');
                shippingAddress.setAddress2(formInfo.address2 || '');
                shippingAddress.setCity(formInfo.city || '');
                shippingAddress.setPostalCode(formInfo.postalCode || '');
                if (formInfo.states && formInfo.states.stateCode) {
                    shippingAddress.setStateCode(formInfo.states.stateCode);
                }
                if (formInfo.country) {
                    shippingAddress.setCountryCode(formInfo.country);
                }
                shippingAddress.setPhone(formInfo.phone || '');
                res.json({
                    success: true,
                    redirectUrl: URLUtils.url('Braintree-CheckoutFromCart').toString()
                });
            });
        });
    } else {
        res.json({
            success: false,
            fields: formErrors(addressForm)
        });
    }
    next();
});

server.get('GetOrderInfo', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var basketShippingAddress = basket.getDefaultShipment().getShippingAddress();

    var shippingAddress = null;
    if (!empty(basketShippingAddress)) {
        var shippingInfo = createAddressData(basketShippingAddress);
        var firstName = shippingInfo.firstName || '';
        var lastName = shippingInfo.lastName || '';
        shippingAddress = {
            recipientName: firstName + ' ' + lastName,
            line1: shippingInfo.streetAddress || '',
            line2: shippingInfo.extendedAddress || '',
            city: shippingInfo.locality || '',
            countryCode: (shippingInfo.countryCodeAlpha2).toUpperCase() || '',
            postalCode: shippingInfo.postalCode || '',
            state: shippingInfo.region || '',
            phone: shippingInfo.phoneNumber || ''
        };
    }
    res.json({
        amount: getAmountPaid(basket).getValue(),
        shippingAddress: shippingAddress
    });
    next();
});

server.post('PaymentConfirm', server.middleware.https, function (req, res, next) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');

    var basket = require('dw/order/BasketMgr').getCurrentBasket();
    var order = COHelpers.createOrder(basket);
    if (!order) {
        res.setStatusCode(500);
        res.print(Resource.msg('error.technical', 'checkout', null));
        return next();
    }

    var lpmTransactionSale = null;
    var { nonce, details, lpmName } = req.body && JSON.parse(req.body);
    try {
        lpmTransactionSale = require('~/cartridge/scripts/braintree/processors/processorLpm').setLpmTransactionSale(order, nonce, lpmName);
    } catch (error) {
        getLogger().error(error);
        res.setStatusCode(500);
        res.print(error.message);
        return next();
    }

    if (!lpmTransactionSale || lpmTransactionSale.error) {
        res.setStatusCode(500);
        res.print(lpmTransactionSale.message);
        return next();
    }

    updateOrderBillingAddress(order, details);

    // Places the order.
    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) throw new Error();
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);
        Transaction.commit();
    } catch (e) {
        Transaction.rollback();
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        getLogger().error(e);
        res.setStatusCode(500);
        res.print(e.message);
        return next();
    }

    res.json({
        redirectUrl: URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString()
    });
    return next();
});

server.get('FallbackProcess', server.middleware.https, function (req, res, next) {
    var clientToken = braintreeApiCalls.getClientToken(site.getDefaultCurrency());
    var paymentConfirmUrl = URLUtils.url('Braintree-PaymentConfirm').toString();
    var lpmName = request.httpParameterMap.lpmName.value;

    res.render('/braintree/checkout/lpmFallback', {
        clientToken: clientToken,
        paymentConfirmUrl: paymentConfirmUrl,
        lpmName: lpmName,
        prefs: prefs
    });
    return next();
});

server.get(
    'RenderGooglePayAccount',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        if (!prefs.vaultMode) {
            res.redirect(URLUtils.url('Error-ErrorCode', 'err', 'googlepay_is_not_vault_mode'));
            next();
        }
        var paymentForm = server.forms.getForm('braintreegooglepayaccount');
        paymentForm.clear();
        res.render('braintree/account/editAddGooglePayAccount', {
            paymentForm: paymentForm,
            braintree: {
                prefs: prefs,
                accountGooglePayButtonConfig: createAccountGooglePayButtonConfig()
            },
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                },
                {
                    htmlValue: Resource.msg('page.heading.payments', 'payment', null),
                    url: URLUtils.url('Braintree-PaymentInstruments').toString()
                }
            ]
        });

        next();
    }
);

server.post('AccountAddGooglePayHandle',
    csrfProtection.validateAjaxRequest,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        if (!prefs.vaultMode) {
            res.json({
                success: false,
                error: Resource.msg('message.error.is_not_vault_mode', 'error', null)
            });
            return next();
        }

        var googlePayNonce = server.forms.getForm('braintreegooglepayaccount').nonce.value;

        if (!braintreeApiCalls.isCustomerExistInVault(customer)) {
            var createCustomerOnBraintreeSideData = braintreeApiCalls.createCustomerOnBraintreeSide();
            if (createCustomerOnBraintreeSideData.error) {
                res.json({
                    success: false,
                    error: createCustomerOnBraintreeSideData.error
                });
                return next();
            }
        }

        var createPaymentMethodResponseData = braintreeApiCalls.createPaymentMethodOnBraintreeSide(googlePayNonce, true);
        if (createPaymentMethodResponseData.error) {
            res.json({
                success: false,
                error: createPaymentMethodResponseData.error
            });
            return next();
        }

        var googlePayAccountAddress = server.forms.getForm('braintreegooglepayaccount').addresses.value;
        var googlePayAccount = saveGooglePayAccount(createPaymentMethodResponseData, googlePayAccountAddress);
        if (googlePayAccount.error) {
            res.json({
                success: false,
                error: googlePayAccount.error
            });
            return next();
        }

        res.json({
            success: true,
            redirectUrl: URLUtils.https('Braintree-PaymentInstruments').toString()
        });

        return next();
    });

module.exports = server.exports();
