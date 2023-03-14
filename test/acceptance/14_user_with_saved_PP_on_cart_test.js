
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});

Scenario(
'14 User can place order on shopping cart using saved PayPal account', 
async ({I}) => {
	
	I.click('Manage Payment Methods') // Go to Payment methods page
	
	I.wait(1)	
	I.click("Add New PayPal account")
	I.wait(7)
	
	await I.usePPAsUser1Continue()
	
	I.wait(5)
	
	I.click("Make default payment")
	
	I.click("Save")
	I.wait(3)
	I.see(data.paypalEmail)
	I.see('default')
	
	I.amOnPage(data.productPageTV)	
	
	I.wait(4)
	I.click("Add to Cart")

	I.wait(3)
	I.click("div.minicart-total.hide-link-med")
	I.wait(4)
	
	I.switchTo('iframe.component-frame.visible')
	I.click("[data-funding-source='paypal']")
	I.wait(2)
	I.switchTo()
	I.switchTo()
	I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	I.click('Save')
	I.wait(5)
	I.click('Place Order')
	
	I.wait(10)
	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("PayPal")
	I.see(data.firstName)
	I.see(data.lastName)
	I.see(data.addressOne)
	I.see(data.phone)
	}
);

Scenario(
	'Remove all saved methods 14',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });
