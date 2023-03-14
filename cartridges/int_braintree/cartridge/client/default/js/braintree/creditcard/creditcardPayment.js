'use strict';

var braintreeUtils = require('../braintreeUtils');
var creditCard = require('../braintreeCreditCard');
var helper = require('../helper');

var $continueButton = document.querySelector('button.submit-payment');
var $creditCardList = document.querySelector('#braintreeCreditCardList');

function doNotAllowSubmitForm() {
    helper.continueButtonToggle(false);
    $continueButton.setAttribute('data-is-allow-submit-form', false);
}

function hide3DSecureContainer() {
    document.querySelector('#braintreeCreditCardFieldsContainer').style.display = '';
    document.querySelector('#braintreeSaveCardAndDefaultContainer').style.display = '';
    document.querySelector('#braintree3DSecureContainer').style.display = 'none';
    doNotAllowSubmitForm();
}

function allowSubmitForm(event) {
    $continueButton.setAttribute('data-is-allow-submit-form', true);
    event.target.click();
}

function isActiveCreditCardTab() {
    return document
        .querySelector('.payment-options[role=tablist] a[data-toggle="tab"][href="#creditcard-content"]')
        .classList
        .contains('active');
}

function makeCreditCardPayment(event) {
    if (!isActiveCreditCardTab()) {
        return;
    }

    if (JSON.parse($continueButton.getAttribute('data-is-allow-submit-form')) && creditCard.isFormValid()) {
        return;
    }

    if ($creditCardList) {
        var is3dSecureEnabled = JSON.parse(document.querySelector('.js_braintree_creditCardFields').getAttribute('data-braintree-config')).is3dSecureEnabled;
        if ($creditCardList && $creditCardList.value !== 'newcard') {
            if (!is3dSecureEnabled) {
                allowSubmitForm(event);
                return;
            }

            var selectedCard = braintreeUtils.getSelectedData($creditCardList);
            var getNonceUrl = $creditCardList.getAttribute('data-get-payment-nonce-url');
            var cardUUID = selectedCard['data-id'].value;
            $.get(`${getNonceUrl}?id=${cardUUID}`, function (responce) {
                creditCard.startTokenize(function (result) {
                    if (!result.error) {
                        allowSubmitForm(event);
                    }
                }, responce);
            });
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    }
    creditCard.startTokenize(function (result) {
        if (!result.error) allowSubmitForm(event);
    });
    event.preventDefault();
    event.stopPropagation();
}

module.exports = {
    doNotAllowSubmitForm,
    hide3DSecureContainer,
    makeCreditCardPayment
};
