'use strict';

var {
    getPaypalCustomerPaymentInstrumentByEmail,
    getDefaultCustomerPaypalPaymentInstrument,
    getCustomerPaymentInstrument
} = require('~/cartridge/scripts/braintree/helpers/customerHelper');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData,
    updateShippingAddress,
    updateBillingAddress
} = require('~/cartridge/scripts/braintree/processors/processorHelper');
var {
    addDefaultShipping,
    getAmountPaid,
    deleteBraintreePaymentInstruments,
    getLogger,
    handleErrorCode
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');

var braintreeApiCalls = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
var prefs = require('~/cartridge/config/braintreePreferences');

var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @return {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
    }
    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);
    data.descriptor = {
        name: (!empty(prefs.paypalDescriptorName) ? prefs.paypalDescriptorName : '')
    };

    if (prefs.isPaypalFraudToolsEnabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    if (prefs.vaultMode) {
        data.options.addBillingAddress = true;
    }

    return data;
}

/**
 * Save PayPal account as Customer Payment Instrument for the current customer
 * @param {dw.order.Order} order Current order
 * @param {Object} paypalData Response data from API call
 */
function savePaypalAccount(order, paypalData) {
    var customerPaymentInstrument = null;
    var billingAddress = order.getBillingAddress();
    var billingAddressObject = {
        firstName: billingAddress.getFirstName(),
        lastName: billingAddress.getLastName(),
        countryCodeAlpha2: billingAddress.getCountryCode().value,
        locality: billingAddress.getCity(),
        streetAddress: billingAddress.getAddress1(),
        extendedAddress: billingAddress.getAddress2(),
        postalCode: billingAddress.getPostalCode(),
        region: billingAddress.getStateCode(),
        phone: billingAddress.getPhone()
    };

    try {
        Transaction.begin();
        customerPaymentInstrument = customer.getProfile().getWallet().createPaymentInstrument(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId);
        customerPaymentInstrument.setCreditCardType('visa'); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreePaypalAccountEmail = paypalData.payerEmail;
        customerPaymentInstrument.custom.braintreePaypalAccountAddresses = JSON.stringify(billingAddressObject);
        customerPaymentInstrument.creditCardToken = paypalData.token || paypalData.implicitlyVaultedPaymentMethodToken;
        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
        getLogger().error(error);
    }
    return;
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Current payment instrument
 * @param {Object} responseTransaction Response data from API call
 */
function saveTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction) {
    var riskData = responseTransaction.riskData;
    var customer = orderRecord.getCustomer();
    var isCustomerExistInVault = braintreeApiCalls.isCustomerExistInVault(customer);

    Transaction.wrap(function () {
        // Save token for lightning order managment
        var token = responseTransaction.paypal.token || responseTransaction.paypal.implicitlyVaultedPaymentMethodToken;
        if (token && empty(paymentInstrumentRecord.creditCardToken)) {
            paymentInstrumentRecord.creditCardToken = token;
        }

        saveGeneralTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction);

        if (riskData) {
            orderRecord.custom.braintreeFraudRiskData = riskData.decision;
            paymentInstrumentRecord.custom.braintreeFraudRiskData = riskData.decision;
        }

        if (isCustomerExistInVault) {
            customer.getProfile().custom.isBraintree = true;
        }
    });
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 */
function mainFlow(order, paymentInstrument) {
    var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
    var saleTransactionResponseData = braintreeApiCalls.call(saleTransactionRequestData);
    var paypalData = saleTransactionResponseData.transaction.paypal;
    saveTransactionData(order, paymentInstrument, saleTransactionResponseData.transaction);

    if (customer.authenticated && prefs.vaultMode) {
        var сustomerPaymentInstrument = getPaypalCustomerPaymentInstrumentByEmail(paypalData.payerEmail);
        if (paymentInstrument.custom.braintreeSaveCreditCard && !сustomerPaymentInstrument) {
            savePaypalAccount(order, paypalData);
        }

        if (paymentInstrument.custom.braintreeCreditCardMakeDefault) {
            var token = paypalData.token || paypalData.implicitlyVaultedPaymentMethodToken;
            braintreeApiCalls.makeDefaultPaypalAccount(сustomerPaymentInstrument ? сustomerPaymentInstrument.creditCardToken : token);
        }
    }

    Transaction.wrap(function () {
        paymentInstrument.custom.braintreeSaveCreditCard = null;
        paymentInstrument.custom.braintreeCreditCardMakeDefault = null;
    });
}

/**
 * Perform API call to create new(sale) transaction
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 */
function intentOrderFlow(order, paymentInstrument) {
    var paymentMethodToken = paymentInstrument.creditCardToken;
    if (!paymentMethodToken) {
        paymentMethodToken = braintreeApiCalls.createPaymentMethod(paymentInstrument.custom.braintreePaymentMethodNonce, order);
    }
    Transaction.wrap(function () {
        order.custom.isBraintree = true;
        order.custom.isBraintreeIntentOrder = true;
        paymentInstrument.custom.braintreeFraudRiskData = null;
        paymentInstrument.creditCardToken = paymentMethodToken;
    });
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} order Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @param {string} braintreeError Error text
 * @returns {Object} Error indicator
 */
function authorizeFailedFlow(order, paymentInstrument, braintreeError) {
    var profile = order.getCustomer().getProfile();
    Transaction.wrap(function () {
        order.custom.isBraintree = true;
        paymentInstrument.custom.braintreeFailReason = braintreeError;

        if (braintreeApiCalls.isCustomerExistInVault(customer)) {
            profile.custom.isBraintree = true;
        }
    });
    handleErrorCode();

    return { error: true };
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @param {boolean} fromCart indicator for cart checkout
 * @returns {Object} success object
 */
function handle(basket, fromCart) {
    var httpParameterMap = request.httpParameterMap;
    var braintreePaypalBillingAddress = httpParameterMap.braintreePaypalBillingAddress.stringValue;
    var braintreePaypalShippingAddress = httpParameterMap.braintreePaypalShippingAddress.stringValue;
    var isNewBilling = !empty(braintreePaypalBillingAddress) && braintreePaypalBillingAddress !== '{}';
    var isNewShipping = !empty(braintreePaypalShippingAddress) && braintreePaypalShippingAddress !== '{}';
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId).getPaymentProcessor();
    var paypalPaymentInstrument = null;
    var customerPaymentInstrument = null;
    var amount = getAmountPaid(basket);

    if (amount.value === 0) {
        return {
            fieldErrors: [],
            serverErrors: [Resource.msg('error.paypal.zeroamount', 'error', null)],
            error: true
        };
    }

    if (!empty(fromCart)) {
        addDefaultShipping(basket);
        customerPaymentInstrument = getDefaultCustomerPaypalPaymentInstrument();

        if (braintreePaypalBillingAddress) {
            session.privacy.btPaypalAccountEmail = JSON.parse(braintreePaypalBillingAddress).email;
        } else if (customerPaymentInstrument) {
            session.privacy.btPaypalAccountEmail = customerPaymentInstrument.custom.braintreePaypalAccountEmail;
        }
    }

    Transaction.wrap(function () {
        var methodName;
        if (!empty(fromCart)) {
            var paymentInstruments = basket.getPaymentInstruments();
            var iterator = paymentInstruments.iterator();
            var instument = null;
            while (iterator.hasNext()) {
                instument = iterator.next();
                basket.removePaymentInstrument(instument);
            }
            methodName = prefs.paymentMethods.BRAINTREE_PAYPAL.paymentMethodId;
        } else {
            deleteBraintreePaymentInstruments(basket);
            methodName = session.forms.billing.paymentMethod.value;
        }

        paypalPaymentInstrument = basket.createPaymentInstrument(methodName, getAmountPaid(basket));
        paypalPaymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
    });

    if (!empty(session.privacy.emailFromBillingPage)
        && basket.getCustomerEmail() !== session.privacy.emailFromBillingPage) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(session.privacy.emailFromBillingPage);
        });
    }
    var selectedPaypalAccountUuid = httpParameterMap.braintreePaypalAccountList.stringValue;
    var isUsedSavedPaypalMethod = selectedPaypalAccountUuid !== null && selectedPaypalAccountUuid !== 'newaccount' && (!httpParameterMap.braintreePaypalNonce || httpParameterMap.braintreePaypalNonce.stringValue === '');
    if (isUsedSavedPaypalMethod) {
        customerPaymentInstrument = getCustomerPaymentInstrument(selectedPaypalAccountUuid);
        if (!customerPaymentInstrument) {
            return { error: true };
        }
        Transaction.wrap(function () {
            paypalPaymentInstrument.creditCardToken = customerPaymentInstrument.creditCardToken;
            paypalPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreePaypalAccountMakeDefault.booleanValue;
        });
        updateBillingAddress(JSON.parse(customerPaymentInstrument.custom.braintreePaypalAccountAddresses), basket);

        return { success: true };
    }

    if (!httpParameterMap.braintreePaypalNonce || httpParameterMap.braintreePaypalNonce.stringValue === '') {
        return { error: true };
    }

    if (!basket) {
        return { error: true };
    }

    if (isNewShipping && !!basket.getProductLineItems().size()) {
        updateShippingAddress(braintreePaypalShippingAddress, basket.getDefaultShipment());
    }

    if (isNewBilling || !empty(fromCart)) {
        var newBilling;
        if (customerPaymentInstrument) {
            newBilling = JSON.parse(customerPaymentInstrument.custom.braintreePaypalAccountAddresses);
            newBilling.email = customerPaymentInstrument.custom.braintreePaypalAccountEmail;
        } else {
            newBilling = JSON.parse(braintreePaypalBillingAddress);
        }
        updateBillingAddress(newBilling, basket);
    }

    Transaction.wrap(function () {
        paypalPaymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreePaypalNonce.stringValue;
        paypalPaymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreePaypalRiskData.stringValue;
        paypalPaymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreePaypalAccountMakeDefault.booleanValue;
        paypalPaymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSavePaypalAccount.booleanValue;
        if (customerPaymentInstrument) {
            paypalPaymentInstrument.creditCardToken = customerPaymentInstrument.creditCardToken;
        }
        if (httpParameterMap.braintreePaypalEmail.stringValue) {
            paypalPaymentInstrument.custom.braintreePaypalEmail = httpParameterMap.braintreePaypalEmail.stringValue;
        }
    });

    return { success: true };
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstrument Instrument
 * @returns {Object} success object
 */
function authorize(orderNo, paymentInstrument) {
    var order = OrderMgr.getOrder(orderNo);

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        try {
            if (prefs.paypalOrderIntent) {
                intentOrderFlow(order, paymentInstrument);
            } else {
                mainFlow(order, paymentInstrument);
            }
        } catch (error) {
            getLogger().error(error);
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

exports.intentOrderFlow = intentOrderFlow;
exports.savePaypalAccount = savePaypalAccount;
exports.saveTransactionData = saveTransactionData;
exports.authorizeFailedFlow = authorizeFailedFlow;
exports.createSaleTransactionData = createSaleTransactionData;
exports.handle = handle;
exports.authorize = authorize;
