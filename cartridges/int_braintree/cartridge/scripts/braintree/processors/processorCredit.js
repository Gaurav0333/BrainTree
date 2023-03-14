'use strict';

var Transaction = require('dw/system/Transaction');
var prefs = require('~/cartridge/config/braintreePreferences');

var {
    createAddressData,
    deleteBraintreePaymentInstruments,
    getNonGiftCertificateAmount,
    getLogger,
    handleErrorCode
} = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
var {
    OrderMgr,
    PaymentMgr,
    PaymentInstrument
} = require('dw/order');
var {
    saveGeneralTransactionData,
    createBaseSaleTransactionData
} = require('~/cartridge/scripts/braintree/processors/processorHelper');
var {
    call,
    isCustomerExistInVault,
    makeDefaultCreditCard
} = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');

/**
 * Perform API call to create new(sale) transaction
 * @param  {dw.order.Order} order Current order
 * @param  {dw.order.OrderPaymentInstrument} paymentInstrument Used payment instrument
 * @returns {Object} Response data from API call
 */
function createSaleTransactionData(order, paymentInstrument) {
    if (empty(paymentInstrument.custom.braintreePaymentMethodNonce) && empty(paymentInstrument.creditCardToken)) {
        throw new Error('paymentInstrument.custom.braintreePaymentMethodNonce or paymentInstrument.creditCardToken are empty');
    }
    var data = createBaseSaleTransactionData(order, paymentInstrument, prefs);

    data.descriptor = {
        name: (!empty(prefs.creditCardDescriptorName) ? prefs.creditCardDescriptorName : ''),
        phone: (!empty(prefs.creditCardDescriptorPhone) ? prefs.creditCardDescriptorPhone : ''),
        url: (!empty(prefs.creditCardDescriptorUrl) ? prefs.creditCardDescriptorUrl : '')
    };

    if (prefs.isFraudToolsEnabled) {
        data.deviceData = paymentInstrument.custom.braintreeFraudRiskData;
    }

    if (prefs.vaultMode) {
        data.options.addBillingAddress = true;
    }

    data.billing = createAddressData(order.getBillingAddress());

    data.is3dSecureRequired = paymentInstrument.custom.braintreeIs3dSecureRequired;

    return data;
}

/**
 * Write info about failed order into payment instrument, and mark customer as Braintree customer
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Used payment instrument
 * @param {string} braintreeError Error text
 * @return {Object} Error object indicator
 */
function authorizeFailedFlow(orderRecord, paymentInstrumentRecord, braintreeError) {
    var profile = orderRecord.getCustomer().getProfile();
    Transaction.wrap(function () {
        orderRecord.custom.isBraintree = true;
        paymentInstrumentRecord.custom.braintreeFailReason = braintreeError;
        paymentInstrumentRecord.custom.braintreeSaveCreditCard = null;
        paymentInstrumentRecord.custom.braintreeCreditCardMakeDefault = null;

        if (isCustomerExistInVault(customer)) {
            profile.custom.isBraintree = true;
        }

        handleErrorCode();
    });
    return { error: true };
}

/**
 * Save result of the success sale transaction
 * @param {dw.order.Order} orderRecord Current order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrumentRecord Current payment instrument
 * @param {Object} responseTransaction Response data from API call
 */
function saveTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction) {
    var customer = orderRecord.getCustomer();
    var riskData = responseTransaction.riskData;
    var threeDSecureInfo = responseTransaction.threeDSecureInfo;
    var creditCardData = responseTransaction.creditCard;
    var isCustomerInVault = isCustomerExistInVault(customer);

    Transaction.wrap(function () {
        // Save token for lightning order managment
        if (responseTransaction.creditCard.token && empty(paymentInstrumentRecord.creditCardToken)) {
            paymentInstrumentRecord.creditCardToken = responseTransaction.creditCard.token;
        }
        saveGeneralTransactionData(orderRecord, paymentInstrumentRecord, responseTransaction);

        if (riskData) {
            orderRecord.custom.braintreeFraudRiskData = riskData.decision;
            paymentInstrumentRecord.custom.braintreeFraudRiskData = riskData.decision;
        }

        paymentInstrumentRecord.custom.braintree3dSecureStatus = threeDSecureInfo ? threeDSecureInfo.status : null;

        if (isCustomerInVault) {
            customer.getProfile().custom.isBraintree = true;
        }

        if (!creditCardData) {
            return null;
        }
    });
}

/**
 * Save used credit cart as customers payment method
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Current payment instrument
 * @param {Object} saleTransactionResponseData Response data from API call
 */
function saveCustomerCreditCard(paymentInstrument, saleTransactionResponseData) {
    var customerWallet = customer.getProfile().getWallet();
    var card = {
        expirationMonth: saleTransactionResponseData.transaction.creditCard.expirationMonth,
        expirationYear: saleTransactionResponseData.transaction.creditCard.expirationYear,
        number: Date.now().toString().substr(0, 11) + saleTransactionResponseData.transaction.creditCard.last4,
        type: paymentInstrument.creditCardType,
        owner: paymentInstrument.creditCardHolder,
        paymentMethodToken: saleTransactionResponseData.transaction.creditCard.token
    };

    Transaction.wrap(function () {
        var customerPaymentInstrument = customerWallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);
        customerPaymentInstrument.setCreditCardHolder(card.owner);
        customerPaymentInstrument.setCreditCardNumber(card.number);
        customerPaymentInstrument.setCreditCardExpirationMonth(parseInt(card.expirationMonth, 10));
        customerPaymentInstrument.setCreditCardExpirationYear(parseInt(card.expirationYear, 10));
        customerPaymentInstrument.setCreditCardType(card.type);
        customerPaymentInstrument.creditCardToken = card.paymentMethodToken;
    });
}

/**
 * Create Braintree payment instrument and update shipping and billing address, if the new one was given
 * @param {Basket} basket Basket object
 * @returns {Object} success object
 */
function handle(basket) {
    var httpParameterMap = request.httpParameterMap;
    var selectedCreditCardUuid = httpParameterMap.braintreeCreditCardList.stringValue;
    var creditCardForm = session.forms.billing.creditCardFields;
    var paymentProcessor = PaymentMgr.getPaymentMethod(prefs.paymentMethods.BRAINTREE_CREDIT.paymentMethodId).getPaymentProcessor();
    var customerPaymentInstrument = null;
    var creditCard = null;
    var result = { error: true };
    var isbraintreePaymentMethodNonce = !httpParameterMap.braintreePaymentMethodNonce || httpParameterMap.braintreePaymentMethodNonce.stringValue === '';

    if (selectedCreditCardUuid && selectedCreditCardUuid !== 'newcard') {
        customerPaymentInstrument = require('~/cartridge/scripts/braintree/helpers/customerHelper').getCustomerPaymentInstrument(selectedCreditCardUuid);
    }

    if (customerPaymentInstrument) {
        creditCard = {
            type: customerPaymentInstrument.creditCardType,
            number: customerPaymentInstrument.creditCardNumber,
            owner: customerPaymentInstrument.creditCardHolder,
            token: customerPaymentInstrument.creditCardToken
        };

        if (httpParameterMap.braintreeIs3dSecureRequired.booleanValue && isbraintreePaymentMethodNonce) {
            return result;
        }
    } else {
        creditCard = {
            type: creditCardForm.cardType.value,
            number: creditCardForm.cardNumber.value,
            owner: creditCardForm.cardOwner.value,
            token: null
        };
        if (isbraintreePaymentMethodNonce) {
            return result;
        }
    }

    Transaction.wrap(function () {
        try {
            deleteBraintreePaymentInstruments(basket);
            var paymentInstrument = basket.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, getNonGiftCertificateAmount(basket));
            paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            paymentInstrument.creditCardType = creditCard.type;
            paymentInstrument.creditCardNumber = creditCard.number;
            paymentInstrument.creditCardHolder = creditCard.owner;

            if (creditCard.token) {
                paymentInstrument.creditCardToken = creditCard.token;
            }
            paymentInstrument.custom.braintreePaymentMethodNonce = httpParameterMap.braintreePaymentMethodNonce.stringValue;

            paymentInstrument.custom.braintreeFraudRiskData = httpParameterMap.braintreeDeviceData.stringValue;
            paymentInstrument.custom.braintreeCreditCardMakeDefault = httpParameterMap.braintreeCreditCardMakeDefault.booleanValue;
            paymentInstrument.custom.braintreeSaveCreditCard = httpParameterMap.braintreeSaveCreditCard.booleanValue;
            paymentInstrument.custom.braintreeIs3dSecureRequired = httpParameterMap.braintreeIs3dSecureRequired.booleanValue;

            result = { success: true };
        } catch (e) { result = { error: true }; }
    });

    return result;
}

/**
 * Authorize payment function
 * @param {string} orderNo Order Number
 * @param {Object} paymentInstr Instrument
 * @returns {Object} success object
 */
function authorize(orderNo, paymentInstr) {
    var order = OrderMgr.getOrder(orderNo);
    var paymentInstrument = paymentInstr;

    if (paymentInstrument && paymentInstrument.getPaymentTransaction().getAmount().getValue() > 0) {
        var saleTransactionResponseData = null;
        try {
            var saleTransactionRequestData = createSaleTransactionData(order, paymentInstrument);
            saleTransactionResponseData = call(saleTransactionRequestData);
            saveTransactionData(order, paymentInstrument, saleTransactionResponseData.transaction);
        } catch (error) {
            getLogger().error(error);
            return authorizeFailedFlow(order, paymentInstrument, error.customMessage ? error.customMessage : error.message);
        }

        if (paymentInstrument.custom.braintreeSaveCreditCard) {
            try {
                saveCustomerCreditCard(paymentInstrument, saleTransactionResponseData);
            } catch (error) {
                getLogger().error(error);
            }
            Transaction.wrap(function () {
                paymentInstrument.custom.braintreeSaveCreditCard = null;
            });
        }

        if (paymentInstrument.custom.braintreeCreditCardMakeDefault) {
            makeDefaultCreditCard(saleTransactionResponseData.transaction.creditCard.token);
            Transaction.wrap(function () {
                paymentInstrument.custom.braintreeCreditCardMakeDefault = null;
            });
        }
    } else {
        Transaction.wrap(function () {
            order.removePaymentInstrument(paymentInstrument);
        });
    }
    return { authorized: true };
}

exports.handle = handle;
exports.authorize = authorize;
exports.saveCustomerCreditCard = saveCustomerCreditCard;
exports.saveTransactionData = saveTransactionData;
exports.authorizeFailedFlow = authorizeFailedFlow;
exports.createSaleTransactionData = createSaleTransactionData;
