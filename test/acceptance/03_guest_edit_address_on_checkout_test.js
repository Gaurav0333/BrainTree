
Feature('Checkout');

const data = require('./data.json');


Scenario(
'03 Verify that guest can edit shipping address on checkout', 
({I}) => {
	I.amOnPage(data.productPageTV)
	I.wait(2)
	I.click("Yes")
	I.wait(2)
	I.click("Add to Cart")
	I.wait(2)

	I.click("div.minicart-total.hide-link-med")
	I.wait(5)
	I.click("Checkout")
	I.wait(3)
	
	I.click("Checkout as Guest")
	I.wait(3)
	
	I.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)

	I.wait(2)
	I.click("Next: Payment")
	I.wait(3)
	I.fillField("#email", data.email)
	I.click('Credit Card')
	I.fillCardData(data.nameOnCard, data.cardNumber, data.cvv, data.expiration)
	I.wait(2)
	
	I.click('Next: Place Order')
	
	
	I.pass3DS()
	//pause()
	I.click('#checkout-main > div:nth-child(3) > div.col-sm-7 > div.card.shipping-summary > div.card-header.clearfix > button') // 'Edit' shipping data button 
	I.wait(3)
	I.fillShippingData(data.firstNameCheck, data.lastNameCheck, data.addressOneCheck, data.countryCheck, data.stateCheck, data.cityCheck, data.zipCheck, data.phoneCheck)
	I.click('Next: Payment')
		
	I.wait(5)
	I.click('Next: Place Order')
	I.wait(3)
	I.click('Place Order')
	I.wait(5)

	I.see(data.firstNameCheck)
	I.see(data.lastNameCheck)
	I.see(data.addressOneCheck)
	I.see(data.cityCheck)
	I.see(data.zipCheck)
	I.see(data.phoneCheck)	
	
	}
);
