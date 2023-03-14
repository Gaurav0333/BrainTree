
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');



Scenario(
'06 Guest can place order using PayPal credit on shopping cart page', 
async ({I}) => {
	I.amOnPage(data.productPageTV)
	I.wait(2)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)
	I.click('div.minicart-total.hide-link-med')
	I.wait(5)
	
	await I.usePPfromMiniCart()
	
	
	
	I.wait(7)
	I.see("Place Order")
	
	I.click("Place Order")
	I.wait(15)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	
	}
);
