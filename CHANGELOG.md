CHANGELOG
=========
## 18.2.1
* SFRA support up to 4.2.1 and SG up to 104.3.1

## 19.1.0
* Remove deprecated logs and move to LocalServiceRegistry

## 19.1.2
* SFRA support up to 4.4.0
* Added option to show PayPal button on PDP and minicart
* Added 3DS version 2
* Moved PayPal button and Hosted Fileds styling to local .js files
* Bug fixing in Braintree BM modules

## 20.1.0
* SFRA support up to 4.4.1 and SG to 105.0.0
* Add Venmo payment method
* Add bundled client side js for SFRA
* BM cartridge doesn't require storefront cartridge as dependency
* Replace most of jQuery usage to native functions
* Custom preferences are now cached with Custom Cache

## 20.2.0
* Update SFRA support to 5.0.1
* Update PayPal button to latest PayPal Smart Button. Please enter client id in Credential section.
* Remove SiteGenesis cartridge, SiteGenesis is no longer supported
* Add Local Payment Method payment method

## 20.2.1
* Add Google Pay payment method

## 20.2.2
* Update SFRA support to 5.1.0 only
* Add paypal_pay_later cartridge to enable Pay Later payment offer for PayPal Smart Button
* Reduce custom preferece number. Vault and Settle options is now single for all payment methods
* If Vault option is enabled all customer will be vaulted on Braintree side.
* PayPal Financial Options become separate cartridge
* Add bm_paypal_configuration cartridge to configure PayPal Smart Button and Pay Later banners from BM