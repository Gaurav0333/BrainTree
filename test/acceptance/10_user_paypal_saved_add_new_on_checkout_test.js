Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');


Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});


Scenario(
'10 Verify that user can add new PayPal account on checkout flow while there is saved one', 
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
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)

	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	
	I.wait(3)
	//I.click ("Next: Payment")
	
	//I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	
	I.click("Next: Payment")
	I.wait(3)
	I.fillField("#email", data.email)
	
	I.click('PayPal')
	
	I.see(data.paypalEmail)
	I.selectOption('braintreePaypalAccountList', 'New PayPal account')
	
	I.seeCheckboxIsChecked('Save PayPal account')
	I.seeCheckboxIsChecked('Make default') 
	/* 
	checking that 'save' & 'make default' are checked. These options are checked by default. 
	if you don't need to check or make it default - just use I.click('element name') for unchecking these boxes.
	*/
	
	

	
	const handleBeforePopup = await I.grabCurrentWindowHandle();
	I.switchTo("iframe.component-frame.visible")
	I.wait(2)
	I.click("[data-funding-source='paypal']")
	I.wait(4)
	const allHandlesAfterPopup = await I.grabAllWindowHandles();
	await I.switchToWindow(allHandlesAfterPopup[1]);
	I.wait(6)
		//I.click("Accept")
	   // I.wait(3)
		//I.fillField("Email", data.paypalEmail)
		//I.click("Next")
		//I.wait(3)
		//I.fillField("Password", data.paypalPassword)
		//I.click("Log In")
		//I.wait(12)
	I.click("Continue")
	I.wait(10)
		//I.click("Continue")
		//I.click("Pay Now")
	I.wait(3)
	await I.switchToWindow(handleBeforePopup);
	
	I.wait(5)

	I.see('Payment:')
	//I.see('PayPal')
	
	I.click("Place Order")
	I.wait(12)
	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("PayPal")

	I.click('Continue Shopping')

	I.wait(4)


	}
);

Scenario(
	'10.1 check saved method',
   async ({I}) => {
	
	I.wait(2)
	I.click('Manage Payment Methods') // Go to Payment methods page
	I.wait(2)
	I.see(data.paypalEmail)
	I.see('default')
	   });


Scenario(
	'Remove all saved methods 10',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   }).retry(2);
	   
