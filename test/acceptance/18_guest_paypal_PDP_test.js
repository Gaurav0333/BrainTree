
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Scenario(
'18 Guest can place order from PDP using PayPal account', 
async ({I}) => {
	I.amOnPage(data.productPageTV)
	I.click("Yes")
	
	I.wait(3)
	
	await I.usePPfromMiniCart()
	
	I.wait(10)
	I.see("Place Order")
	
	I.click("Place Order")
	I.wait(10)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	}
);
