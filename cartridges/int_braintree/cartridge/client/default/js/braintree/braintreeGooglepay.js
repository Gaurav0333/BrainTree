'use strict';
var braintreeUtils = require('./braintreeUtils');
var loaderInstance = require('./loaderHelper');
/* global braintreeUtils braintree $ Googlepay */

var bu = braintreeUtils;
var loader;

function Constructor(initParams, $btn) {
    this.$btn = $btn;
    var $errorContainer = document.createElement('div');
    $errorContainer.className = 'error';
    var $loaderContainter = document.querySelector('.braintreeGooglepayLoader');
    loader = loaderInstance($loaderContainter);
    this.loader = loader;
    $btn.parentNode.insertBefore($errorContainer, $btn.nextSibling);
    this.params = initParams;
    this.er = bu.createErrorInstance($errorContainer);
}

Constructor.prototype.createGooglepay = function () {
    var that = this;
    var params = that.params;

    var paymentsClient = new google.payments.api.PaymentsClient({ // eslint-disable-line no-undef
        environment: 'TEST' // Or 'PRODUCTION'
    });

    braintree.client.create({
        authorization: params.clientToken
    }, function (clientErr, clientInstance) {
        if (clientErr) {
            that.er.show(clientErr);
            return;
        }
        braintree.googlePayment.create({
            client: clientInstance,
            googlePayVersion: 2
        }, function (googlePaymentErr, googlePaymentInstance) {
            if (googlePaymentErr) {
                that.er.show(googlePaymentErr);
                return;
            }
            var allowedPaymentMethods = googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods;
            paymentsClient.isReadyToPay({
                // see https://developers.google.com/pay/api/web/reference/object#IsReadyToPayRequest
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: allowedPaymentMethods
            }).then(function (response) {
                if (response.result) {
                    function onGooglePaymentButtonClicked() { // eslint-disable-line no-inner-declarations
                        loader.show();
                        var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
                            transactionInfo: {
                                currencyCode: params.options.currency,
                                totalPriceStatus: 'FINAL',
                                totalPrice: String(params.options.amount)
                            },
                            shippingAddressRequired: params.options.isShippingAddressRequired,
                            shippingAddressParameters: {
                                allowedCountryCodes: ['US'],
                                phoneNumberRequired: true
                            },
                            emailRequired: true
                        });
                        var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods[0];
                        cardPaymentMethod.parameters.billingAddressRequired = true;
                        cardPaymentMethod.parameters.billingAddressParameters = {
                            format: 'FULL',
                            phoneNumberRequired: true
                        };
                        paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
                            googlePaymentInstance.parseResponse(paymentData, function (err, result) {
                                if (err) {
                                    loader.hide();
                                    // Handle parsing error
                                }
                                params.onTokenizePayment(paymentData, result);
                            });
                            loader.hide();
                        }).catch(function (err) {
                            loader.hide();
                            // eslint-disable-next-line no-console
                            console.log(err);
                        });
                    }
                    const button = paymentsClient.createButton({ onClick: onGooglePaymentButtonClicked });
                    that.$btn.appendChild(button);
                    loader.hide();
                }
            }).catch(function (err) {
                loader.hide();
                // eslint-disable-next-line no-console
                console.log(err);
            });
        });
        // Set up other Braintree components
    });
};

Constructor.prototype.updateAmount = function (amount) {
    this.params.options.amount = amount;
};

module.exports = {
    init: function (params, $btn) {
        bu.clientToken = params.clientToken;
        return new Constructor(params, $btn);
    }
};
