
Feature('Checkout');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	

});

Scenario(
'16 User can change shipping address on checkout', 
({I}) => {

	
	
	I.amOnPage(data.productPageTV)
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)

	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	I.wait(3)
	I.click("Next: Payment")

	
	//I.fillShippingData(data.firstNameCheck, data.lastNameCheck, data.addressOneCheck, data.countryCheck, data.stateCheck, data.cityCheck, data.zipCheck, data.phoneCheck)

	
	I.wait(3)
	I.fillField("#email", data.email)
	I.click('credit')
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	I.wait(2)
	
	I.click('Next: Place Order')
	I.wait(5)
	I.pass3DS("1234")



	I.click('span.edit-button.pull-right')
	I.wait(6)
	//pause()
	//const isUpdateAddressPresent = I.waitForElement("Update Address",5);
	//if(isUpdateAddressPresent){
	//	I.click("Update Address");
	//	}
	I.click("Update Address")
	
	I.fillShippingData(data.firstNameCheck, data.lastNameCheck, data.addressOneCheck, data.countryCheck, data.stateCheck, data.cityCheck, data.zipCheck, data.phoneCheck)
	I.click('Next: Payment')
	I.wait(2)
	I.click('Next: Place Order')
	I.see(data.firstNameCheck)
	I.see(data.lastNameCheck)
	I.see(data.addressOneCheck)
	I.see(data.cityCheck)
	I.see(data.zipCheck)
	I.see(data.phoneCheck)
	
	I.wait(3)
	I.click("Place Order")
	
	I.wait(10)
	I.see('Receipt')
	I.see('Thank you for your order')
	I.see(data.firstNameCheck)
	I.see(data.lastNameCheck)
	I.see(data.addressOneCheck)
	I.see(data.cityCheck)
	I.see(data.zipCheck)
	I.see(data.phoneCheck)

	}
);

Scenario(
	'Remove all saved methods 16',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });