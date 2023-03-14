
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});

Scenario(
'22 User can place order from minicart using saved PayPal account', 
async ({I}) => {
	I.click('Manage Payment Methods') // Go to Payment methods page
	
	I.wait(1)
	I.click("Add New PayPal account")
	I.wait(7)
	
	await I.usePPAsUser1Continue()
	
	I.wait(5)
	
	I.click("Make default payment")
	
	I.click("Save")
	I.wait(5)
	I.see(data.paypalEmail)
	I.see('default')

	I.amOnPage(data.productPageTV)
	//pause()
	I.wait(2)
	I.selectOption("Quantity", "1")
	I.wait(2)
	
	I.click("Add to Cart")
	I.wait(2)
	
	
	
	I.moveCursorTo('body > div.page > header > nav > div.header.container > div > div > div:nth-child(2) > div.pull-right > div.minicart > div.minicart-total.hide-link-med > a > i')

	
	I.wait(6)
	
	
	await I.usePPAWithPopUp()
	// const handleBeforePopup = await I.grabCurrentWindowHandle();
	// I.switchTo("iframe.zoid-component-frame.zoid-visible")
	// I.wait(2)
	// I.click("div.paypal-button")
	// I.wait(2)
	// await I.switchToWindow(handleBeforePopup)
	// I.wait(2)
	// I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	// I.wait(3)
	// I.click("Save")
	//pause()
	
	
	
	//asserts on billing
	I.wait(10)
	I.see(data.paypalEmail)
	I.see("Place Order")
	
	I.click("Place Order")
	I.wait(10)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see(data.paypalEmail)
	}
);

Scenario(
	'Remove all saved methods 22',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });
