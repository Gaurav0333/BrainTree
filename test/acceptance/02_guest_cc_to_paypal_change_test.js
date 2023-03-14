
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');


Scenario(
'02 Verify that guest can change payment method from card to PayPal on checkout', 
async ({I}) => {
	
	
	I.amOnPage(data.productPageTV)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)
	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	I.wait(2)
	I.click("Checkout as Guest")
	I.wait(2)
	
	I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	
	I.click("Next: Payment")
	I.wait(5)
	
	I.fillField("#email", data.email)
	I.click('credit')
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	I.wait(2)
	I.switchTo()
	I.click("Next: Place Order")
	
	
	I.pass3DS()
	I.wait(3)
	//pause()
	I.click('#checkout-main > div:nth-child(3) > div.col-sm-7 > div.card.payment-summary > div.card-header.clearfix > button') // click on 'Edit' button

	I.click("PayPal")
	I.wait(5)
	

	await I.usePPfromMiniCart()
	

	
	I.wait(6)
	
	I.see("Payment:")
	//I.see("PayPal")
	I.see("Place Order")
	
	I.click("Place Order")
	I.wait(10)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("PayPal")
	}
);
