const chai = require('chai');
const request = require('request-promise');
const chaiSubset = require('chai-subset');
const { assert } = chai;
const { baseUrl, productId } = require('./it.config');
chai.use(chaiSubset);


describe('CheckoutServices-SubmitPayment', function () {
	
	describe('When credit card was used', function () {
		this.timeout(20000);

		it('should successfully add credit card method to a basket', function () {
			const cookieJar = request.jar();
			const myRequest = {
				url: '',
				method: 'POST',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/Cart-AddProduct',
				form: {
					pid: productId,
					quantity: 2
				}
			};

			// ----- Step 1 adding product to Cart
			return request(myRequest)
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					const reqData = Object.assign({}, myRequest);
					myRequest.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(myRequest);
				})
				// ----- Step 2 adding shipping address
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutShippingServices-SubmitShipping'
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						shipmentSelector: 'new',
						dwfrm_shipping_shippingAddress_addressFields_firstName: 'Rick',
						dwfrm_shipping_shippingAddress_addressFields_lastName: 'Flores',
						dwfrm_shipping_shippingAddress_addressFields_address1: '2253  Hudson Street',
						dwfrm_shipping_shippingAddress_addressFields_address2: '',
						dwfrm_shipping_shippingAddress_addressFields_country: 'US',
						dwfrm_shipping_shippingAddress_addressFields_states_stateCode: 'AS',
						dwfrm_shipping_shippingAddress_addressFields_city: 'Denver',
						dwfrm_shipping_shippingAddress_addressFields_postalCode: '80207',
						dwfrm_shipping_shippingAddress_addressFields_phone: '973-974-7269',
						dwfrm_shipping_shippingAddress_shippingMethodID: '012',
						dwfrm_billing_shippingAddressUseAsBillingAddress: 'true'
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					assert.equal(res.statusCode, 200, 'Expected CheckoutShippingServices-SubmitShipping statusCode to be 200.');
					reqData.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				// ----- Step 3 adding payment method
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutServices-SubmitPayment';
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						dwfrm_billing_addressFields_firstName: 'Rick',
						dwfrm_billing_addressFields_lastName: 'Flores',
						dwfrm_billing_addressFields_address1: '2253  Hudson Street',
						dwfrm_billing_addressFields_country: 'US',
						dwfrm_billing_addressFields_states_stateCode: 'CO',
						dwfrm_billing_addressFields_city: 'Denver',
						dwfrm_billing_addressFields_postalCode: '80207',
						isBraintree: 'true',
						dwfrm_billing_paymentMethod: 'CREDIT_CARD',
						dwfrm_billing_contactInfoFields_email: '3cd3ldtkdii@iffymedia.com',
						dwfrm_billing_contactInfoFields_phone: '973-974-7269',
						dwfrm_billing_creditCardFields_cardOwner: 'Rick Flores',
						dwfrm_billing_creditCardFields_cardType: 'Visa',
						braintreePaymentMethodNonce: 'fake-valid-nonce',
						braintreeIs3dSecureRequired: false
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const body = JSON.parse(res.body);
					assert.equal(res.statusCode, 200, 'Expected CheckoutServices-SubmitPayment request statusCode to be 200.');
					assert.equal(body.paymentMethod.value, 'CREDIT_CARD', 'Expected credit card payment to be in a basket.');
				})
		});
	});
	
	describe('When PayPal was used', function () {
		this.timeout(20000);
	
		it('should successfully add PayPal method to a basket', function () {
			const cookieJar = request.jar();
			const myRequest = {
				url: '',
				method: 'POST',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/Cart-AddProduct',
				form: {
					pid: productId,
					quantity: 2
				}
			};
	
			// ----- Step 1 adding product to Cart
			return request(myRequest)
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					const reqData = Object.assign({}, myRequest);
					myRequest.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(myRequest);
				})
				// ----- Step 2 adding shipping address
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutShippingServices-SubmitShipping'
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						shipmentSelector: 'new',
						dwfrm_shipping_shippingAddress_addressFields_firstName: 'Rick',
						dwfrm_shipping_shippingAddress_addressFields_lastName: 'Flores',
						dwfrm_shipping_shippingAddress_addressFields_address1: '2253  Hudson Street',
						dwfrm_shipping_shippingAddress_addressFields_address2: '',
						dwfrm_shipping_shippingAddress_addressFields_country: 'US',
						dwfrm_shipping_shippingAddress_addressFields_states_stateCode: 'AS',
						dwfrm_shipping_shippingAddress_addressFields_city: 'Denver',
						dwfrm_shipping_shippingAddress_addressFields_postalCode: '80207',
						dwfrm_shipping_shippingAddress_addressFields_phone: '973-974-7269',
						dwfrm_shipping_shippingAddress_shippingMethodID: '012',
						dwfrm_billing_shippingAddressUseAsBillingAddress: 'true'
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					assert.equal(res.statusCode, 200, 'Expected CheckoutShippingServices-SubmitShipping statusCode to be 200.');
					reqData.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				// ----- Step 3 adding payment method
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutServices-SubmitPayment';
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						dwfrm_billing_addressFields_firstName: 'Rick',
						dwfrm_billing_addressFields_lastName: 'Flores',
						dwfrm_billing_addressFields_address1: '2253  Hudson Street',
						dwfrm_billing_addressFields_country: 'US',
						dwfrm_billing_addressFields_states_stateCode: 'CO',
						dwfrm_billing_addressFields_city: 'Denver',
						dwfrm_billing_addressFields_postalCode: '80207',
						isBraintree: 'true',
						dwfrm_billing_paymentMethod: 'PayPal',
						dwfrm_billing_contactInfoFields_email: '3cd3ldtkdii@iffymedia.com',
						dwfrm_billing_contactInfoFields_phone: '973-974-7269',
						braintreePaymentMethodNonce: 'fake-valid-nonce',
						braintreeIs3dSecureRequired: false
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const body = JSON.parse(res.body);
					assert.equal(res.statusCode, 200, 'Expected CheckoutServices-SubmitPayment request statusCode to be 200.');
					assert.equal(body.paymentMethod.value, 'PayPal', 'Expected PayPal to be in a basket.');
				})
		});
	});

	describe('When ApplePay was used', function () {
		this.timeout(20000);
	
		it('should successfully add ApplePay method to a basket', function () {
			const cookieJar = request.jar();
			const myRequest = {
				url: '',
				method: 'POST',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/Cart-AddProduct',
				form: {
					pid: productId,
					quantity: 2
				}
			};
	
			// ----- Step 1 adding product to Cart
			return request(myRequest)
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					const reqData = Object.assign({}, myRequest);
					myRequest.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(myRequest);
				})
				// ----- Step 2 adding shipping address
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutShippingServices-SubmitShipping'
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						shipmentSelector: 'new',
						dwfrm_shipping_shippingAddress_addressFields_firstName: 'Rick',
						dwfrm_shipping_shippingAddress_addressFields_lastName: 'Flores',
						dwfrm_shipping_shippingAddress_addressFields_address1: '2253  Hudson Street',
						dwfrm_shipping_shippingAddress_addressFields_address2: '',
						dwfrm_shipping_shippingAddress_addressFields_country: 'US',
						dwfrm_shipping_shippingAddress_addressFields_states_stateCode: 'AS',
						dwfrm_shipping_shippingAddress_addressFields_city: 'Denver',
						dwfrm_shipping_shippingAddress_addressFields_postalCode: '80207',
						dwfrm_shipping_shippingAddress_addressFields_phone: '973-974-7269',
						dwfrm_shipping_shippingAddress_shippingMethodID: '012',
						dwfrm_billing_shippingAddressUseAsBillingAddress: 'true'
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					assert.equal(res.statusCode, 200, 'Expected CheckoutShippingServices-SubmitShipping statusCode to be 200.');
					reqData.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				// ----- Step 3 adding payment method
				.then(function (res) {
					const reqData = Object.assign({}, myRequest);
					const csrfJsonResponse = JSON.parse(res.body);
					reqData.url = baseUrl + '/CheckoutServices-SubmitPayment';
					reqData.form = {
						[csrfJsonResponse.csrf.tokenName]: csrfJsonResponse.csrf.token,
						dwfrm_billing_addressFields_firstName: 'Rick',
						dwfrm_billing_addressFields_lastName: 'Flores',
						dwfrm_billing_addressFields_address1: '2253  Hudson Street',
						dwfrm_billing_addressFields_country: 'US',
						dwfrm_billing_addressFields_states_stateCode: 'CO',
						dwfrm_billing_addressFields_city: 'Denver',
						dwfrm_billing_addressFields_postalCode: '80207',
						isBraintree: 'true',
						dwfrm_billing_paymentMethod: 'ApplePay',
						dwfrm_billing_contactInfoFields_email: '3cd3ldtkdii@iffymedia.com',
						dwfrm_billing_contactInfoFields_phone: '973-974-7269',
						braintreePaymentMethodNonce: 'fake-valid-nonce',
						braintreeIs3dSecureRequired: false
					};
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const body = JSON.parse(res.body);
					assert.equal(res.statusCode, 200, 'Expected CheckoutServices-SubmitPayment request statusCode to be 200.');
					assert.equal(body.paymentMethod.value, 'ApplePay', 'Expected ApplePay to be in a basket.');
				})
		});
	});

});

describe('Cart-Show', function () {
	describe('When cart page is showing', function () {
		this.timeout(20000);
	
		it('should create PayPal configuration with client token', function () {
			const cookieJar = request.jar();
			const myRequest = {
				url: '',
				method: 'POST',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/CSRF-Generate'
			};
			// ----- Step 1 Get CSRF token
			return request(myRequest)
				// ----- Step 2 Add product to cart
				.then(function () {
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Cart-AddProduct';
					reqData.form = {
						pid: productId,
						quantity: 2
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
					// ----- Step 2 Render cart page
				}).then(function () {
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Cart-Show';
					reqData.method = 'GET';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), myRequest.url));
					return request(reqData)
				}).then(function (res) {
					const html = res.body;
					assert.equal(res.statusCode, 200, 'Expected Cart-Show statusCode to be 200.');
					const isDataConfigCreated = html.indexOf('data-braintree-config') !== -1;
					const isClientTokenCreated = html.indexOf('clientToken') !== -1;
					const isPayPalButtonExist = html.indexOf('js_braintree_paypal_cart_button') !== -1;
					assert.isTrue(isDataConfigCreated, 'Expected to create data-braintree-config with paypal button configuration');
					assert.isTrue(isPayPalButtonExist, 'Expected to create PayPal button');
					assert.isTrue(isClientTokenCreated, 'Expected to create client token');
				});
		});
	});

	describe('When cart page is showing', function () {
		this.timeout(20000);
	
		it('should ApplePay configuration with client token ', function () {
			const cookieJar = request.jar();
			const myRequest = {
				url: '',
				method: 'POST',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/CSRF-Generate'
			};
			// ----- Step 1 Get CSRF token
			return request(myRequest)
				// ----- Step 2 Add product to cart
				.then(function () {
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Cart-AddProduct';
					reqData.form = {
						pid: productId,
						quantity: 2
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
					// ----- Step 2 Render cart page
				}).then(function () {
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Cart-Show';
					reqData.method = 'GET';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), myRequest.url));
					return request(reqData)
				}).then(function (res) {
					const html = res.body;
					assert.equal(res.statusCode, 200, 'Expected Cart-Show statusCode to be 200.');
					const isDataConfigCreated = html.indexOf('data-braintree-config') !== -1;
					const isClientTokenCreated = html.indexOf('clientToken') !== -1;
					const isPayPalButtonExist = html.indexOf('js_braintree_applepay_button') !== -1;
					assert.isTrue(isPayPalButtonExist, 'Expected to create ApplePay button');
					assert.isTrue(isDataConfigCreated, 'Expected to create data-braintree-config with ApplePay button configuration');
					assert.isTrue(isClientTokenCreated, 'Expected to create client token');
				});
		});
	});
});

