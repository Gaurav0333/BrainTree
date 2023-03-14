var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');
var prefs = require('~/cartridge/config/braintreePreferences');

/**
 * Parse customer name from single string
 * @param {string} name name string
 * @return {Object} name object
 */
function createFullName(name) {
    var nameNoLongSpaces = name.trim().replace(/\s+/g, ' ').split(' ');
    if (nameNoLongSpaces.length === 1) {
        return {
            firstName: name,
            secondName: null,
            lastName: null
        };
    }
    var firstName = nameNoLongSpaces.shift();
    var lastName = nameNoLongSpaces.pop();
    var secondName = nameNoLongSpaces.join(' ');
    return {
        firstName: firstName,
        secondName: secondName.length ? secondName : null,
        lastName: lastName
    };
}

/**
 * Returns a prepared custom fields string
 * @param {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @return {string} custom fields string
 */
function getCustomFields(order, paymentInstrument) {
    var paymentProcessorId = paymentInstrument.getPaymentTransaction().getPaymentProcessor().ID;
    var prefsCustomFields = prefs.customFields;
    var hookMethodName = paymentProcessorId.split('_')[1].toLowerCase();

    var cfObject = {};
    for (var fName in prefsCustomFields) {
        var fArr = prefsCustomFields[fName].split(':');
        cfObject[fArr[0]] = fArr[1];
    }
    if (HookMgr.hasHook('braintree.customFields')) {
        var cfs = HookMgr.callHook('braintree.customFields', hookMethodName, { order: order, paymentInstrument: paymentInstrument });
        for (var field in cfs) {
            cfObject[field] = cfs[field];
        }
    }
    var resultStr = '';
    for (var field2 in cfObject) {
        resultStr += '<' + field2 + '>' + cfObject[field2] + '</' + field2 + '>';
    }
    return resultStr;
}

/**
 * Return boolean Token Exists value
 * @param  {boolean} isCustomerExistInVault customer vault
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument current payment instrument
 * @returns {boolean} Token Exist
 */
function isTokenExists(isCustomerExistInVault, paymentInstrument) {
    var isTokenAllowed = isCustomerExistInVault &&
        paymentInstrument.creditCardToken &&
        !paymentInstrument.custom.braintreeIs3dSecureRequired;
    return isTokenAllowed || !paymentInstrument.custom.braintreePaymentMethodNonce;
}

/** Returns a three-letter abbreviation for this Locale's country, or an empty string if no country has been specified for the Locale
 *
 * @param {string} localeId locale id
 * @return {string} a three-letter abbreviation for this lLocale's country, or an empty string
 */
function getISO3Country(localeId) {
    return require('dw/util/Locale').getLocale(localeId).getISO3Country();
}

/**
 * Create customer data for API call
 * @param {dw.order.Order} order Order object
 * @return {Object} Customer data for request
 */
function createGuestCustomerData(order) {
    var billingAddress = order.getBillingAddress();
    var shippingAddress = order.getDefaultShipment().getShippingAddress();
    return {
        id: null,
        firstName: billingAddress.getFirstName(),
        lastName: billingAddress.getLastName(),
        email: order.getCustomerEmail(),
        phone: billingAddress.getPhone() || shippingAddress.getPhone(),
        company: '',
        fax: ''
    };
}


/**
 * Create customer data for API call
 * @param {dw.order.Order} order Order object
 * @return {Object} Customer data for request
 */
function createRegisteredCustomerData(order) {
    var billingAddress = order.getBillingAddress();
    var shippingAddress = order.getDefaultShipment().getShippingAddress();
    var profile = customer.getProfile();
    var {
        createCustomerId,
        getPhoneFromProfile
    } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
    return {
        id: createCustomerId(customer),
        firstName: profile.getFirstName(),
        lastName: profile.getLastName(),
        email: profile.getEmail(),
        phone: getPhoneFromProfile(profile) || billingAddress.getPhone() || shippingAddress.getPhone(),
        company: profile.getCompanyName(),
        fax: profile.getFax()
    };
}

/**
 * isCountryCodesUpperCase()
 * true - if SiteGenesis uses uppercase for country code values
 * false - if SiteGenesis uses lowercase for country code values
 *
 * @returns {boolean} is country upper case
 */
function isCountryCodesUpperCase() {
    var countryOptions = null;
    var billingForm = session.forms.billing;
    var isCountryUpperCase = true;
    if (billingForm && billingForm.billingAddress && billingForm.billingAddress.addressFields && billingForm.billingAddress.addressFields.country) {
        countryOptions = billingForm.billingAddress.addressFields.country.getOptions();
        for (var optionName in countryOptions) {
            var option = countryOptions[optionName];
            if (option.value && option.value.trim() !== '' && option.value === option.value.toLowerCase()) {
                isCountryUpperCase = false;
                break;
            }
        }
    }
    return isCountryUpperCase;
}

/**
 * Update Billing Address
 * @param  {Object} newBillingAddress new billing address
 * @param  {dw.order.Basket} basket - Current users's basket
 */
function updateBillingAddress(newBillingAddress, basket) {
    var fullName = {};
    var countryCode = isCountryCodesUpperCase() ?
        newBillingAddress.countryCodeAlpha2.toUpperCase() :
        newBillingAddress.countryCodeAlpha2.toLowerCase();
    if (newBillingAddress.recipientName) {
        fullName = createFullName(newBillingAddress.recipientName);
    } else if (newBillingAddress.firstName && newBillingAddress.lastName) {
        fullName.firstName = newBillingAddress.firstName;
        fullName.lastName = newBillingAddress.lastName;
    }
    Transaction.wrap(function () {
        var billing = basket.getBillingAddress() || basket.createBillingAddress();
        billing.setCountryCode(countryCode);
        billing.setCity(newBillingAddress.locality || '');
        billing.setAddress1(newBillingAddress.streetAddress || '');
        billing.setAddress2(newBillingAddress.extendedAddress || '');
        billing.setPostalCode(newBillingAddress.postalCode || '');
        billing.setStateCode(newBillingAddress.region || '');
        billing.setPhone(newBillingAddress.phone || '');
        if (!empty(newBillingAddress.email)) {
            basket.setCustomerEmail(newBillingAddress.email);
        }
        if (!empty(fullName.firstName)) {
            billing.setFirstName(fullName.firstName || '');
        }
        if (!empty(fullName.secondName)) {
            billing.setSecondName(fullName.secondName || '');
        }
        if (!empty(fullName.lastName)) {
            billing.setLastName(fullName.lastName || '');
        }
    });
}

/**
 * Update Shipping Address
 * @param  {Object} braintreeShippingAddress - shipping address
 * @param  {dw.order.Basket} orderShippingAddress basket - Current users's basket Default Shipment
 */
function updateShippingAddress(braintreeShippingAddress, orderShippingAddress) {
    var fullName = {};
    var shipping;
    var newShipping = typeof braintreeShippingAddress === 'string' ? JSON.parse(braintreeShippingAddress) : braintreeShippingAddress;
    var countryCode = isCountryCodesUpperCase() ?
        newShipping.countryCodeAlpha2.toUpperCase() :
        newShipping.countryCodeAlpha2.toLowerCase();
    if (newShipping.recipientName) {
        fullName = createFullName(newShipping.recipientName);
    } else if (newShipping.firstName && newShipping.lastName) {
        fullName.firstName = newShipping.firstName;
        fullName.lastName = newShipping.lastName;
    }
    Transaction.wrap(function () {
        shipping = orderShippingAddress.getShippingAddress() || orderShippingAddress.createShippingAddress();
        shipping.setCountryCode(countryCode);
        shipping.setCity(newShipping.locality || '');
        shipping.setAddress1(newShipping.streetAddress || '');
        shipping.setAddress2(newShipping.extendedAddress || '');
        shipping.setPostalCode(newShipping.postalCode || '');
        shipping.setStateCode(newShipping.region || '');
        shipping.setPhone(newShipping.phone || '');

        if (!empty(fullName.firstName)) {
            shipping.setFirstName(fullName.firstName || '');
        }
        if (!empty(fullName.secondName)) {
            shipping.setSecondName(fullName.secondName || '');
        }
        if (!empty(fullName.lastName)) {
            shipping.setLastName(fullName.lastName || '');
        }
    });
}

/**
 * Save General Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param  {Object} responseTransaction - response transaction
 */
function saveGeneralTransactionData(order, paymentInstrument, responseTransaction) {
    var Money = require('dw/value/Money');
    var PT = require('dw/order/PaymentTransaction');
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    paymentTransaction.setTransactionID(responseTransaction.id);
    paymentTransaction.setAmount(new Money(responseTransaction.amount, order.getCurrencyCode()));

    order.custom.isBraintree = true;
    order.custom.braintreePaymentStatus = responseTransaction.status;

    paymentInstrument.custom.braintreePaymentMethodNonce = null;

    if (responseTransaction.type === 'sale' && responseTransaction.status === 'authorized') {
        paymentTransaction.setType(PT.TYPE_AUTH);
    } else if (responseTransaction.type === 'sale' && (responseTransaction.status === 'settling' || responseTransaction.status === 'submitted_for_settlement')) {
        paymentTransaction.setType(PT.TYPE_CAPTURE);
    }
}

/**
 * Create Base Sale Transaction Data
 * @param  {dw.order.Order} order Order
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument Order payment instrument
 * @param {Object} prefsData preferencies data settings
 * @returns {Object} data fields
 */
function createBaseSaleTransactionData(order, paymentInstrument, prefsData) {
    var { isCustomerExistInVault } = require('~/cartridge/scripts/braintree/braintreeAPI/braintreeApiCalls');
    var { createCustomerId } = require('~/cartridge/scripts/braintree/helpers/customerHelper');
    var {
        getAmountPaid,
        createAddressData,
        getOrderLevelDiscountTotal,
        getLineItems
    } = require('~/cartridge/scripts/braintree/helpers/paymentHelper');
    var customer = order.getCustomer();
    var isCustomerInVault = isCustomerExistInVault(customer);

    var data = {
        xmlType: 'transaction',
        requestPath: 'transactions',
        orderId: order.getOrderNo(),
        amount: getAmountPaid(order).getValue(),
        currencyCode: order.getCurrencyCode(),
        customFields: getCustomFields(order, paymentInstrument)
    };

    if (isCustomerInVault) {
        data.customerId = createCustomerId(customer);
    } else {
        data.customerId = null;
        data.customer = customer.isRegistered() ?
            createRegisteredCustomerData(order) :
            createGuestCustomerData(order);
    }

    if (isTokenExists(isCustomerInVault, paymentInstrument)) {
        data.paymentMethodToken = paymentInstrument.creditCardToken;
    } else {
        data.paymentMethodNonce = paymentInstrument.custom.braintreePaymentMethodNonce;
    }

    if (prefsData.isL2L3) {
        var shipping = createAddressData(order.getDefaultShipment().getShippingAddress());
        shipping.level_2_3_processing = true;
        if (order.getCustomerLocaleID().split('_')[1].toLowerCase() === shipping.countryCodeAlpha2.toLowerCase()) {
            shipping.countryCodeAlpha3 = getISO3Country(order.getCustomerLocaleID());
        }

        data.shipping = shipping;
        data.level_2_3_processing = shipping.level_2_3_processing;
        data.taxAmount = order.getTotalTax().toNumberString();

        if (paymentInstrument.paymentMethod === 'PayPal') {
            data.l2_only = true;
            /** Rounding issues due to discounts, removed from scope due to bug on PayPal / BT end.
                * No ETA on bug fix and not in roadmap.
                *
                *
                * data.shippingAmount = order.getShippingTotalPrice().value;
                * data.discountAmount = getOrderLevelDiscountTotal(order);
                * data.lineItems = getLineItems(order.productLineItems);
            */
        } else {
            data.shippingAmount = order.getShippingTotalPrice().value;
            data.discountAmount = getOrderLevelDiscountTotal(order);
            data.lineItems = getLineItems(order.productLineItems);
        }
    }

    data.options = {
        submitForSettlement: prefsData.isSettle
    };

    if (paymentInstrument.paymentMethod !== 'GooglePay' ||
        (paymentInstrument.paymentMethod === 'GooglePay' && session.privacy.googlepayPaymentType === 'AndroidPayCard')) {
        if (prefsData.vaultMode) {
            data.options.storeInVaultOnSuccess = true;
        }
    }

    return data;
}

/**
 * Preapre Billing Address
 * @param  {dw.order.Order} order - Current users's order
 * @returns {string} Stringified data fields object
 */
function prepareBillingAddress(order) {
    var billingAddress = order.getBillingAddress();
    var billingAddressObject = {
        firstName: billingAddress.getFirstName(),
        lastName: billingAddress.getLastName(),
        countryCodeAlpha2: billingAddress.getCountryCode().value,
        locality: billingAddress.getCity(),
        streetAddress: billingAddress.getAddress1(),
        extendedAddress: billingAddress.getAddress2(),
        postalCode: billingAddress.getPostalCode(),
        region: billingAddress.getStateCode(),
        phone: billingAddress.getPhone(),
        email: order.getCustomerEmail()
    };
    return JSON.stringify(billingAddressObject);
}

/**
* Saves GooglePay account
* @param {Object} createPaymentMethodResponseData payment method response data
* @param {string} googlePayAccountAddress Stringified billing data
* @returns {Object} Object with token
*/
function saveGooglePayAccount(createPaymentMethodResponseData, googlePayAccountAddress) {
    try {
        var customerWallet = customer.getProfile().getWallet();
        var googlePayId = prefs.paymentMethods.BRAINTREE_GOOGLEPAY.paymentMethodId;
        var savedPaymentInstrument = customerWallet.getPaymentInstruments(googlePayId);

        Transaction.begin();
        if (!empty(savedPaymentInstrument)) {
            // customer can have only one saved GP account
            customerWallet.removePaymentInstrument(savedPaymentInstrument[0]);
        }
        var customerPaymentInstrument = customerWallet.createPaymentInstrument(googlePayId);
        customerPaymentInstrument.setCreditCardType('visa'); // hack for MFRA account.js line 99 (paymentInstrument.creditCardType.toLowerCase())
        customerPaymentInstrument.custom.braintreeGooglePayCustomerId = createPaymentMethodResponseData.androidPayCard.customerId;
        customerPaymentInstrument.creditCardToken = createPaymentMethodResponseData.androidPayCard.token;
        customerPaymentInstrument.custom.braintreeGooglePayAccountAddresses = googlePayAccountAddress;
        customerPaymentInstrument.custom.braintreeGooglePaySourceDescription = createPaymentMethodResponseData.androidPayCard.sourceDescription;
        Transaction.commit();
    } catch (error) {
        Transaction.rollback();
        return {
            error: error.customMessage ? error.customMessage : error.message
        };
    }
    return {
        token: createPaymentMethodResponseData.androidPayCard.token
    };
}

/**
 * Create Preferred Address object from CustomerAddress Class
 * @param  {dw.customer.CustomerAddress} customerAddress - Current customer's address that has been defined as the customer's preferred address.
 * @returns {Object} Preferred Address obj
 */
function createPreferredAddressObj(customerAddress) {
    return {
        recipientName: customerAddress.getFullName(),
        firstName: customerAddress.getFirstName(),
        secondName: customerAddress.getSecondName(),
        lastName: customerAddress.getLastName(),
        countryCodeAlpha2: customerAddress.getCountryCode().value,
        locality: customerAddress.getCity(),
        streetAddress: customerAddress.getAddress1(),
        extendedAddress: customerAddress.getAddress2(),
        postalCode: customerAddress.getPostalCode(),
        region: customerAddress.getStateCode(),
        phone: customerAddress.getPhone()
    };
}
module.exports = {
    updateBillingAddress: updateBillingAddress,
    updateShippingAddress: updateShippingAddress,
    getISO3Country: getISO3Country,
    saveGeneralTransactionData: saveGeneralTransactionData,
    createBaseSaleTransactionData: createBaseSaleTransactionData,
    getCustomFields: getCustomFields,
    createFullName: createFullName,
    createGuestCustomerData: createGuestCustomerData,
    isCountryCodesUpperCase: isCountryCodesUpperCase,
    isTokenExists: isTokenExists,
    prepareBillingAddress: prepareBillingAddress,
    saveGooglePayAccount: saveGooglePayAccount,
    createPreferredAddressObj: createPreferredAddressObj,
    createRegisteredCustomerData: createRegisteredCustomerData
};
