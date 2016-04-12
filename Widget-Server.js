var gr = $sp.getRecord();
if (gr) {
	data.tableLabel = gr.getLabel();
	data.table = gr.getTableName();
	data.sys_id = gr.getUniqueValue();
	data.request_sys_id = gr.getValue('request');
	data.href = "/$sp.do?id=sc_request&table=sc_request&sys_id="+gr.getValue('request');
}

/* 
We only want to show the payment modal when the stage is "Payment Requested) 
In order for this to work you will have to add a Stage with the value "payment_requested" to your Catalog Item workflow 
*/
if(gr.getValue("stage") == "payment_requested") {
	data.showPayment = true;	
} else {
	data.showPayment = false;
}


if (input && gr) {
	try {
		
		//Build PayPal JSON payment object
		var payment = {
			"intent": "sale",
			"payer": {
			},
			"transactions": [{
					"amount": {
						"currency": gr.price.getReferenceCurrencyCode(),
						"total": gr.price.getReferenceValue()
					},
					"description": "Liquor License fee for company: " + gr.request.requested_for.company.getDisplayValue()
				}]
			};

			var funding_instruments = [
			{
				"credit_card": {
					"type": input.type,
					"number": input.credit_card_number,
					"expire_month": input.expire_month,
					"expire_year": input.expire_year,
					"first_name": input.first_name,
					"last_name": input.last_name,
					"cvv2": input.cvv
				}
			}];
			payment.payer.payment_method = 'credit_card';
			payment.payer.funding_instruments = funding_instruments;		
		
			/* 
				Call the PayPal Sandbox Payment API for direct Credit Card payments
				At first we will have to generate an OAuth token by using the PayPal OAuth API.
			*/
			var token = getPayPalToken();
			gs.log("** Token returned from the getPayPalToken() method: " + token);
		
			var sm = new sn_ws.RESTMessageV2();
			sm.setEndpoint("https://api.sandbox.paypal.com/v1/payments/payment");
			sm.setHttpMethod("post");
			sm.setRequestHeader("Content-type","application/json");
			sm.setRequestHeader("Authorization", "Bearer " + token);		
			sm.setRequestBody(JSON.stringify(payment));
		
			var response = sm.execute();
			var responseBody = response.getBody();
			var httpStatus = response.getStatusCode();			

			if(httpStatus == "201") {
				data.payPalStatus = "success";
				//populate Date/Time variable on the RITM that could eventually drive our Workflow
				gr.u_payment_received = gs.nowDateTime(); 
				gr.comments = "** Auto System Notification: Received " + gr.price.getReferenceCurrencyCode() + " " + gr.price.getReferenceValue() + " payment paid by Credit Card via PayPal.";
				gr.update();
				gs.log("** Payment Notification - Payment completed, HTTP Status Code: " + httpStatus + "/ Body: " + responseBody);
			} else {
				data.payPalStatus = "failed";
				gs.log("** Payment Notification - Payment failed, HTTP Status Code: " + httpStatus + "/ Body: " + responseBody);
			}
		}
		catch(ex) {
			var message = ex.getMessage();
			gs.log("** Caught an exception within the PayPal payment block: " + message);
		}
}


function getPayPalToken() {
	try {
		/*
			Generate OAuth token by using the ClientID & Secret from the PayPal app.			
		*/
		var sm = new sn_ws.RESTMessageV2();
		sm.setEndpoint("https://api.sandbox.paypal.com/v1/oauth2/token");
		sm.setHttpMethod("post");
		sm.setRequestHeader("Accept","application/json");
		sm.setRequestHeader("Accept-Language", "en_US");
		//@setBasicAuth: values are coming from the PayPal App: Client ID,Secret
		sm.setBasicAuth("AbKNTbZreJ1QFxsIE8TlAdUilur2nKudoVFuS3Gt0ReMaMD9JCLOgXPXx52cqPK7pw3GqbEAnHfrDzD0","EEiT1gs3A8_5RYtVqOv4RaxuD6hDQ_Y6Ueppe3ykgafreuzPnI6RGvUFys0LWskQIzyY8i1d22FSwC21");
		sm.setRequestBody("grant_type=client_credentials");

		var response = sm.execute();
		var responseBody = response.getBody();
		var httpStatus = response.getStatusCode();
		
		var accessIndex = responseBody.indexOf("access_token");
		
		//OAuth token is 98 chars long - we have to add the 15 chars from the access_token string (@TODO: create more dynamic substring with RegEx)
		var token = responseBody.substring(accessIndex+15, accessIndex+112);
		return token;
	}
	catch(ex) {
		var message = ex.getMessage();
		gs.log("** Caught an exception within the PayPal token block: " + message);
	}
}