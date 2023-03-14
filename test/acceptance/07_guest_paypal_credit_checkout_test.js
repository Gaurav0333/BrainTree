
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');



Scenario(
'07 Guest can place order using PayPal credit on checkout page', 
async ({I}) => {
	I.amOnPage(data.productPageTV)
	I.wait(2)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)
	I.click('div.minicart-total.hide-link-med')
	I.wait(2)
	I.click("Checkout")
	I.wait(2)
	I.click("Checkout as Guest")
	
	I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	I.wait(2)
	I.click("Next: Payment")
	I.wait(4)
	I.fillField("#email", data.email)
	I.wait(2)
	I.click("PayPal")
	I.wait(2)
	
	await I.usePPfromMiniCart()
	
	
	I.wait(7)
	I.click("Place Order")
	I.wait(10)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	
	}
);
