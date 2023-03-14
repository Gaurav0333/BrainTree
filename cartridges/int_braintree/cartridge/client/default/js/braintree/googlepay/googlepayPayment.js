'use strict';
var googlepay = require('../braintreeGooglepay');
var googlepayHelper = require('./googlepayHelper');

var $googlepayButton = document.querySelector('.js_braintree_googlepay_button');
var $googlepayContent = document.querySelector('.js_braintree_googlepayContent');
var $btGooglepayAccountsList = document.querySelector('#braintreeGooglepayAccountsList');
var $googlepayOnCart = document.querySelector('.braintree-cart-google-button');
var $googlepayNonce = document.querySelector('#braintreeGooglePayNonce');
var $googlepayCardDescription = document.querySelector('#braintreeGooglePayCardDescription');
var $braintreeGooglepayBillingAddressInput = document.querySelector('input[name=braintreeGooglePayBillingAddress]');
var $braintreeGooglepayShippingAddressInput = document.querySelector('input[name=braintreeGooglePayShippingAddress]');
var $braintreeGooglepayPaymentType = document.querySelector('#braintreeGooglepayPaymentType');

function makeGooglepayPayment(continueButton) {
    var googlepayIns;
    var config = JSON.parse($googlepayButton.getAttribute('data-braintree-config'));
    if (typeof config !== 'object' || config === null) {
        // eslint-disable-next-line no-console
        console.error($googlepayButton, 'not valid data-braintree-config');
    }

    if ($btGooglepayAccountsList) {
        $btGooglepayAccountsList.addEventListener('change', function () {
            googlepayHelper.hideShowButtons();
        });
        googlepayHelper.hideShowButtons();

        if ($googlepayCardDescription.value === 'GooglePay') {
            $googlepayCardDescription.value = $btGooglepayAccountsList.selectedOptions[0].label;
        }
    }

    config.onTokenizePayment = function (data, result) {
        var billingAddressData;
        var shippingAddressData;

        if (data) {
            billingAddressData = googlepayHelper.createGooglepayBillingAddressData(data);
            if ($braintreeGooglepayBillingAddressInput) {
                $braintreeGooglepayBillingAddressInput.value = billingAddressData;
            }

            if (data.shippingAddress) {
                shippingAddressData = googlepayHelper.createGooglepayShippingAddressData(data.shippingAddress);
                if ($braintreeGooglepayShippingAddressInput) {
                    $braintreeGooglepayShippingAddressInput.value = shippingAddressData;
                }
            }

            if ($googlepayOnCart) {
                $.ajax({
                    url: config.returnFromCartUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        nonce: result.nonce,
                        paymentCardDescription: result.details.cardType + ' ' + result.details.lastFour,
                        saveGpAccount: result.type === 'AndroidPayCard',
                        billingAddress: billingAddressData,
                        shippingAddress: shippingAddressData || {},
                        paymentType: result.type
                    }),
                    success: function (res) {
                        googlepayIns.loader.hide();
                        window.location.href = res.redirectUrl;
                    },
                    error: function () {
                        googlepayIns.loader.hide();
                    }
                });
                return;
            }
        }
        if ($googlepayNonce) {
            $googlepayNonce.value = result.nonce;
        }
        if ($googlepayCardDescription) {
            $googlepayCardDescription.value = result.details.cardType + ' ' + result.details.lastFour;
        }
        if ($braintreeGooglepayPaymentType) {
            $braintreeGooglepayPaymentType.value = result.type;
        }
        document.querySelector('#braintreeGooglepayAccount > option').text = $googlepayCardDescription.value;

        if ($googlepayContent.classList.contains('active')) {
            googlepayHelper.showGooglepayAccount();
        }
        continueButton.click();
    };

    googlepayIns = googlepay.init(config, $googlepayButton);
    googlepayIns.createGooglepay();

    function googlepayUpdateAmount() { // eslint-disable-line require-jsdoc
        googlepayIns.loader.show();
        $.ajax({
            url: config.getOrderInfoUrl,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                googlepayIns.loader.hide();
                googlepayIns.updateAmount(data.amount);
            },
            error: function () {
                window.location.reload();
            }
        });
    }

    $('body').on('checkout:updateCheckoutView', googlepayUpdateAmount);
    $('body').on('braintree:updateCartTotals', googlepayUpdateAmount);
    googlepayUpdateAmount();
}

module.exports = {
    makeGooglepayPayment
};
