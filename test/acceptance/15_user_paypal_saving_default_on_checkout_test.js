
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});

Scenario(
'15 User can save a paypal account during checkout', 
async ({I}) => {
	

	I.amOnPage(data.productPageTV)

	I.wait(7)
	I.click("Add to Cart")
	I.wait(4)
	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	I.wait(3)
	//pause()
	//I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	
	I.click("Next: Payment")
	I.wait(3)
	I.fillField("#email", data.email)
	

	I.click("PayPal")
	I.wait(3)
	I.seeCheckboxIsChecked('Save PayPal account')
	I.seeCheckboxIsChecked('Make default') 
	/* 
	checking that 'save' & 'make default' are checked. These options are checked by default. 
	if you don't need to check or make it default - just use I.click('element name') for unchecking these boxes.
	*/
	
	
	await I.usePPAsUser1Continue()
	
	
	I.wait(5)

	I.see('Payment:')
	// I.see('PayPal')
	// I.see(data.paypalEmail)
	I.click("Place Order")

	I.wait(12)
	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("PayPal")

	I.click('Continue Shopping')

	I.wait(4)
	I.amOnPage(data.myAccountPage)
	I.wait(3)
	//I.click('#maincontent > div.container > div.row.justify-content-center > div:nth-child(2) > div:nth-child(2) > div.card-header.clearfix > a') // Go to Payment methods page
	
	I.see(data.paypalEmail)
	//I.see('default')
	//add few more assertions for checking that the right method
	
	}
);

Scenario(
	'Remove all saved methods 15',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });
