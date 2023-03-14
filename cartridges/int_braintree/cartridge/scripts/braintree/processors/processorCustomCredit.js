'use strict';

var Transaction = require('dw/system/Transaction');
var prefs = require('~/cartridge/config/braintreePreferences');

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