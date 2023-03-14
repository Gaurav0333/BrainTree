# Braintree integration test

## Before runinng
To run integration test node version 8+ required. 
Install all dependencies from package.json in the root folder with `npm install` command

Add you sandbox credentials, url, code version in dw.json file in the root folder

On your sandbox create a customer and save paypal or credit card payment method.

Copy customer login, password and uuid from one of payment method saved in the previous step (from my account section) and fill test/int_braintree/integration/it.config.js with those values;

UUID can be taken from Braintree-PaymentInstruments endpoint with `$('.remove-payment').data('id')` code.

File  `test/int_braintree/integration/it.config.js` also contains option to test PayPal financial credit (default is false) and product id to test (default is false) sony-kdl-40w4100M.

## Test run
To run test use `npm run braintreeTest:integration`
