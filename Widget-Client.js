function paypalController($scope, $window, spUtil) {
	var c = this;	
	
	c.paynow = function() {
		c.data.type = c.credit_card_type;
		c.data.first_name = c.first_name;
		c.data.last_name = c.last_name;
		c.data.credit_card_number = c.credit_card_number;
		c.data.expire_month = c.expire_month;
		c.data.expire_year = c.expire_year;
		c.data.cvv = c.cvv;

		c.server.update();	
		
		//Implement a Watcher that executes if we have a new value set in "data.payPalStatus"
		$scope.$watch("data.payPalStatus", function(new_value) {
			if(new_value) {
				if(new_value == "success") {
					$('#paymentModal').modal('hide')

					var infoMessage = '<strong>Thank you!</strong> We receveid your payment. A clerk will now follow up with you. You can track your requests status here: <a href="'+c.data.href+'">' + "${click here to view}" + '</a>';
					spUtil.addInfoMessage(infoMessage);				 					
				} else {					
					$('#paymentFailed').show();
				}
			}
		})
	}	
}

/*
	@TODO: Utilize Option Schema for HTML directive, e.g. to configure success
	or failure messages.
*/