
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Scenario(
'20 Guest can place order from minicart using PayPal account', 
async ({I}) => {
	I.amOnPage(data.productPageTV)
	I.click("Yes")
	
	I.selectOption("Quantity", "1")
	I.wait(2)
	
	I.click("Add to Cart")
	I.wait(2)
	I.moveCursorTo('body > div.page > header > nav > div.header.container > div > div > div:nth-child(2) > div.pull-right > div.minicart > div.minicart-total.hide-link-med > a > i')

	I.wait(5)
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
