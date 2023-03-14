var creditContainer = document.querySelector('.js_paypal_category_credit_message');
if (creditContainer) {
    var clientToken = creditContainer.getAttribute('data-client-token');
    braintree.client.create({
        authorization: clientToken
    }).then(function (clientInstance) {
        return braintree.paypalCheckout.create({
            client: clientInstance
        });
    }).then(function (paypalCheckoutInstance) {
        paypalCheckoutInstance.loadPayPalSDK({
            components: 'messages'
        });
    });
}