/* eslint-disable no-use-before-define */
'use strict';

/* global braintreeUtils braintree $ VenmoSession */
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');
var { isValidInputField } = require('./helper');
var scrollAnimate = require('../../../../../../app_storefront_base/cartridge/client/default/js/components/scrollAnimate');
const errorText = 'An error occurred. Please try again later or choose different payment method.';

var bu = braintreeUtils;
var loader;

function Constructor(initParams, $btn) {
    this.$btn = $btn;
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'lpm-error';
    var $loaderContainter = document.querySelector('.lpmLoader');
    loader = loaderInstance($loaderContainter);
    this.loader = loader;
    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);
    this.params = initParams;
    this.er = bu.createErrorInstance($errorContainer);
}

Constructor.prototype.createLocalPayment = function () {
    var that = this;
    var params = that.params;
    // Create a client.
    braintree.client.create({
        authorization: params.clientToken
    }).then(function (clientInstance) {
        // Create a local payment component.
        return braintree.localPayment.create({
            client: clientInstance
        });
    }).then(function (localPaymentInstance) {
        function createLocalPaymentClickListener(type) {
            var emailField = document.querySelector('#email');
            return function (event) {
                event.preventDefault();
                if (emailField && emailField.value !== '' && !isValidInputField(emailField)) {
                    that.loader.hide();
                    return;
                }

                that.loader.show();
                document.querySelector('.processingMsg').style.display = 'block';
                $.getJSON(that.params.getOrderInfoUrl)
                    .then(({ shippingAddress }) => {
                        const reqData = Object.assign(createRequestData(
                            shippingAddress, that.params, type),
                            { onPaymentStart: (_, start) => start() });
                        localPaymentInstance.startPayment(reqData).then(({ nonce, details }) => {
                            var processingMsg = document.querySelector('.processingMsg');
                            var finalProcessingMsg = document.querySelector('.finalProcessingMsg');
                            processingMsg.style.display = 'none';
                            finalProcessingMsg.style.display = 'block';
                            return $.ajax({
                                url: params.paymentConfirmUrl,
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    nonce: nonce,
                                    lpmName: type,
                                    details: details
                                })
                            });
                        }).then(({ redirectUrl }) => {
                            that.loader.hide();
                            window.location.href = redirectUrl;
                        }).catch(function () {
                            that.loader.hide();
                        });
                    })
                    .catch(function (err) {
                        if (err.responseText !== '') { errorText = err.responseText; }
                        that.loader.hide();
                        $('.error-message').show();
                        $('.error-message-text').text(errorText);
                        scrollAnimate($('.error-message'));
                    });
            };
        }
        var paymentMethod = that.$btn.dataset.localPaymentMethodName;
        that.$btn.addEventListener('click', createLocalPaymentClickListener(paymentMethod));
    });
};

function createRequestData(shippingData, params, type) {
    var recipientName = shippingData.recipientName.split(' ');
    shippingData.firstName = recipientName[0];
    shippingData.lastName = recipientName[1];
    return {
        paymentType: type,
        amount: params.options.amount,
        fallback: {
            url: params.fallbackUrl + '?lpmName=' + type,
            buttonText: 'Complete Payment'
        },
        currencyCode: params.options.currency,
        shippingAddressRequired: false,
        email: document.querySelector('#email').value,
        phone: shippingData && shippingData.phone,
        givenName: shippingData && shippingData.firstName,
        surname: shippingData && shippingData.lastName,
        address: {
            countryCode: shippingData && shippingData.countryCode
        }
    };
}

Constructor.prototype.updateShippingData = function () {
    var localIns = this;
    localIns.loader.show();
    return $.getJSON(localIns.params.getOrderInfoUrl);
};


Constructor.prototype.updateShippingAddress = function (data) {
    if (data) {
        var recipientName = data.recipientName.split(' ');
        data.firstName = recipientName[0];
        data.lastName = recipientName[1];
        this.shippingData = data;
    }
};

module.exports = {
    init: function (params, $btn) {
        bu.clientToken = params.clientToken;
        return new Constructor(params, $btn);
    }
};
