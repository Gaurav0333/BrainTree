'use strict';

var page = module.superModule;
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var server = require('server');

var {
    getCustomerPaymentInstruments,
    getGooglePayCustomerPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');

var {
    getAmountPaid
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var prefs = require('~/cartridge/config/braintreePreferences');

/**
* Creates config button object for paypal
* @param {Basket} basket Basket Object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreePayPalButtonConfig(basket, clientToken) {
    var amount = getAmountPaid(basket);
    var locale = Site.getCurrent().getDefaultLocale();
    var displayName = empty(prefs.paypalDisplayName) ? '' : prefs.paypalDisplayName;
    var billingAgreementDescription = empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription;

    var flow = 'checkout';
    var intent = prefs.paypalIntent;
    if (prefs.vaultMode) {
        flow = 'vault';
    }

    if (prefs.paypalOrderIntent) {
        intent = 'order';
        flow = 'checkout';
    }

    var braintreePaypalBillingConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId,
        isFraudToolsEnabled: prefs.isPaypalFraudToolsEnabled,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null),
            PAYPAL_ACCOUNT_TOKENIZATION_FAILED: Resource.msg('braintree.error.PAYPAL_ACCOUNT_TOKENIZATION_FAILED', 'locale', null),
            PAYPAL_INVALID_PAYMENT_OPTION: Resource.msg('braintree.error.PAYPAL_INVALID_PAYMENT_OPTION', 'locale', null),
            PAYPAL_FLOW_FAILED: Resource.msg('braintree.error.PAYPAL_FLOW_FAILED', 'locale', null),
            PAYPAL_BROWSER_NOT_SUPPORTED: Resource.msg('braintree.error.PAYPAL_BROWSER_NOT_SUPPORTED', 'locale', null)
        },
        options: {
            flow: flow,
            intent: intent,
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            locale: locale,
            enableShippingAddress: true,
            displayName: displayName,
            billingAgreementDescription: billingAgreementDescription
        },
        paypalConfig: prefs.paypalBillingButtonConfig,
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    if (prefs.isSettle && !prefs.paypalOrderIntent) {
        braintreePaypalBillingConfig.options.useraction = 'commit';
    }

    return braintreePaypalBillingConfig;
}

/**
* Creates config button object for Apple Pay
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreeApplePayButtonConfig(basket, clientToken) {
    var amount = getAmountPaid(basket);

    var applePayButtonConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_APPLEPAY.paymentMethodId,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        returnUrl: URLUtils.url('Braintree-AppleCheckoutFromCart', 'fromCart', 'true').toString(),
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.applepayDisplayName
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return applePayButtonConfig;
}

/**
* Creates config button object for Venmo
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreeVenmoButtonConfig(basket, clientToken) {
    var amount = getAmountPaid(basket);

    var venmoButtonConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.venmoDisplayName
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return venmoButtonConfig;
}

/**
* Creates config object for venmo
* @param {Array} paymentMethods Payment methods list
* @returns {Object} venmo config object
*/
function createVenmoConfig(paymentMethods) {
    var customerVenmoPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
    var isAllowedAddAccount = prefs.vaultMode;
    var newAccountSelected = true;
    var isNeedHideContinueButton = true;
    var braintreeVenmoUserId = '';
    var braintreePaymentMethodNonce = '';
    var isNeedHideVenmoButton = false;


    if (!empty(paymentMethods) && paymentMethods[0].custom.braintreePaymentMethodNonce) {
        braintreePaymentMethodNonce = paymentMethods[0].custom.braintreePaymentMethodNonce;
        braintreeVenmoUserId = paymentMethods[0].custom.braintreeVenmoUserId;
        isNeedHideContinueButton = false;
        isNeedHideVenmoButton = true;
    } else if (customer.authenticated && !empty(customerVenmoPaymentInstruments)) {
        var iterator = customerVenmoPaymentInstruments.iterator();
        var instrument = null;

        while (iterator.hasNext()) {
            instrument = iterator.next();

            if (instrument.custom.braintreeDefaultCard) {
                isNeedHideContinueButton = false;
                newAccountSelected = false;
                break;
            }
        }
    }
    return {
        customerVenmoPaymentInstruments: customerVenmoPaymentInstruments,
        isAllowedAddAccount: isAllowedAddAccount,
        newAccountSelected: newAccountSelected,
        isNeedHideContinueButton: isNeedHideContinueButton,
        isNeedHideVenmoButton: isNeedHideVenmoButton,
        braintreePaymentMethodNonce: braintreePaymentMethodNonce,
        braintreeVenmoUserId: braintreeVenmoUserId
    };
}

/**
* Creates config object for googlepay
* @param {Array} paymentMethods Payment methods list
* @returns {Object} googlepay config object
*/
function createGooglepayConfig(paymentMethods) {
    var customerGooglepayPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
    var newAccountSelected = true;
    var isNeedHideContinueButton = true;
    var braintreeGooglePayCardDescription = '';
    var braintreePaymentMethodNonce = '';
    var isNeedHideGooglepayButton = false;

    if (!empty(paymentMethods) && paymentMethods[0].custom.braintreePaymentMethodNonce) {
        braintreePaymentMethodNonce = paymentMethods[0].custom.braintreePaymentMethodNonce;
        braintreeGooglePayCardDescription = paymentMethods[0].custom.braintreeGooglePayCardDescription;
        isNeedHideContinueButton = false;
        isNeedHideGooglepayButton = true;
    } else if (customer.authenticated && !empty(customerGooglepayPaymentInstruments)) {
        Array.some(customerGooglepayPaymentInstruments, function (instrument) {
            if (instrument.creditCardToken) {
                isNeedHideContinueButton = false;
                newAccountSelected = false;
                return;
            }
        });
    }
    return {
        customerGooglepayPaymentInstruments: customerGooglepayPaymentInstruments,
        newAccountSelected: newAccountSelected,
        isNeedHideContinueButton: isNeedHideContinueButton,
        isNeedHideGooglepayButton: isNeedHideGooglepayButton,
        braintreePaymentMethodNonce: braintreePaymentMethodNonce,
        braintreeGooglePayCardDescription: braintreeGooglePayCardDescription,
        canBeSavedGooglepayAccount: empty(getGooglePayCustomerPaymentInstrument()) && prefs.vaultMode
    };
}

/**
* Returns googlepay Card Description or null
* @param {Array} paymentMethods Payment methods list
* @returns {string} Card Description or null
*/
function getGooglepayCardDescriprion(paymentMethods) {
    var customerGooglepayPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
    var gpCardDescription = null;
    if (!empty(paymentMethods) && !empty(paymentMethods[0].custom.braintreeGooglePayCardDescription)) {
        gpCardDescription = paymentMethods[0].custom.braintreeGooglePayCardDescription;
    } else if (customer.authenticated && !empty(customerGooglepayPaymentInstruments)) {
        Array.some(customerGooglepayPaymentInstruments, function (instrument) {
            if (!empty(instrument.custom.braintreeGooglePaySourceDescription)) {
                gpCardDescription = instrument.custom.braintreeGooglePaySourceDescription;
                return;
            }
        });
    }
    var gpCardDescriptionData = gpCardDescription && gpCardDescription.split(' ');
    return !empty(gpCardDescriptionData) ? gpCardDescriptionData[0] + '....' + gpCardDescriptionData[1] : null;
}

/**
* Creates config object for paypal
* @param {Array} paymentMethods Payment methods list
* @returns {Object} paypal config object
*/
function createPaypalConfig(paymentMethods) {
    var customerPaypalPaymentInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
    var isVaultAllowed = customer.authenticated && prefs.vaultMode && !prefs.paypalOrderIntent;
    var newAccountSelected = true;
    var isNeedHideContinueButton = true;
    var braintreePaypalEmail = '';
    var braintreePaymentMethodNonce = '';
    if (!empty(paymentMethods) && paymentMethods[0].custom.braintreePaymentMethodNonce) {
        braintreePaymentMethodNonce = paymentMethods[0].custom.braintreePaymentMethodNonce;
        braintreePaypalEmail = paymentMethods[0].custom.braintreePaypalEmail;
        isNeedHideContinueButton = false;
    } else if (customer.authenticated && !empty(customerPaypalPaymentInstruments)) {
        var iterator = customerPaypalPaymentInstruments.iterator();
        var instrument = null;
        while (iterator.hasNext()) {
            instrument = iterator.next();
            if (instrument.custom.braintreeDefaultCard) {
                isNeedHideContinueButton = false;
                newAccountSelected = false;
                break;
            }
        }
    }
    return {
        customerPaypalPaymentInstruments: customerPaypalPaymentInstruments,
        isShowCheckbox: isVaultAllowed,
        newAccountSelected: newAccountSelected,
        isNeedHideContinueButton: isNeedHideContinueButton,
        braintreePaymentMethodNonce: braintreePaymentMethodNonce,
        braintreePaypalEmail: braintreePaypalEmail
    };
}
/**
* Creates config for credit card
* @returns {Object} credit card config object
*/
function createCreditCardConfig() {
    var CREDIT_CARD = require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD;
    var customerCreditCardPaymentInstruments = getCustomerPaymentInstruments(CREDIT_CARD);
    var isAllowedAddCard = prefs.vaultMode;

    var newCardSelected = '';
    if (customer.authenticated && !empty(customerCreditCardPaymentInstruments)) {
        newCardSelected = true;
        var iterator = customerCreditCardPaymentInstruments.iterator();
        var creditCardInst = null;
        while (iterator.hasNext()) {
            creditCardInst = iterator.next();
            if (creditCardInst.custom.braintreeDefaultCard) {
                newCardSelected = false;
                break;
            }
        }
    }

    return {
        customerCreditCardPaymentInstruments: customerCreditCardPaymentInstruments,
        isAllowedAddCard: isAllowedAddCard,
        newCardSelected: newCardSelected
    };
}


/**
* Creates config Brantree hosted fields
* @param {Response} res Response system object
* @param {string} clientToken Braintree clientToken
* @returns {Object} hosted fields config object
*/
function createHostedFieldsConfig(res, clientToken) {
    var isEnable3dSecure = prefs.is3DSecureEnabled;
    var billingData = res.getViewData();
    var cardForm = billingData.forms.billingForm.creditCardFields;

    return {
        paymentMethodName: prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId,
        is3dSecureEnabled: isEnable3dSecure,
        isFraudToolsEnabled: prefs.isFraudToolsEnabled,
        isSkip3dSecureLiabilityResult: prefs.is3DSecureSkipClientValidationResult,
        clientToken: clientToken,
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
        amount: 0,
        fieldsConfig: {
            initOwnerValue: '',
            ownerHtmlName: cardForm.cardOwner.htmlName,
            typeHtmlName: cardForm.cardType.htmlName,
            numberHtmlName: cardForm.cardNumber.htmlName
        }
    };
}

/**
* Creates config button object for LPM
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreeLocalPaymentMethodButtonConfig(basket, clientToken) {
    var amount = getAmountPaid(basket);

    var localPaymentMethodButtonConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: ''
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString(),
        paymentConfirmUrl: URLUtils.url('Braintree-PaymentConfirm').toString(),
        fallbackUrl: URLUtils.https('Braintree-FallbackProcess').toString()
    };

    return localPaymentMethodButtonConfig;
}

/**
* Creates config button object for Google Pay
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreeGooglePayButtonConfig(basket, clientToken) {
    var amount = getAmountPaid(basket);

    var googlepayButtonConfig = {
        clientToken: clientToken,
        paymentMethodName: prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId,
        messages: {
            CLIENT_REQUEST_TIMEOUT: Resource.msg('braintree.error.CLIENT_REQUEST_TIMEOUT', 'locale', null),
            CLIENT_GATEWAY_NETWORK: Resource.msg('braintree.error.CLIENT_GATEWAY_NETWORK', 'locale', null),
            CLIENT_REQUEST_ERROR: Resource.msg('braintree.error.CLIENT_REQUEST_ERROR', 'locale', null),
            CLIENT_MISSING_GATEWAY_CONFIGURATION: Resource.msg('braintree.error.CLIENT_MISSING_GATEWAY_CONFIGURATION', 'locale', null)
        },
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.googlepayDisplayName,
            isShippingAddressRequired: false
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return googlepayButtonConfig;
}

server.extend(page);
server.append('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();

    if (!basket) {
        next();
        return;
    }

    var clientToken = braintreeApiCalls.getClientToken(basket.getCurrencyCode());
    var paymentMethod;
    var payPalButtonConfig = null;
    var applePayButtonConfig = null;
    var venmoButtonConfig = null;
    var lpmButtonConfig = null;
    var googlepayButtonConfig = null;
    var googlepayConfig = {};
    var googlepayCardDescription = null;
    var paypalConfig = {};
    var creditCardConfig = {};
    var venmoConfig = {};
    var hostedFieldsConfig = {};
    var lpmPaymentOptions;
    var isActiveLpmPaymentOptions;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        paypalConfig = createPaypalConfig(paymentMethod);
    }

    if (prefs.paymentMethods.BRAINTREE_VENMO.isActive) {
        venmoButtonConfig = createBraintreeVenmoButtonConfig(basket, clientToken);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_VENMO.paymentMethodId);
        venmoConfig = createVenmoConfig(paymentMethod);
    }

    if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive) {
        applePayButtonConfig = createBraintreeApplePayButtonConfig(basket, clientToken);
    }

    if (prefs.paymentMethods.BRAINTREE_CREDIT.isActive) {
        creditCardConfig = createCreditCardConfig();
        hostedFieldsConfig = createHostedFieldsConfig(res, clientToken);
    }

    if (prefs.paymentMethods.BRAINTREE_LOCAL.isActive) {
        isActiveLpmPaymentOptions = prefs.paymentMethods.BRAINTREE_LOCAL.isActive;
        lpmButtonConfig = createBraintreeLocalPaymentMethodButtonConfig(basket, clientToken);
        lpmPaymentOptions = require('~/cartridge/scripts/braintree/helpers/paymentHelper').getApplicableLocalPaymentMethods({
            applicablePaymentMethods: res.viewData.order.billing.payment.applicablePaymentMethods,
            paymentMethodIds: prefs.paymentMethods.BRAINTREE_LOCAL.paymentMethodIds
        });
    }

    if (prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive) {
        googlepayButtonConfig = createBraintreeGooglePayButtonConfig(basket, clientToken);
        paymentMethod = basket.getPaymentInstruments(prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId);
        googlepayConfig = createGooglepayConfig(paymentMethod);
        googlepayCardDescription = getGooglepayCardDescriprion(paymentMethod);
    }

    res.setViewData({
        braintree: {
            prefs: prefs,
            currency: basket.getCurrencyCode(),
            paypalConfig: paypalConfig,
            payPalButtonConfig: payPalButtonConfig,
            applePayButtonConfig: applePayButtonConfig,
            venmoButtonConfig: venmoButtonConfig,
            venmoConfig: venmoConfig,
            hostedFieldsConfig: hostedFieldsConfig,
            creditCardConfig: creditCardConfig,
            lpmPaymentOptions: lpmPaymentOptions,
            isActiveLpmPaymentOptions: isActiveLpmPaymentOptions,
            lpmButtonConfig: lpmButtonConfig,
            googlepayButtonConfig: googlepayButtonConfig,
            googlepayConfig: googlepayConfig,
            googlepayCardDescription: googlepayCardDescription
        }
    });

    next();
});

module.exports = server.exports();
