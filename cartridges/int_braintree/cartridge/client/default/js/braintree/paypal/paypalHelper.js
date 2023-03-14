'use strict';
var braintreeUtils = require('../braintreeUtils');
var formValidationConrol = function (validateActions) {
    var isFormValid = true;
    if (isFormValid) {
        validateActions.enable();
    } else {
        validateActions.disable();
    }
};

function getSessionAccountOption() {
    return Array.apply(null, document.querySelector('#braintreePaypalAccountsList').options).find(function (el) {
        return el.id === 'braintreePaypalAccount' && JSON.parse(el.getAttribute('data-session-account'));
    });
}

function getOptionByEmail() {
    var sessionEmail = document.getElementById('braintreePaypalAccount').value || null;
    return Array.apply(null, document.querySelector('#braintreePaypalAccountsList').options).find(function (el) {
        return el.getAttribute('data-id') && sessionEmail && sessionEmail === el.text;
    });
}

function getOptionByDataDefault() {
    return Array.apply(null, document.querySelector('#braintreePaypalAccountsList').options).find(function (el) {
        return el.getAttribute('data-default') ? JSON.parse(el.getAttribute('data-default')) : false;
    });
}

function setSessionAccountOptionDefault() {
    var savedDefaultOption = getOptionByDataDefault();
    if (!savedDefaultOption) return;

    savedDefaultOption.selected = '';
    getSessionAccountOption().selected = 'selected';
}

function initAccountListAndSaveFunctionality() {
    var $accountsList = document.querySelector('#braintreePaypalAccountsList');
    var isUserHasSavedAccount = $accountsList.getAttribute('data-customer-has-saved-pp-account');
    var $savePaypalAccountCountainer = document.querySelector('#braintreeSavePaypalAccountContainer');
    var $savePaypalAccountCheckbox = document.querySelector('#braintreeSavePaypalAccount');
    var $paypalAccounMakeDefaultContainer = document.querySelector('#braintreePaypalAccountMakeDefaultContainer');
    var $paypalAccountMakeDefaultCheckbox = document.querySelector('#braintreePaypalAccountMakeDefault');
    var $alertInfo = document.getElementById('paypal-content').querySelectorAll('.alert-info')[0];

    function accountsListChange() { // eslint-disable-line require-jsdoc
        var isSameSessionAccount = getOptionByEmail();

        if (($accountsList.value === 'newaccount')) {
            $alertInfo.style.display = 'block';
            if ($savePaypalAccountCountainer) {
                $savePaypalAccountCountainer.style.display = '';
                $savePaypalAccountCheckbox.checked = true;
                $savePaypalAccountCheckbox.disabled = false;
            }
            if ($paypalAccounMakeDefaultContainer) {
                $paypalAccounMakeDefaultContainer.style.display = isUserHasSavedAccount === 'true' ? 'block' : 'none';

                if ($savePaypalAccountCheckbox.checked) {
                    $paypalAccountMakeDefaultCheckbox.disabled = false;
                }
            }
        } else if ($accountsList.selectedOptions[0].id === 'braintreePaypalAccount') {
            // Case when Session Email already saved under account
            if (isSameSessionAccount) {
                $paypalAccounMakeDefaultContainer.style.display = 'none';
                $savePaypalAccountCountainer.style.display = 'none';
                $savePaypalAccountCheckbox.checked = false;
                $paypalAccountMakeDefaultCheckbox.checked = false;
            } else if ($savePaypalAccountCountainer) {
                $savePaypalAccountCountainer.style.display = 'block';
                $savePaypalAccountCheckbox.checked = true;
                $savePaypalAccountCheckbox.disabled = false;
            }
        } else {
            $alertInfo.style.display = 'none';
            var selectedAccount = braintreeUtils.getSelectedData($accountsList);
            if (selectedAccount && $paypalAccounMakeDefaultContainer) {
                if (selectedAccount['data-default'].value === 'true') {
                    $paypalAccounMakeDefaultContainer.style.display = 'none';
                } else {
                    $paypalAccounMakeDefaultContainer.style.display = 'block';
                    $paypalAccountMakeDefaultCheckbox.disabled = false;
                }
            }
            if ($savePaypalAccountCountainer) {
                $savePaypalAccountCheckbox.checked = false;
                $savePaypalAccountCountainer.style.display = 'none';
            }
        }
    }

    if ($savePaypalAccountCheckbox) {
        $savePaypalAccountCheckbox.addEventListener('change', function () {
            if ($savePaypalAccountCheckbox.checked) {
                $paypalAccountMakeDefaultCheckbox.disabled = false;
                if (isUserHasSavedAccount === 'false') {
                    $paypalAccountMakeDefaultCheckbox.checked = true;
                }
            } else {
                $paypalAccountMakeDefaultCheckbox.disabled = true;
                $paypalAccountMakeDefaultCheckbox.checked = false;
            }
        });
    }
    if ($accountsList) {
        $accountsList.addEventListener('change', accountsListChange);
        accountsListChange();
    }
}

function createShippingAddressData(inpShippingAddress, details) {
    var shippingAddress = inpShippingAddress;
    if (!shippingAddress.recipientName) {
        shippingAddress.firstName = details.firstName;
        shippingAddress.lastName = details.lastName;
        shippingAddress.recipientName = details.firstName + ' ' + details.lastName;
    }
    shippingAddress.email = details.email;
    shippingAddress.phone = details.phone;
    shippingAddress.countryCodeAlpha2 = shippingAddress.countryCode;
    shippingAddress.streetAddress = shippingAddress.line1;
    shippingAddress.extendedAddress = shippingAddress.line2;
    shippingAddress.locality = shippingAddress.city;
    shippingAddress.region = shippingAddress.state;
    shippingAddress.postalCode = shippingAddress.postalCode;
    return JSON.stringify(shippingAddress);
}

function createBillingAddressData(inpBillingAddress, details) {
    var billingAddress = inpBillingAddress;
    billingAddress.firstName = details.firstName;
    billingAddress.lastName = details.lastName;
    billingAddress.email = details.email;
    billingAddress.phone = details.phone;
    billingAddress.countryCodeAlpha2 = billingAddress.countryCode;
    billingAddress.streetAddress = billingAddress.line1;
    billingAddress.extendedAddress = billingAddress.line2;
    billingAddress.locality = billingAddress.city;
    billingAddress.region = billingAddress.state;
    return JSON.stringify(billingAddress);
}

function appendToUrl(url, param) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(param).map(function (key) {
        return key + '=' + encodeURIComponent(param[key]);
    }).join('&');

    return newUrl;
}

function showPayPalAccount(braintreePaypalEmail, braintreePaypalNonce) {
    var braintreePaypalAccount = document.getElementById('braintreePaypalAccount');
    var paypalAccount = document.querySelector('.form-group.braintree_used_paypal_account');
    var $paypalContent = document.querySelector('.js_braintree_paypalContent');
    var $braintreePaypalAccountsList = document.getElementById('braintreePaypalAccountsList');
    var customerAuthenticated = JSON.parse($braintreePaypalAccountsList.dataset.customerAuthenticated);

    if (customerAuthenticated || (braintreePaypalEmail && braintreePaypalAccount.text !== 'PayPal')) {
        if (braintreePaypalNonce && $braintreePaypalAccountsList) {
            return true;
        }

        document.querySelectorAll('.js_braintree_paypalContent .custom-checkbox').forEach((el) => { el.style.display = 'none'; });
    }

    braintreePaypalAccount.text = braintreePaypalEmail;
    if (!paypalAccount.classList.contains('used-paypal-account')) {
        paypalAccount.classList.remove('used-paypal-account-hide');
        paypalAccount.classList.add('used-paypal-account');
    }

    document.querySelector('.js_braintree_paypal_billing_button').style.display = 'none';
    $paypalContent.setAttribute('data-paypal-is-hide-continue-button', false);
}

function showCartErrorMsg(message) {
    $('.checkout-btn').addClass('disabled');
    $('.cart-error').append(
        `<div class="alert alert-danger alert-dismissible valid-cart-error fade show cartError" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${message}
        </div>`
    );
    window.scrollTo(0, 0);
}

function showCheckoutErrorMsg(message) {
    document.querySelector('.error-message-text').textContent = '';
    document.querySelector('.error-message').style.display = 'block';
    document.querySelector('.error-message-text').append(message);
    window.scrollTo(0, 0);
}

function showPDPButton($braintreePDPButton) {
    $braintreePDPButton.style.display = '';
}

function hidePDPButton($braintreePDPButton) {
    $braintreePDPButton.style.display = 'none';
}

function isPaypalNonceExist() {
    var hasPaypalNonce = document.querySelector('#braintreePaypalNonce').value;
    var $paypalTab = document.querySelector('.paypal-tab');
    var isActivePaypalTab;
    if ($paypalTab) {
        isActivePaypalTab = $paypalTab.classList.contains('active');
    }
    return !isActivePaypalTab && hasPaypalNonce;
}
/*
    Check if paypal method was used and change appearance of paypal tab
**/
function updatePayPalAppearance() {
    var sessionOption = getSessionAccountOption();
    if (sessionOption) {
        var $paypalContent = document.querySelector('.js_braintree_paypalContent');
        document.querySelector('#braintreePaypalNonce').value = '';
        document.querySelector('#braintreePaypalAccount').selected = false;
        sessionOption.classList.add('used-paypal-account-hide');
        sessionOption.classList.remove('used-paypal-account');
        sessionOption.value = '';
        sessionOption.text = '';
        sessionOption.setAttribute('data-session-account', false);

        var defaultOption = getOptionByDataDefault();
        if (defaultOption) {
            defaultOption.selected = true;
            document.querySelector('#braintreePaypalAccountMakeDefaultContainer').style.display = 'none';
            document.querySelector('#braintreeSavePaypalAccountContainer').style.display = 'none';
            document.querySelector('.js_braintree_paypal_billing_button').style.display = 'none';
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', false);
        } else {
            $paypalContent.setAttribute('data-paypal-is-hide-continue-button', true);
            document.querySelector('.js_braintree_paypal_billing_button').style.display = 'block';
        }

        [].forEach.call(document.querySelector('#braintreePaypalAccountsList'), function (el) {
            if (el.style.display === 'none') el.style.display = 'block';
        });
    }
}

module.exports = {
    formValidationConrol,
    initAccountListAndSaveFunctionality,
    createShippingAddressData,
    createBillingAddressData,
    appendToUrl,
    showPayPalAccount,
    showCartErrorMsg,
    showCheckoutErrorMsg,
    showPDPButton,
    hidePDPButton,
    getOptionByEmail,
    getSessionAccountOption,
    getOptionByDataDefault,
    isPaypalNonceExist,
    updatePayPalAppearance,
    setSessionAccountOptionDefault
};
