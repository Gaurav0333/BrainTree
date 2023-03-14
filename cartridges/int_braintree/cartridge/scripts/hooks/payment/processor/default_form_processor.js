'use strict';

/**
 * Gets email
 *
 * @param {Object} paymentForm - the payment form
 * @returns {string}  Current email
 */
function getEmail(paymentForm) {
    var selectedPaypalAccountUuid = request.httpParameterMap.braintreePaypalAccountList.stringValue;
    var selectedCreditCardUuid = request.httpParameterMap.braintreeCreditCardList.stringValue;
    var isUsedSavedPaypalMethod = selectedPaypalAccountUuid !== null && selectedPaypalAccountUuid !== 'newaccount' && (!request.httpParameterMap.braintreePaypalNonce || request.httpParameterMap.braintreePaypalNonce.stringValue === '');
    var isUsedSavedCardMethod = selectedCreditCardUuid !== null && selectedCreditCardUuid !== 'newcard';
    var email = paymentForm.contactInfoFields.email.value;
    session.privacy.emailFromBillingPage = paymentForm.contactInfoFields.email.value;

    if (isUsedSavedCardMethod || isUsedSavedPaypalMethod || customer.authenticated) {
        email = customer.getProfile().getEmail();
    } else if (paymentForm.paymentMethod.value === 'PayPal') {
        var braintreePaypalBillingAddress = request.httpParameterMap.braintreePaypalBillingAddress.stringValue;
        if (!empty(braintreePaypalBillingAddress) && braintreePaypalBillingAddress !== '{}') {
            var newBilling = JSON.parse(braintreePaypalBillingAddress);
            email = newBilling.email;
        }
    }
    return email;
}

/**
 * Default hook for following form processor's:
 * -ApplePay
 * -PayPal
 * -Venmo
 * -Credit
 * -GooglePay
 * Adding paymentMethod & email to viewData
 *
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    var viewData = viewFormData;
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };
    viewData.email = {
        value: getEmail(paymentForm)
    };

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
