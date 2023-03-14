'use strict';

var page = module.superModule;
var server = require('server');

var { getCustomerPaymentInstruments } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    addDefaultShipping,
    isPaypalButtonEnabled
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var prefs = require('~/cartridge/config/braintreePreferences');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

/**
* Creates config button object for paypal
* @param {Basket} basket Basket Object
* @param {string} clientToken Braintree clientToken
* @returns {Object} button config object
*/
function createBraintreePayPalButtonConfig(basket, clientToken) {
    addDefaultShipping(basket);
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
            currency: basket.getCurrencyCode(),
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
        paypalConfig: prefs.paypalPdpButtonConfig,
        getOrderInfoUrl: URLUtils.url('Braintree-GetOrderInfo').toString()
    };

    return paypalButtonConfig;
}

server.extend(page);
server.append('Show', csrfProtection.generateToken, function (req, res, next) {
    var isSetProductType = !empty(res.getViewData().product.individualProducts);
    if (!isPaypalButtonEnabled('pdp') || isSetProductType) {
        next();
        return;
    }
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentOrNewBasket();

    var clientToken = braintreeApiCalls.getClientToken(basket.getCurrencyCode());
    var payPalButtonConfig = null;
    var paypalBillingAgreementFlow = null;
    var defaultPaypalAddress = null;

    if (prefs.paymentMethods.BRAINTREE_PAYPAL.isActive) {
        payPalButtonConfig = createBraintreePayPalButtonConfig(basket, clientToken);
        if (res.getViewData().product.price.sales) {
            payPalButtonConfig.options.amount = parseFloat(res.getViewData().product.price.sales.decimalPrice);
        }
        var customerPaypalInstruments = getCustomerPaymentInstruments(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        if (customerPaypalInstruments && customerPaypalInstruments.length > 0) {
            defaultPaypalAddress = customer.getAddressBook().getPreferredAddress();
            if (!empty(defaultPaypalAddress)) {
                paypalBillingAgreementFlow = true;
            }
        }
    }
    var braintree = {
        prefs: prefs,
        payPalButtonConfig: payPalButtonConfig,
        paypalBillingAgreementFlow: paypalBillingAgreementFlow,
        cartQuantity: basket.productQuantityTotal,
        staticImageLink: prefs.staticImageLink,
        checkoutFromCartUrl: prefs.checkoutFromCartUrl
    };
    res.setViewData({
        braintree: braintree,
        addressForm: server.forms.getForm('address')
    });

    next();
});


module.exports = server.exports();
