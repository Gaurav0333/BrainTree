'use strict';

var braintreeUtils = require('../braintreeUtils');
var loaderInstance = require('../loaderHelper');
var { showPDPButton, hidePDPButton } = require('./paypalHelper');

var $braintreePDPButton = document.querySelector('.braintree_pdp_button');

function staticImageHandler() {
    var $loaderContainter = document.querySelector('.braintreePayPalLoader');
    var loader = loaderInstance($loaderContainter);
    var $staticPaypalButton = document.querySelector('.braintree-static-paypal-button');
    var checkoutFromCartUrl = $staticPaypalButton.getAttribute('data-checkout-from-cart-url');
    loader.show();
    if ($braintreePDPButton && $braintreePDPButton.style.display === '') {
        var res = braintreeUtils.pdpOnlickForAsignedPaypalPayment();
        if (res.error) {
            loader.hide();
            // eslint-disable-next-line no-unused-expressions
            window.location.reload;
            return;
        }
    }

    return $.ajax({
        url: checkoutFromCartUrl,
        type: 'POST',
        success: function (data) {
            loader.hide();
            sessionStorage.setItem('pageState', 'cart');
            window.location.href = data.redirectUrl;
        },
        error: function () {
            loader.hide();
        }
    });
}

function paypalStaticPdpButtonHandler() {
    if ($braintreePDPButton) {
        var $price = document.querySelector('.price .sales .value');
        var isZeroAmount = false;
        var $miniCartQuantity = document.querySelector('.minicart-quantity');
        var $addToCartButton = document.querySelector('.add-to-cart') || document.querySelector('.add-to-cart-global');

        // Check minicart quantity and hide PDPbutton if it is not empty
        if (($miniCartQuantity && parseInt($miniCartQuantity.textContent, 0) > 0)
            || ($price && $price.getAttribute('content') === '0.00')) {  // Check if product price is zero
            hidePDPButton($braintreePDPButton);
        }

        if ($addToCartButton.disabled) {
            hidePDPButton($braintreePDPButton);
        }

        $('body').on('product:afterAddToCart', function () {
            hidePDPButton($braintreePDPButton);
        });

        $('body').on('cart:update', function () {
            $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
            if ($addToCartButton.disabled) {
                hidePDPButton($braintreePDPButton);
            }
            if ($miniCartQuantity === 0 && !$addToCartButton.disabled) {
                showPDPButton($braintreePDPButton);
            }
        });

        $('body').on('product:statusUpdate', function () {
            $miniCartQuantity = parseInt(document.querySelector('.minicart-quantity').textContent, 0);
            $price = document.querySelector('.price .sales .value');
            isZeroAmount = false;
            if ($price) {
                isZeroAmount = $price.getAttribute('content') === '0.00';
            }

            if ($miniCartQuantity === 0) {
                if ($addToCartButton.disabled || isZeroAmount) {
                    hidePDPButton($braintreePDPButton);
                }
                if (!$addToCartButton.disabled && !isZeroAmount) {
                    showPDPButton($braintreePDPButton);
                }
            }
        });
    }
}

module.exports = {
    staticImageHandler,
    paypalStaticPdpButtonHandler
};
