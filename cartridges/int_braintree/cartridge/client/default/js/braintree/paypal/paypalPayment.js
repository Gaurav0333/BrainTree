'use strict';
var paypalHelper = require('./paypalHelper');
var helper = require('../helper');
var payPal = require('../braintreePaypal');

var $paypalContent = document.querySelector('.js_braintree_paypalContent');
var $paypalButton = document.querySelector('.js_braintree_paypal_billing_button');
var $braintreePaypalAccountsList = document.querySelector('#braintreePaypalAccountsList');
var $braintreePaypalBillingAddressInput = document.querySelector('input[name=braintreePaypalBillingAddress]');
var $braintreePaypalShippingAddressInput = document.querySelector('input[name=braintreePaypalShippingAddress]');
var $braintreePaypalNonceInput = document.querySelector('input[name=braintreePaypalNonce]');
var $braintreePaypalEmail = document.querySelector('#braintreePaypalEmail');
var $braintreePaypalNonce = document.querySelector('#braintreePaypalNonce');

function makePaypalPayment(continueButton) {
    var config = JSON.parse($paypalButton.getAttribute('data-braintree-config'));
    var isSessionAccount = paypalHelper.getSessionAccountOption();
    var isSameSessionAccount = paypalHelper.getOptionByEmail();

    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($paypalButton, 'not valid data-braintree-config');
    }

    function hideShowButtons() {
        if ($braintreePaypalAccountsList.value === 'newaccount') {
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', true);
            continueButton.style.display = 'none';
            $paypalButton.style.display = '';
        } else {
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', false);
            continueButton.style.display = '';
            $paypalButton.style.display = 'none';
        }
    }

    if ($braintreePaypalAccountsList) {
        $braintreePaypalAccountsList.addEventListener('change', function () {
            hideShowButtons();
        });
    }

    // Getting same email option as session email, if any found
    if (JSON.parse($braintreePaypalAccountsList.dataset.customerAuthenticated) && isSessionAccount) {
        if (isSameSessionAccount) {
            isSameSessionAccount.style.display = 'none';
            if (isSessionAccount.classList.contains('used-paypal-account-hide')) {
                isSessionAccount.classList.add('used-paypal-account');
                isSessionAccount.classList.remove('used-paypal-account-hide');
            }
        }

        paypalHelper.setSessionAccountOptionDefault();
    }

    paypalHelper.initAccountListAndSaveFunctionality();

    config.onTokenizePayment = function (data) {
        if ($braintreePaypalNonceInput) {
            $braintreePaypalNonceInput.value = data.nonce;
        }
        $braintreePaypalNonce.value = data.nonce;
        document.querySelector('#braintreePaypalAccount').setAttribute('data-session-account', 'true');

        if (data.details) {
            var details = data.details;
            $braintreePaypalEmail.value = data.details.email;
            document.querySelector('#braintreePaypalAccount').value = data.details.email;
            document.querySelector('#braintreePaypalAccount').text = data.details.email;
            helper.continueButtonToggle(false);

            if (details.billingAddress) {
                var billingAddressData = paypalHelper.createBillingAddressData(details.billingAddress, details);
                if ($braintreePaypalBillingAddressInput) {
                    $braintreePaypalBillingAddressInput.value = billingAddressData;
                }
            }
            if (details.shippingAddress) {
                var shippingAddressData = paypalHelper.createShippingAddressData(details.shippingAddress, details);
                if ($braintreePaypalShippingAddressInput) {
                    $braintreePaypalShippingAddressInput.value = shippingAddressData;
                }
            }
            if ($braintreePaypalAccountsList && $braintreePaypalAccountsList.value === 'newaccount') {
                document.querySelector('.js_braintree_paypal_billing_button').style.display = 'none';
                var paypalAccount = document.querySelector('.form-group.braintree_used_paypal_account');
                var sessionAccount = document.querySelector('#braintreePaypalAccount');
                if (!paypalAccount.classList.contains('used-paypal-account')) {
                    paypalAccount.classList.remove('used-paypal-account-hide');
                    paypalAccount.classList.add('used-paypal-account');
                    sessionAccount.classList.remove('used-paypal-account-hide');
                    sessionAccount.classList.add('used-paypal-account');
                } else {
                    sessionAccount.classList.remove('used-paypal-account-hide');
                    sessionAccount.classList.add('used-paypal-account');
                }
            }
        }

        var newPPAccount = document.getElementById('newPPAccount');
        if (newPPAccount.selected) {
            newPPAccount.removeAttribute('selected');
            document.querySelector('#braintreePaypalAccount').selected = true;
        }

        // Getting same email option as session email, if any found
        if (JSON.parse($braintreePaypalAccountsList.dataset.customerAuthenticated) && paypalHelper.getSessionAccountOption()) {
            isSameSessionAccount = paypalHelper.getOptionByEmail();
            paypalHelper.setSessionAccountOptionDefault();

            if (isSameSessionAccount) {
                isSameSessionAccount.style.display = 'none';
                document.getElementById('braintreeSavePaypalAccount').value = false;
                document.getElementById('braintreePaypalAccountMakeDefault').value = false;
                document.querySelector('#braintreePaypalAccountMakeDefaultContainer').style.display = 'none';
                document.querySelector('#braintreeSavePaypalAccountContainer').style.display = 'none';
            } else {
                [].forEach.call(document.querySelector('#braintreePaypalAccountsList'), function (el) {
                    if (el.style.display === 'none') el.style.display = 'block';
                });
            }
        }

        paypalHelper.showPayPalAccount(data.details.email, data.nonce);
        continueButton.click();
    };

    config.paypalConfig = config.paypalConfig || {};
    config.paypalConfig.validate = function (validateActions) {
        paypalHelper.formValidationConrol(validateActions, true);
    };

    var paypalIns = payPal.init(config, $paypalButton);
    if (document.querySelector('.braintree_used_paypal_account').classList.contains('used-paypal-account')) {
        paypalHelper.showPayPalAccount(document.querySelector('#braintreePaypalEmail').value);
    }
    function updateAmountAndShippingData() { // eslint-disable-line require-jsdoc
        paypalIns.loader.show();
        $.ajax({
            url: config.getOrderInfoUrl,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                var $paypalAddress = document.querySelector('input[name=braintreePaypalShippingAddress]') !== '';
                paypalIns.loader.hide();
                paypalIns.updateAmount(data.amount);
                paypalIns.updateShippingAddress(data.shippingAddress);
                if ($paypalAddress.value) {
                    var newPayPalAddress = $.extend({}, JSON.parse($paypalAddress.value), data.shippingAddress);
                    $paypalAddress.value = JSON.stringify(newPayPalAddress);
                }
            },
            error: function () {
                window.location.reload();
            }
        });
    }

    $('body').on('checkout:updateCheckoutView', updateAmountAndShippingData);
    updateAmountAndShippingData();
}

module.exports = {
    makePaypalPayment
};
