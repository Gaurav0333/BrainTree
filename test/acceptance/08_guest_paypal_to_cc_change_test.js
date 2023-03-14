
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Scenario(
'08 Verify that guest can change payment method from PayPal to card on checkot', 
async ({I}) => {

	I.amOnPage(data.productPageTV)
	I.wait(2)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)
	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	I.wait(2)
	I.click("Checkout as Guest")
	I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	I.click("Next: Payment")
	I.wait(5)
	I.fillField("#email", data.email)
	I.click("PayPal")

	await I.usePPfromMiniCart()

	I.wait(5)
	I.click('#checkout-main > div:nth-child(3) > div.col-sm-7 > div.card.payment-summary > div.card-header.clearfix > button') // click on 'Edit' button
	I.click('Credit Card')
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	
	
	I.wait(2)
	I.click("Next: Place Order")
	I.pass3DS("1234")
	I.wait(10)
	I.see("Payment")
	I.see("Credit Card")
	
	I.click("Place Order")
	
	I.wait(5)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	}
);
