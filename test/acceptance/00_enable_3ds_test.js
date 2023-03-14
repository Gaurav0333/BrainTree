
Feature('Buisness manager');

const data = require('./data.json');

Before( ({I}) => {
	
	I.loginToBM(data.BMLogin, data.BMPassword)
	
});


Scenario(
'00 enable 3ds', 
async ({I}) => {
	
	
	I.amOnPage (data.bmLoginPage)
	
	I.enable3DS()
	


	}
);


