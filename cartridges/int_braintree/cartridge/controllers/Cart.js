'use strict';

var page = module.superModule;
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var server = require('server');

var { getCustomerPaymentInstruments } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    addDefaultShipping,
    getAmountPaid,
    isPaypalButtonEnabled
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var prefs = require('~/cartridge/config/braintreePreferences');

/**
* Creates config button object for paypal
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @param {Object} paypalConfig paypal configuration object
* @returns {Object} button config object
*/
function createBraintreePayPalButtonConfig(basket, clientToken, paypalConfig) {
    addDefaultShipping(basket);
    var amount = getAmountPaid(basket);
    var flow = 'checkout';
    var intent = prefs.paypalIntent;
    if (prefs.vaultMode) {
        flow = 'vault';
    }

    if (prefs.paypalOrderIntent) {
        intent = 'order';
        flow = 'checkout';
    }

    var locale = Site.getCurrent().getDefaultLocale();
    var displayName = empty(prefs.paypalDisplayName) ? '' : prefs.paypalDisplayName;
    var billingAgreementDescription = empty(prefs.paypalBillingAgreementDescription) ? '' : prefs.paypalBillingAgreementDescription;

    var paypalButtonConfig = {
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
        paypalHandle: URLUtils.url('Braintree-CheckoutFromCart', 'fromCart', 'true').toString(),
        options: {
            flow: flow,
            intent: intent,
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            locale: locale,
            enableShippingAddress: true,
            displayName: displayName,
            billingAgreementDescription: billingAgreementDescription,
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
        paypalConfig: paypalConfig,
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    if (prefs.isSettle && !prefs.paypalOrderIntent) {
        paypalButtonConfig.options.useraction = 'commit';
    }

    return paypalButtonConfig;
}

/**
* Creates config button object for Apple Pay
* @param {Basket} basket Basket object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreeApplePayButtonConfig(basket, clientToken) {
    addDefaultShipping(basket);
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
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString(),
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.applepayDisplayName
        }
    };

    return applePayButtonConfig;
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
        returnFromCartUrl: URLUtils.url('Braintree-GoogleCheckoutFromCart').toString(),
        options: {
            amount: parseFloat(amount.getValue()),
            currency: amount.getCurrencyCode(),
            displayName: prefs.googlepayDisplayName,
            isShippingAddressRequired: true
        },
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return googlepayButtonConfig;
}

server.extend(page);
server.append('Show', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();

    if (!basket) {
        next();
        return;
    }
    var clientToken = braintreeApiCalls.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var applePayButtonConfig = null;
    var googlepayButtonConfig = null;
    var defaultPaypalAddress = null;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive && isPaypalButtonEnabled('cart')) {
        var paypalConfig = prefs.paypalCartButtonConfig;
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, paypalConfig);
        var customerPaypalInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        if (customerPaypalInstruments && customerPaypalInstruments.length > 0) {
            defaultPaypalAddress = customer.getAddressBook().getPreferredAddress();
            if (!empty(defaultPaypalAddress)) {
                paypalBillingAgreementFlow = true;
            }
        }
    }

    if (prefs.paymentMethods.BRAINTREE_APPLEPAY.isActive && prefs.applepayVisibilityOnCart) {
        applePayButtonConfig = createBraintreeApplePayButtonConfig(basket, clientToken);
    }

    if (prefs.paymentMethods.BRAINTREE_GOOGLEPAY.isActive && prefs.googlepayVisibilityOnCart) {
        googlepayButtonConfig = createBraintreeGooglePayButtonConfig(basket, clientToken);
    }

    res.setViewData({
        braintree: {
            prefs: prefs,
            payPalButtonConfig: payPalButtonConfig,
            paypalBillingAgreementFlow: paypalBillingAgreementFlow,
            applePayButtonConfig: applePayButtonConfig,
            googlepayButtonConfig: googlepayButtonConfig,
            staticImageLink: prefs.staticImageLink,
            checkoutFromCartUrl: prefs.checkoutFromCartUrl
        },
        addressForm: server.forms.getForm('address')
    });

    next();
});
server.extend(page);
server.append('MiniCartShow', csrfProtection.generateToken, function (req, res, next) {
    if (!isPaypalButtonEnabled('minicart')) {
        next();
        return;
    }

    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();

    if (!basket) {
        next();
        return;
    }

    var clientToken = braintreeApiCalls.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var defaultPaypalAddress = null;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        var paypalConfig = prefs.paypalMiniCartButtonConfig;
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken, paypalConfig);
        var customerPaypalInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        if (customerPaypalInstruments && customerPaypalInstruments.length > 0) {
            defaultPaypalAddress = customer.getAddressBook().getPreferredAddress();
            if (!empty(defaultPaypalAddress)) {
                paypalBillingAgreementFlow = true;
            }
        }
    } else {
        next();
        return;
    }

    res.setViewData({
        braintree: {
            payPalButtonConfig: payPalButtonConfig,
            paypalBillingAgreementFlow: paypalBillingAgreementFlow,
            staticImageLink: prefs.staticImageLink,
            checkoutFromCartUrl: prefs.checkoutFromCartUrl
        },
        addressForm: server.forms.getForm('address')
    });

    next();
});

module.exports = server.exports();

