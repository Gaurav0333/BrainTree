
Feature('Checkout');

const data = require('./data.json');



Scenario(
'11 User can add and save new credit card on checkout flow (saved card exist)', 
async ({I}) => {
	
	
	I.loginToBM(data.BMLogin, data.BMPassword)
	
	
	I.disable3DS()
	
	
	I.login(data.email, data.password)
	
	
	
	//I.click("#maincontent > div.container > div.row.justify-content-center > div:nth-child(2) > div:nth-child(2) > div.card-header.clearfix > a")
	I.wait(2)
	I.click("Manage Payment Methods")
	I.wait(2)
	I.click("Add New Card")
	I.wait(2)
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	I.click("Make default payment")
	I.click("Save")
	
	I.wait(5)

	I.see('Credit Cards')
	I.see(data.nameOnCard)
	I.see('default')

	I.amOnPage(data.productPageTV)	
	I.wait(3)
	I.click("Add to Cart")
	I.wait(2)
	I.click("div.minicart-total.hide-link-med")
	I.wait(2)
	I.click("Checkout")
	
	I.wait(3)
	
	
	//I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	I.click("Next: Payment")
	I.wait(3)
	
	I.fillField("#email", data.email)
	I.wait(3)
	I.switchTo()
	I.wait(3)
	
	
	I.selectOption('braintreeCreditCardList' , 'New Card')
	
	I.fillCardData(data.nameOnCard2, data.cardNumber2, data.cvv2, data.expiration2)

	 // card selection from list based on added card
	I.click("Next: Place Order")
	I.wait(3)
	//Order confirmation page
	I.click("Place Order")
	
	I.wait(10)
	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("Credit Card")

	I.click('Continue Shopping')
   
	
	
	I.wait(3)
	I.amOnPage(data.myAccountPage) // Go to Payment methods page
	
	I.see(data.nameOnCard2)
	
	I.enable3DS()
	}
);

Scenario(
	'Remove all saved methods 11',
   async ({I}) => {
	   
	   
	I.login(data.email, data.password)
	I.deletePayment()
   
	   }).retry(2);
	   

