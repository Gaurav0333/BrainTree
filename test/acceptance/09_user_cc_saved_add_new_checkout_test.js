
Feature('Checkout');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	
	

});

Scenario(
'09 User can add and save new credit card on checkout flow (saved card exist)', 
async ({I}) => {
	//pause()
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
	
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	I.seeCheckboxIsChecked("Save this card")
	I.seeCheckboxIsChecked("Make default")
	
	I.click("Next: Place Order")
	I.wait(3)
	I.pass3DS('1234')
	I.wait(3)
	I.click("Place Order")
	//pause()
	I.wait(5)
	

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
	I.wait(5)
	
	
	I.selectOption('braintreeCreditCardList' , 'New Card')
	I.fillCardData(data.nameOnCard2, data.cardNumber2, data.cvv2, data.expiration2)
	//pause()

	 // card selection from list based on added card
	I.click("Next: Place Order")
	I.wait(3)
	
	I.pass3DS('1234')
	I.wait(3)
	//Order confirmation page
	I.click("Place Order")
	
	I.wait(6)
	//asserts for verifying placing order:
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see("Payment:")
	I.see("Credit Card")

	I.click('Continue Shopping')
  
	I.wait(5)
	I.amOnPage(data.myAccountPage)
	//I.click("Yes")
	
	
	//I.amOnPage("https://paypal05-tech-prtnr-na06-dw.demandware.net/on/demandware.store/Sites-MobileFirst-Site/en_US/Braintree-PaymentInstruments") // Go to Payment methods page
	
	I.see(data.nameOnCard2)
	//I.see('default')
	
	}
);

Scenario(
 'Remove all saved methods 09',
async ({I}) => {
	
	
	
	I.deletePayment()

	}).retry(2);
	
