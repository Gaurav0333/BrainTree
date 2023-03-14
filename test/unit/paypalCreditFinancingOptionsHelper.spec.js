const { expect } = require('chai');
const { paypalCreditFinancingOptionsHelperPath } = require('./path');
const { stub } = require('sinon');
require('dw-api-mock/demandware-globals');

const getCalculatedFinancingOptions = stub();

const creditFinancialOptionsHelper = require('proxyquire').noCallThru()(paypalCreditFinancingOptionsHelperPath, {
    '../scripts/financialApi': {
        getCalculatedFinancingOptions
    },
    'dw/system/CacheMgr': {
        getCache: () => ({
            get: () => { },
            put: () => { }
        })
    }
});

describe('getAllOptions', function () {
    before(function () {
        getCalculatedFinancingOptions.returns({
            financing_options: [{
                3: [{
                    credit_financing: {
                        credit_type: 'US'
                    },
                    monthly_payment: {
                        value: 12
                    }
                }],
                6: [{
                    credit_financing: {
                        credit_type: 'US'
                    },
                    monthly_payment: {
                        value: 24
                    }
                }],
                12: [{
                    credit_financing: {
                        credit_type: 'UK'
                    },
                    monthly_payment: {
                        value: 6
                    }
                }]
            }]
        });
    });

    beforeEach(function () {
        session.privacy = {
            paypalFinancialOptions: {}
        };
    });

    describe('if creditType was sent', function () {
        let result;
        const expectedResult = [{
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 12 }
        },
        {
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 24 }
        }];
        before(function () {
            result = creditFinancialOptionsHelper.getAllOptions(100, 'USD', 'US', 'US');
        });

        it('should remove results that does not match creditType', function () {
            expect(result).to.deep.equals(expectedResult);
        });
    });
    describe('if creditType was not sent but cost is instance of Money', function () {
        let result;
        const expectedResult = [{
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 12 }
        },
        {
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 24 }
        }];
        before(function () {
            result = creditFinancialOptionsHelper.getAllOptions(new dw.value.Money(100, 'USD'), 'USD', 'US');
        });

        it('should remove results that does not match creditType from cost', function () {
            expect(result).to.deep.equals(expectedResult);
        });
    });
    describe('if creditType was not sent', function () {
        let result;
        const expectedResult = [{
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 12 }
        },
        {
            credit_financing: { credit_type: 'US' },
            monthly_payment: { value: 24 }
        },
        {
            credit_financing: { credit_type: 'UK' },
            monthly_payment: { value: 6 }
        }
        ];
        before(function () {
            result = creditFinancialOptionsHelper.getAllOptions(100, 'USD', 'US');
        });
        it('should return all options', function () {
            expect(result).to.deep.equals(expectedResult);
        });
    });
    describe('if no finantial option was in response', function () {
        let result;
        before(function () {
            getCalculatedFinancingOptions.returns({
                financing_options: []
            });
            result = creditFinancialOptionsHelper.getAllOptions(100, 'USD', 'US');
        });

        it('should return empty array', function () {
            expect(result).to.deep.equals([]);
        });
    });
});

describe('getLowestPossibleMonthlyCost', function () {
    before(function () {
        stub(creditFinancialOptionsHelper, 'getAllOptions')
            .withArgs(100, 'USD', 'US', 'INST')
            .returns([{
                credit_financing: { credit_type: 'US' },
                monthly_payment: { value: 12 }
            },
            {
                credit_financing: { credit_type: 'US' },
                monthly_payment: { value: 24 }
            }]);
        stub(dw.util.StringUtils, 'formatMoney').returns('USD 12');
    });

    after(function () {
        dw.util.StringUtils.formatMoney.restore();
        dw.util.Locale.getLocale.restore();
        creditFinancialOptionsHelper.getAllOptions.restore();
    });

    describe('if options is not empty array', function () {
        let result;
        before(function () {
            result = creditFinancialOptionsHelper.getLowestPossibleMonthlyCost(100, 'USD', 'US');
        });

        it('return value of lower cost option', function () {
            expect(result.value).to.be.equal(12);
        });
        it('return currency of lower cost option', function () {
            expect(result.currencyCode).to.be.equal('USD');
        });
        it('return formated lower cost option', function () {
            expect(result.formatted).to.be.equal('USD 12');
        });
    });

    describe('if options is not empty array no countryCode was provided', function () {
        let result;
        before(function () {
            stub(dw.util.Locale, 'getLocale').returns({
                country: 'US'
            });
            result = creditFinancialOptionsHelper.getLowestPossibleMonthlyCost(100, 'USD');
        });

        it('return value of lower cost option', function () {
            expect(result.value).to.be.equal(12);
        });
        it('return currency of lower cost option', function () {
            expect(result.currencyCode).to.be.equal('USD');
        });
        it('return formated lower cost option', function () {
            expect(result.formatted).to.be.equal('USD 12');
        });
    });
});

describe('getDataForAllOptionsBanner', function () {
    const expectedResult = {
        'options': {
            '3': {
                'term': 3,
                'apr': 2.22,
                'monthlyPayment': {
                    'value': 12,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'totalCost': {
                    'value': 1,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'purchaseCost': {
                    'value': 100,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'rawOptionData': {
                    'credit_financing': {
                        'credit_type': 'US',
                        'term': 3,
                        'apr': 2.22
                    },
                    'monthly_payment': {
                        'value': 12,
                        'currency_code': 'USD'
                    },
                    'total_cost': {
                        'value': 1,
                        'currency_code': 'USD'
                    }
                }
            },
            '6': {
                'term': 6,
                'apr': 3.33,
                'monthlyPayment': {
                    'value': 24,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'totalCost': {
                    'value': 2,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'purchaseCost': {
                    'value': 100,
                    'currencyCode': 'USD',
                    'formatted': 'USD 12'
                },
                'rawOptionData': {
                    'credit_financing': {
                        'credit_type': 'US',
                        'term': 6,
                        'apr': 3.33
                    },
                    'monthly_payment': {
                        'value': 24,
                        'currency_code': 'USD'
                    },
                    'total_cost': {
                        'value': 2,
                        'currency_code': 'USD'
                    }
                }
            }
        },
        'monthSet': [3, 6],
        'monthlyPaymentValueSet': [12, 24]
    };
    before(function () {
        stub(creditFinancialOptionsHelper, 'getAllOptions')
            .withArgs(100, 'USD', 'US', 'INST')
            .returns([{
                credit_financing: { credit_type: 'US', term: 3, apr: 2.22 },
                monthly_payment: { value: 12, currency_code: 'USD' },
                total_cost: { value: 1, currency_code: 'USD' }
            },
            {
                credit_financing: { credit_type: 'US', term: 6, apr: 3.33 },
                monthly_payment: { value: 24, currency_code: 'USD' },
                total_cost: { value: 2, currency_code: 'USD' }
            }]);
        stub(dw.util.StringUtils, 'formatMoney').returns('USD 12');
    });

    after(function () {
        dw.util.StringUtils.formatMoney.restore();
        creditFinancialOptionsHelper.getAllOptions.restore();
    });

    it('should return data for banner', function () {
        expect(creditFinancialOptionsHelper.getDataForAllOptionsBanner(100, 'USD', 'US')).to.deep.equal(expectedResult);
    });

});

