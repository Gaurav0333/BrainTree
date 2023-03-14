const chai = require('chai');
const request = require('request-promise');
const chaiSubset = require('chai-subset');
const { assert } = chai;
const { baseUrl, testPaypalFinancial } = require('./it.config');
chai.use(chaiSubset);

if (testPaypalFinancial) {
	describe('When called GetLowestPossibleMonthlyCost', function () {
		this.timeout(20000);

		it('should return object with financial options', function () {
			var cookieJar = request.jar();
			var myRequest = {
				url: '',
				method: 'GET',
				rejectUnauthorized: false,
				resolveWithFullResponse: true,
				jar: cookieJar,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				},
				url: baseUrl + '/PaypalCreditFinancingOptions-GetLowestPossibleMonthlyCost?value=75&currencyCode=USD&countryCode=US'
			};
			return request(myRequest)
				.then(function (res) {
					var body = JSON.parse(res.body);
					var hasLabel = body.hasOwnProperty('labelText');
					var hasValue = body.hasOwnProperty('value');
					assert.equal(res.statusCode, 200, 'Expected PaypalCreditFinancingOptions-GetLowestPossibleMonthlyCost statusCode to be 200.');
					assert.equal(body.currencyCode, 'USD', 'Expected to return USD currency');
					assert.isTrue(hasLabel, 'Expected to return label with option text');
					assert.isTrue(hasValue, 'Expected to return option value');
				});
		});
	});


	describe('PaypalCreditFinancingOptions-GetAllOptionsData', function () {
		describe('When payment method was saved', function () {
			this.timeout(20000);

			it('should get payment nonce using saved payment method', function () {
				var cookieJar = request.jar();
				var myRequest = {
					url: '',
					method: 'GET',
					rejectUnauthorized: false,
					resolveWithFullResponse: true,
					jar: cookieJar,
					headers: {
						'X-Requested-With': 'XMLHttpRequest'
					},
					url: baseUrl + '/PaypalCreditFinancingOptions-GetAllOptionsData?value=75&currencyCode=USD&countryCode=US'
				};
				// ----- Step 1 Get CSRF token
				return request(myRequest)
					.then(function (res) {
						var body = JSON.parse(res.body);
						var hasOptions = body.hasOwnProperty('options');
						var hasMonthSet = body.hasOwnProperty('monthSet');
						var hasMonthlyPaymentValueSet = body.hasOwnProperty('monthlyPaymentValueSet');
						var hasLowerCostPerMonth = body.hasOwnProperty('lowerCostPerMonth');
						assert.equal(res.statusCode, 200, 'Expected PaypalCreditFinancingOptions-GetLowestPossibleMonthlyCost statusCode to be 200.');
						assert.isTrue(hasOptions, 'Expected to return options');
						assert.isTrue(hasMonthSet, 'Expected to return monthSet array');
						assert.isTrue(hasMonthlyPaymentValueSet, 'Expected to return monthlyPaymentValueSet');
						assert.isTrue(hasLowerCostPerMonth, 'Expected to return lowerCostPerMonth');
						assert.equal(body.lowerCostPerMonth.currencyCode, 'USD', 'Expected to return USD currency');
					});
			});
		});
	});
}
