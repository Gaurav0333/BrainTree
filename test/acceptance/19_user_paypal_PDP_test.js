
Feature('Checkout');

const assert = require('assert');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});

Scenario(
'19 User can place order from PDP using PayPal account', 
async ({I}) => {
	I.amOnPage(data.productPageTV)
	//pause()
	
	I.wait(3)
	
	await I.usePPAsUser1Continue()
	
	I.wait(10)
	I.see("Place Order")
	
	I.click("Place Order")
	I.wait(10)

	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	}
);

Scenario(
	'19.1 Remove all saved methods ',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });

