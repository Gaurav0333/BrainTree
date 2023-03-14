'use strict';
var paypalHelper = require('./paypalHelper');
var payPal = require('../braintreePaypal');

var $braintreePaypalNonce = document.querySelector('#braintreePaypalNonce');

function submitAddPaypalAccountForm() {
    $('.js_braintree_addPaypalAccountForm').submit(function () {
        var $addPaypalAccountForm = $('.js_braintree_addPaypalAccountForm');
        var $braintreeFormErrorContainer = document.querySelector('#braintreeFormErrorContainer');
        $addPaypalAccountForm.spinner().start();
        $.ajax({
            url: $addPaypalAccountForm.attr('action'),
            type: 'post',
            dataType: 'json',
            data: $addPaypalAccountForm.serialize(),
            success: function (data) {
                $addPaypalAccountForm.spinner().stop();
                if (!data.success) {
                    $braintreeFormErrorContainer.textContent = data.error;
                    if (!$braintreeFormErrorContainer.hasChildNodes()) {
                        $braintreeFormErrorContainer.setAttribute('style', 'margin: 10px 0');
                    }
                } else {
                    location.href = data.redirectUrl;
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                $addPaypalAccountForm.spinner().stop();
            }
        });
        return false;
    });
}

function initAddPaypalAccount() {
    var $braintreePaypalEmail = document.querySelector('#braintreePaypalEmail');
    var $braintreePaypalBillingAddress = document.querySelector('#braintreePaypalBillingAddress');
    document.querySelectorAll('.js_braintree_accountPaypalButton').forEach(function (el) {
        document.querySelector('button[name=save]').setAttribute('style', 'filter: grayscale(70%)');
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

        var $errorContainer = document.querySelector('#braintreeFormErrorContainer');
        config.$loaderContainer = document.querySelector('#braintreePayPalAccLoader');
        config.$errorContainer = $errorContainer;
        config.onTokenizePayment = function (data) {
            function showAddedPayPalAccount() {
                var $savePayPalAccountBtn = document.querySelector('.savePayPalAccountBtn');
                document.querySelector('.js_braintree_accountPaypalButton').style.display = 'none';
                $errorContainer.setAttribute('style', 'margin: 0');
                document.querySelector('.paypal-account-email').textContent = data.details.email;
                $savePayPalAccountBtn.removeAttribute('disabled');
                $savePayPalAccountBtn.removeAttribute('style', 'filter: grayscale(70%)');
            }

            if ($braintreePaypalNonce) {
                $braintreePaypalNonce.value = data.nonce;
            }
            if (data.details) {
                var details = data.details;
                if ($braintreePaypalEmail) {
                    $braintreePaypalEmail.value = data.details.email;
                }
                if (details.billingAddress) {
                    var billingAddressData = paypalHelper.createBillingAddressData(details.billingAddress, details);
                    $braintreePaypalBillingAddress.value = billingAddressData;
                }
                if (details.email) {
                    showAddedPayPalAccount();
                }
                // 19.2.1 unnecessary code - shippingAddress is not written here
                // if (details.shippingAddress) {
                //     var shippingAddressData = paypalHelper.createShippingAddressData(details.shippingAddress, details);
                //     var $braintreePaypalShippingAddressInput = document.querySelector('input[name=braintreePaypalShippingAddress]');
                //     if ($braintreePaypalShippingAddressInput) {
                //         $braintreePaypalShippingAddressInput.value = shippingAddressData;
                //     }
                // }
            }
            $errorContainer.textContent = '';
        };
        payPal.init(config, $btn);
        $btn.setAttribute('data-is-inited', true);
        submitAddPaypalAccountForm();
    });
}

function removePaypalPayment(f) {
    f.preventDefault();
    $.ajax({
        url: f.target.getAttribute('data-remove-paypal-payment-url'),
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#uuid-' + data.UUID).remove();
            if (data.message) {
                var toInsert = '<div><h3>' +
                data.message +
                '</h3><div>';
                $('.paymentInstruments').after(toInsert);
            }
            if (data.newDefaultPaypalAccount) {
                $('#uuid-' + data.newDefaultPaypalAccount + ' .card-info-group').append('<p><b>(default)</b></p>');
            }
        },
        error: function (err) {
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            }
            $.spinner().stop();
        }
    });
}

$('.remove-paypal-payment').on('click', function (e) {
    e.preventDefault();
    let url = e.target.getAttribute('data-url') + '?UUID=' + e.target.getAttribute('data-id');
    $('.payment-to-remove').empty().append(e.target.getAttribute('data-card'));
    document.querySelector('.delete-confirmation-btn').setAttribute('data-remove-paypal-payment-url', url);

    $('.delete-confirmation-btn').on('click', removePaypalPayment);

    $('.modal#deletePaymentModal').on('hide.bs.modal', function () {
        $('.delete-confirmation-btn').off('click', removePaypalPayment);
    });
});
module.exports = {
    initAddPaypalAccount
};
