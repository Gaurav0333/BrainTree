server.get(
    'AddCreditCard',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        if (prefs.is3DSecureEnabled) {
            res.redirect(URLUtils.url('Account-Show'));
            return next();
        }
        var paymentForm = server.forms.getForm('creditCard');
        paymentForm.clear();
        res.render('braintree/account/editAddCreditCard', {
            paymentForm: paymentForm,
            braintree: {
                prefs: prefs,
                hostedFieldsConfig: createHostedFieldsConfig(paymentForm)
            },
           
        });

        return next();
    }
);

module.exports = server.exports();
