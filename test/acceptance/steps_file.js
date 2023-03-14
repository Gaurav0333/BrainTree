
// in this file you can append custom step methods to 'I' object
const data = require('./data.json');
module.exports = function() {
  return actor({
	  
	login: function(email, password) {
		this.amOnPage(data.loginPage)
		this.wait(4)
		if(this.see("Yes")){this.click("Yes")}
		this.wait(2)
		this.fillField('Email', email);
		this.fillField('Password', password);
		this.wait(2);
		this.click("button.btn.btn-block.btn-primary");
		
	},
	
	fillCardData: async function(nameOnCard, cardNumber, cvv, expiration) {
		this.fillField("Name on Card", nameOnCard);
		this.wait(3)
		this.switchTo("//iframe[@id='braintree-hosted-field-number']");
		this.wait(3)
		//pause()
		//let debug = await this.grabHTMLFromAll(("//iframe[@id='braintree-hosted-field-number']"))
		//console.log(debug)
		//within({frame: "#braintree-hosted-field-number"}, () => {
			//this.fillField("//input[@id='credit-card-number']", cardNumber);
		 // });
		this.fillField("//input[@id='credit-card-number']", cardNumber);
		this.switchTo();
		this.switchTo("#braintree-hosted-field-cvv");
		this.fillField("#cvv", cvv);
		this.switchTo();
		this.switchTo("#braintree-hosted-field-expirationDate");
		this.fillField("expiration", expiration);
		this.switchTo();
		this.switchTo();
	},

	usePPAsGuest: async function(){
		//const handleBeforePopup = await this.grabCurrentWindowHandle();
		this.switchTo("iframe.component-frame.visible")
		this.wait(4)
		this.click("[data-funding-source='paypal']")
		this.wait(4)
		//const allHandlesAfterPopup = await this.grabAllWindowHandles();
		this.wait(4)
		//await this.switchToWindow(allHandlesAfterPopup[1]);
		this.wait(8)
		this.click("Accept")
		this.wait(5)
		this.fillField("Email", data.paypalEmail)
		this.fillField("Password", data.paypalPassword)
		this.click("Log In")
		this.wait(12)
		//this.click("Accept")
		//this.wait(3)
		this.click("Continue")
		this.wait(15)
		this.click("Continue")
		this.wait(20)
		//this.click("Pay Now")
		//await this.switchToWindow(handleBeforePopup);
	},

	usePPAWithPopUp: async function(){
	//const handleBeforePopup = await this.grabCurrentWindowHandle();
	this.switchTo("iframe.component-frame.visible")
	this.wait(4)
	this.click("[data-funding-source='paypal']")
	this.wait(10)
	//await this.switchToWindow(handleBeforePopup)
	this.wait(4)
	this.fillShippingData(data.firstName, data.lastName, data.addressOne, data.country, data.state, data.city, data.zip, data.phone)
	this.wait(5)
	this.click("Save")
	},

	usePPfromMiniCart: async function(){
		//const handleBeforePopup = await this.grabCurrentWindowHandle();
		this.switchTo("iframe.component-frame.visible")
		this.wait(4)
		this.click("[data-funding-source='paypal']")
		this.wait(10)
		//const allHandlesAfterPopup = await this.grabAllWindowHandles();
		//await this.switchToWindow(allHandlesAfterPopup[1]);
		//const currentURL= await this.grabCurrentUrl();
		this.switchToNextTab()
		this.wait(6)
		//pause()
		this.click("Accept")
	    this.wait(5)
		this.fillField("Email", data.paypalEmail)
		this.click("Next")
		this.wait(5)
		this.fillField("Password", data.paypalPassword)
		this.click("Log In")
		//this.waitForText("Agree & Pay", 60)
		//this.click("Agree & Pay")
		this.wait(20)
		this.click("Continue")
		this.click("Agree & Continue")
		this.switchToPreviousTab()
		this.wait(5)
		//await this.switchToWindow(handleBeforePopup);
	},

	usePPAsUser1Continue: async function(){
		//const handleBeforePopup = await this.grabCurrentWindowHandle();
		this.switchTo("iframe.component-frame.visible")
		this.wait(4)
		this.click("[data-funding-source='paypal']")
		this.wait(10)
		//const allHandlesAfterPopup = await this.grabAllWindowHandles();
		//await this.switchToWindow(allHandlesAfterPopup[1]);
		this.switchToNextTab()
		this.wait(6)
		this.click("Accept")
	    this.wait(5)
		this.fillField("Email", data.paypalEmail)
		this.click("Next")
		this.wait(5)
		this.fillField("Password", data.paypalPassword)
		this.click("Log In")
		this.wait(25)
		this.click("Continue")
		this.switchToPreviousTab()
		this.wait(10)
		//this.click("Continue")
		//this.click("Pay Now")
		//await this.switchToWindow(handleBeforePopup);
	},
	
	fillShippingData: function(firstName, lastName, addressOne, country, state, city, zip, phone) {
		this.fillField("First Name", firstName)
		this.wait(3)
		this.fillField("Last Name", lastName)
		this.wait(3)
		this.fillField("Address 1", addressOne)
		this.wait(3)
		this.selectOption("Country", country)
		this.wait(3)
		this.selectOption("State", state)
		this.wait(3)
		this.fillField("City", city)
		this.wait(3)
		this.fillField("ZIP Code", zip)
		this.wait(3)
		this.fillField("Phone Number", phone)
	}, 
	
	fillPaypalData: function(paypalEmail, paypalPassword) {
		
		this.wait(6)
		this.click("Accept")
		this.wait(3)
		this.fillField("Email", paypalEmail)
		this.click("Next")
		this.wait(3)
		this.fillField("Password", paypalPassword)
		this.click("Log In")
		this.wait(10)
		this.click("Continue")
		this.wait(2)
		this.click("Continue")
		
	},
	
	fillPaypalCreditData: function(paypalEmail, paypalPassword) {
			
		this.wait(6)
		this.click("Accept")
		this.wait(3)
		this.fillField("Email", paypalEmail)
		this.click("Next")
		this.wait(3)
		this.fillField("Password", paypalPassword)
		this.click("Log In")
		this.wait(15)
		this.click("More info")
		this.click("#extendedSacOffer > div")
		this.wait(3)
		this.click("Continue")
		this.wait(4)
	},
	
	loginToBM: function(BMLogin, BMPassword){
	this.amOnPage (data.bmLoginPage)	
	this.wait(2)
	this.fillField("LoginForm_Login", BMLogin)
	this.fillField("LoginForm_Password", BMPassword)
	this.click("login")
	this.wait(2)
	},
	
	enable3DS: function(){
	this.wait(2)
	this.amOnPage (data.bmLoginPage)
	this.wait(7)
	this.click("RefArch_BT")
	this.amOnPage (data.bmLoginPage)
	this.wait(7)
	this.selectOption("#dw-select-43 > select","0")
	this.wait(2)
	this.pressKey('Enter');
	this.wait(2)
	},
	
	disable3DS: function(){
	this.wait(2)
	this.amOnPage (data.bmLoginPage)
	this.wait(7)
	this.click("RefArch_BT")
	this.amOnPage (data.bmLoginPage)
	this.wait(7)
	this.selectOption("#dw-select-43 > select","1")
	this.wait(2)
	this.pressKey('Enter');
	this.wait(2)
	},
	
	deletePayment: function(){
	this.wait(2)
	this.click('Manage Payment Methods') 
	
	this.wait(1)
	this.click('button.remove-btn.remove-payment')
	this.wait(2)
	this.click('Yes')
	this.wait(2)
	},
	
	
	
	pass3DS: function() {
		this.wait(13)	
		this.switchTo("#Cardinal-CCA-IFrame")
		this.fillField("#content > div:nth-child(2) > form:nth-child(2) > input.input-field", "1234")
		this.click("SUBMIT")
		this.switchTo();
		this.wait(5)
	}


    // Define custom steps here, use 'this' to access default methods of I.
    // It is recommended to place a general 'login' function here.
  });
};

