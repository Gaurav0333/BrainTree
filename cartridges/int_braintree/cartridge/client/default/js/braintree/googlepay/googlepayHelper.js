'use strict';
var helper = require('../helper');

var $googlepayContent = document.querySelector('.js_braintree_googlepayContent');
var $btGooglepayAccountsList = document.querySelector('#braintreeGooglepayAccountsList');
var $googlepayButton = document.querySelector('.js_braintree_googlepay_button');
var $braintreeGooglepayAccount = document.getElementById('braintreeGooglepayAccount');
var $googlepayAccount = document.querySelector('.js_braintree_used_googlepay_account');

function showGooglepayAccount() {
    if (!$btGooglepayAccountsList) {
        $googlepayAccount.classList.remove('used-googlepay-account-hide');
        $braintreeGooglepayAccount.options[0].text = document.querySelector('#braintreeGooglePayCardDescription').value;
    }

    $googlepayButton.style.display = 'none';
    $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', false);
    helper.continueButtonToggle(false);
}

function hideShowButtons() {
    if ($btGooglepayAccountsList.value === 'newaccount') {
        $googlepayButton.style.display = 'block';
        helper.continueButtonToggle(true);
        $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', true);
    } else {
        $googlepayButton.style.display = 'none';
        helper.continueButtonToggle(false);
        $googlepayContent.setAttribute('data-paypal-is-hide-continue-button', false);
    }
}

function createGooglepayBillingAddressData(data) {
    var billingData = data.paymentMethodData.info.billingAddress;
    var billingAddress = {};
    billingAddress.recipientName = billingData.name;
    billingAddress.phone = billingData.phoneNumber;
    billingAddress.countryCodeAlpha2 = billingData.countryCode;
    billingAddress.streetAddress = billingData.address1;
    billingAddress.extendedAddress = billingData.address2;
    billingAddress.locality = billingData.locality;
    billingAddress.region = billingData.administrativeArea;
    billingAddress.postalCode = billingData.postalCode;
    billingAddress.email = data.email;
    return JSON.stringify(billingAddress);
}

function createGooglepayShippingAddressData(shippingData) {
    var shippingAddress = {};
    shippingAddress.recipientName = shippingData.name;
    shippingAddress.phone = shippingData.phoneNumber;
    shippingAddress.countryCodeAlpha2 = shippingData.countryCode;
    shippingAddress.streetAddress = shippingData.address1;
    shippingAddress.extendedAddress = shippingData.address2;
    shippingAddress.locality = shippingData.locality;
    shippingAddress.region = shippingData.administrativeArea;
    shippingAddress.postalCode = shippingData.postalCode;
    return JSON.stringify(shippingAddress);
}

module.exports = {
    showGooglepayAccount,
    hideShowButtons,
    createGooglepayBillingAddressData,
    createGooglepayShippingAddressData
};
