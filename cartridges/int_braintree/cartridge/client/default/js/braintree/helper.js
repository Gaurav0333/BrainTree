'use strict';
var $continueButton = document.querySelector('button.submit-payment');

function initWathcherCartUpdate() {
    var $grantTotal = document.querySelector('.grand-total');
    if ($grantTotal) {
        var currentGrantTotalValue = $grantTotal.textContent;
        $('body').on('cart:update', function () {
            var newGrantTotalValue = $grantTotal.textContent;
            if (newGrantTotalValue !== '' && newGrantTotalValue !== currentGrantTotalValue) {
                currentGrantTotalValue = newGrantTotalValue;
                var updateCartTotals = document.createEvent('Event');
                updateCartTotals.initEvent('updateCartTotals', true, true);
                document.querySelector('body').addEventListener('updateCartTotals', function () {
                    'braintree:updateCartTotals';
                }, false);
                document.querySelector('body').dispatchEvent(updateCartTotals);
            }
        });
    }
}

function continueButtonToggle(flag) {
    var stage = window.location.hash.substring(1);
    if (stage !== 'placeOrder' && stage !== 'shipping' && stage !== null && stage !== '') {
        if (flag) {
            $continueButton.style.display = 'none';
        } else {
            $continueButton.style.display = '';
        }
    }
}


function paymentMethodChangeHandle(currentTab) {
    document.querySelectorAll('.payment-options[role=tablist] a[data-toggle="tab"]').forEach(function (el) {
        var $tabContent = document.querySelector(el.getAttribute('href'));

        if (el === currentTab) {
            $tabContent.querySelectorAll('input, textarea, select').forEach(function (tab) {
                tab.removeAttribute('disabled', 'disabled');
            });
            $tabContent.querySelectorAll('select.no-disable').forEach(function (tab) {
                tab.setAttribute('disabled', 'disabled');
            });
            continueButtonToggle(JSON.parse($tabContent.getAttribute('data-paypal-is-hide-continue-button')));
        } else {
            $tabContent.querySelectorAll('input, textarea, select').forEach(function (tab) {
                tab.setAttribute('disabled', 'disabled');
            });
        }
    });
}

function getPaymentMethodToLowerCase(paymentMethodName) {
    var paymentMethod = paymentMethodName.split('_');
    if (paymentMethod.length === 1) {
        return paymentMethodName;
    }
    paymentMethod.forEach(function (element, index) {
        paymentMethod[index] = element.charAt(0) + element.slice(1).toLocaleLowerCase();
    });
    return paymentMethod[1] ?
        paymentMethod[0] + ' ' + paymentMethod[1] :
        paymentMethod[0];
}

function updateCheckoutView(e, data) {
    var $paymentSummary = document.querySelector('.summary-details .braintree-payment-details');
    var htmlToAppend = '';
    var order = data.order;

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        htmlToAppend += '<div>' + getPaymentMethodToLowerCase(order.billing.payment.selectedPaymentInstruments[0].paymentMethod) + '</div>';
        if (order.billing.payment.selectedPaymentInstruments[0].creditCardNumber) {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].creditCardNumber + '</div>';
        }
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'GooglePay') {
            let gpCardDescription = document.querySelector('#braintreeGooglePayCardDescription');
            if (gpCardDescription && gpCardDescription.value) {
                let gpCardDescriptionData = gpCardDescription.value.split(' ');
                htmlToAppend += '<div>' + gpCardDescriptionData[0] + '....' + gpCardDescriptionData[1] + '</div>';
            }
        }
        if (order.billing.payment.selectedPaymentInstruments[0].type) {
            htmlToAppend += '<div>' + order.billing.payment.selectedPaymentInstruments[0].type + '</div>';
        }
        htmlToAppend += '<div>' + order.priceTotal.charAt(0) + order.billing.payment.selectedPaymentInstruments[0].amount + '</div>';
    }

    if ($paymentSummary) {
        $paymentSummary.innerHTML = htmlToAppend;
    }
}

function isValidInputField(field) {
    if (!field.checkValidity()) {
        if (!field.classList.contains('is-invalid')) {
            field.classList.add('is-invalid');
        }
        return false;
    }
    if (field.checkValidity() && field.classList.contains('is-invalid')) {
        field.classList.remove('is-invalid');
    }
    return true;
}
/*
    Adding *active* line to the tab-content class in a case if it isn't already active
    Use case: customer checkout from cart (page) and
    (under the place Order page) hit the 'edit' button
**/
function updatePaymentMethodTab() {
    let paymentMethodName = document.querySelectorAll('[data-braintree-payment-method]')[0].dataset.braintreePaymentMethod;
    let content = document.querySelector(`.js_braintree_${paymentMethodName.toLowerCase()}Content`).classList.contains('active');
    if (!content) {
        document.querySelectorAll(`[data-method-id=${paymentMethodName}]`)[0].children[0].click();
    }
}

/**
 * Gets Billing Address Form Values
 *
 * @returns {Object} with Billing Address
 */
function getBillingAddressFormValues() {
    return $('#dwfrm_billing').serialize().split('&')
        .map(function (el) {
            return el.split('=');
        })
        .reduce(function (accumulator, item) {
            var elem = item[0].lastIndexOf('_');
            if (elem < 0) {
                accumulator[item[0]] = item[1];
            } else {
                elem = item[0].substring(elem + 1);
                accumulator[elem] = item[1];
            }
            return accumulator;
        }, {});
}

module.exports = {
    initWathcherCartUpdate,
    paymentMethodChangeHandle,
    continueButtonToggle,
    updateCheckoutView,
    isValidInputField,
    updatePaymentMethodTab,
    getBillingAddressFormValues
};
