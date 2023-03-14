const chai = require('chai');
const request = require('request-promise');
const chaiSubset = require('chai-subset');
const { assert } = chai;
const {
	baseUrl,
	loginEmail,
	loginPassword,
	savedMethodUUID,
	productId
} = require('./it.config');
chai.use(chaiSubset);

describe('Braintree-GetPaymentMethodNonceByUUID', function () {
	describe('When payment method was saved to a user account', function () {
		this.timeout(20000);

		it('should return payment method nonce using saved method', function () {
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
			return request(myRequest)
				// ----- Step 1 Login
				.then(function (res) {
					const data = JSON.parse(res.body);
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Account-Login';
					reqData.form = {
						loginEmail,
						loginPassword,
						[data.csrf.tokenName]: data.csrf.token
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected Account-Login statusCode to be 200.');
					return request(myRequest);
				})
				// ----- Step 2 Get payment nonce
				.then(function (res) {
					const data = JSON.parse(res.body);
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Braintree-GetPaymentMethodNonceByUUID';
					reqData.form = {
						id: savedMethodUUID,
						[data.csrf.tokenName]: data.csrf.token
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const response = JSON.parse(res.body);
					const hasNonce = response.hasOwnProperty('nonce');
					assert.equal(res.statusCode, 200, 'Expected Braintree-GetPaymentMethodNonceByUUID statusCode to be 200.');
					assert.equal(response.action, 'Braintree-GetPaymentMethodNonceByUUID', 'Expected GetPaymentMethodNonceByUUID server action in response');
					assert.isTrue(hasNonce, 'Expected to return payment nonce');
				})
		});
	});
});

describe('Braintree-GetOrderInfo', function () {
	describe('getOrderInfo endpoint', function () {
		this.timeout(20000);

		it('should return info about shipping address and basket amount', function () {
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

			return request(myRequest)
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					const reqData = Object.assign({}, myRequest);
					myRequest.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(myRequest);
				})
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
					reqData.method = 'GET';
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					reqData.url = baseUrl + '/Braintree-GetOrderInfo';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const body = JSON.parse(res.body);
					assert.deepEqual(body, {
						'action': 'Braintree-GetOrderInfo',
						'queryString': '',
						'locale': 'en_US',
						'amount': 2609.22,
						'shippingAddress': {
							'recipientName': 'Rick Flores',
							'line1': '2253  Hudson Street',
							'countryCodeAlpha2': 'US',
							'line2': '',
							'city': 'Denver',
							"locality": "Denver",
							"region": "AS",
							'countryCode': 'US',
							'postalCode': '80207',
							'state': 'AS',
							'phone': '973-974-7269',
							"streetAddress": "2253  Hudson Street"
						}
					});
				});
		});
	});
});

describe('Braintree-GetOrderInfo', function () {
	describe('When saved PayPal method was used to checkout from cart', function () {
		this.timeout(20000);
		it('should add shipping data without redirecting to PayPal page', function () {
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
			return request(myRequest)
				// ----- Step 1 Login
				.then(function (res) {
					const data = JSON.parse(res.body);
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/Account-Login';
					reqData.form = {
						loginEmail,
						loginPassword,
						[data.csrf.tokenName]: data.csrf.token
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
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
					return request(reqData);
				})
				.then(function () {
					const reqData = Object.assign({}, myRequest);
					reqData.url = baseUrl + '/CSRF-Generate';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
					// ----- Step 3 Add shipping data
				}).then(function (res) {
					const data = JSON.parse(res.body);
					const reqData = Object.assign({}, myRequest);
					reqData.method = 'POST';
					reqData.url = baseUrl + '/Braintree-EditDefaultShippinAddressHandle';
					reqData.form = {
						'dwfrm_address_firstName': 'Rick',
						'dwfrm_address_lastName': 'Flores',
						'dwfrm_address_address1': '2253  Hudson Street',
						'dwfrm_address_country': 'US',
						'dwfrm_address_states_stateCode': 'CO',
						'dwfrm_address_city': 'Denver',
						'dwfrm_address_postalCode': '80207',
						'dwfrm_address_phone': '973-974-7269',
						[data.csrf.tokenName]: data.csrf.token
					};
					reqData.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				// ----- Step 4 get basket data
				.then(function (res) {
					assert.equal(res.statusCode, 200, 'Expected Braintree-EditDefaultShippinAddressHandle statusCode to be 200.');
					const reqData = Object.assign({}, myRequest);
					reqData.method = 'GET';
					assert.equal(res.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
					reqData.url = baseUrl + '/Braintree-GetOrderInfo';
					cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
					return request(reqData);
				})
				.then(function (res) {
					const body = JSON.parse(res.body);
					assert.deepEqual(body.shippingAddress, {
						'recipientName': 'Rick Flores',
						'line1': '2253  Hudson Street',
						'countryCodeAlpha2': 'US',
						'line2': '',
						'city': 'Denver',
						"locality": "Denver",
						"region": "CO",
						'countryCode': 'US',
						'postalCode': '80207',
						'state': 'CO',
						'phone': '973-974-7269',
						"streetAddress": "2253  Hudson Street"
					});
				});
		});
	});
});
