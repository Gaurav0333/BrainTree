Feature('Checkout');

const data = require('./data.json');

Before( ({I}) => {
	
	I.login(data.email, data.password)
	
	

});

Scenario(
	'Remove all saved methods 17',
   async ({I}) => {
	   
	   
	   
	   I.deletePayment()
   
	   });