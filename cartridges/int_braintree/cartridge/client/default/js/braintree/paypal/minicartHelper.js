'use strict';

var paypalHelper = require('./paypalHelper');
var payPal = require('../braintreePaypal');
var braintreeUtils = require('../braintreeUtils');
var paypalSavedAccountHandler = require('./paypalSavedAccountHandler');

var $paypalMinicartButton;

function miniCartButton() {
    document.querySelectorAll('.js_braintree_paypal_cart_button').forEach(function (el) {
        var $btn = el;
        if (JSON.parse($btn.getAttribute('data-is-inited'))) {
            return;
        }
        var config = JSON.parse($btn.getAttribute('data-braintree-config'));
        if (typeof config !== 'object' || config === null) {
            // eslint-disable-next-line no-console
            console.error(el, 'not valid data-braintree-config');
            return;
        }
        $paypalMinicartButton = document.querySelector('.paypalMinicartButton');
        if ($paypalMinicartButton && config.options.amount === 0) {
            $paypalMinicartButton.style.display = 'none';
        }
        config.paypalConfig = config.paypalConfig || {};

        config.onTokenizePayment = function (payload, btnInstance) {
            var that = btnInstance;
            var params = btnInstance.params;
            var postData = {
                braintreePaypalNonce: payload.nonce
            };

            if (params.riskData) {
                postData.braintreePaypalRiskData = params.riskData;
            }

            if (payload.details) {
                var details = payload.details;
                if (!details.billingAddress) {
                    that.er.show('Merchant PayPal account does not support the Billing Address retrieving. Contact PayPal for details on eligibility and enabling this feature.');

                    return;
                }
                var billingAddressData = paypalHelper.createBillingAddressData(details.billingAddress, details);
                postData.braintreePaypalBillingAddress = billingAddressData;
                var shippingAddressData = details.shippingAddress ? paypalHelper.createShippingAddressData(details.shippingAddress, details) : '{}';
                postData.braintreePaypalShippingAddress = shippingAddressData;
            }

            if (params.options.flow === 'vault' || (params.options.flow === 'checkout' && params.options.requestBillingAgreement)) {
                postData.braintreeSavePaypalAccount = 'true';
                postData.braintreePaypalAccountMakeDefault = 'true';
            }

            braintreeUtils.postData(params.paypalHandle, postData);
        };

        var paypalIns = payPal.init(config, $btn);

        function updateCartPaypalAmount() { // eslint-disable-line require-jsdoc
            paypalIns.loader.show();
            $.ajax({
                url: config.getOrderInfoUrl,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    paypalIns.loader.hide();
                    paypalIns.updateAmount(data.amount);
                },
                error: function () {
                    window.location.reload();
                }
            });
        }
        $('body').on('cart:update', function () {
            $paypalMinicartButton = document.querySelector('.paypalMinicartButton');
            var $totalPrice = document.querySelector('.sub-total');
            if ($paypalMinicartButton && $totalPrice) {
                var isZeroAmount = $totalPrice.innerHTML.substring(1) === '0.00';
                $paypalMinicartButton.style.display = isZeroAmount ? 'none' : '';
            }
        });

        $('body').on('braintree:updateCartTotals', updateCartPaypalAmount);
        $btn.setAttribute('data-is-inited', true);
    });
}

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length < 2) {
            return;
        }
        miniCartButton();
        var $staticPaypalButton = document.querySelector('.braintree-static-paypal-button');
        if ($staticPaypalButton) {
            $staticPaypalButton.addEventListener('click', paypalSavedAccountHandler.staticImageHandler);
        }
    });
});

module.exports = {
    miniCartButton,
    observer
};
