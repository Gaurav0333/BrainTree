
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');



Scenario(
'04 Guest can place order using PayPal widget on shopping cart', 
async ({I}) => {

	
	I.amOnPage(data.productPageTV)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)
	I.click('div.minicart-total.hide-link-med')
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
