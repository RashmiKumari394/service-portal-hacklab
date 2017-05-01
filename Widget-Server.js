(function() {

	var gr = $sp.getRecord();
	if (gr) {
		data.table = gr.getTableName();
		data.sys_id = gr.getUniqueValue();
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


	//trigger this piece of code, only when the action variable is "make_payment"
	if (input && input.action == "make_payment" && gr) {
		try {

			//$sp.log("parseFloat price is: " + parseFloat(gr.price.getReferenceValue()));
			//getReferenceValue() on the price returns e.g. 1100.0000 for a $1,100.00USD price - use parseFloat for the PayPal API to work
			var parsedPrice = parseFloat(gr.price.getReferenceValue());

			//Build PayPal JSON payment object
			var payment = {
				"intent": "sale",
				"payer": {
				},
				"transactions": [{
					"amount": {
						"currency": gr.price.getReferenceCurrencyCode(),
						"total": parsedPrice
					},
					"description": "ServiceNow Request for Company: " + gr.request.requested_for.company.getDisplayValue()
				}]
			};

			var funding_instruments = [
				{
					"credit_card": {
						"type": input.credit_card_type,
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
			//$sp.log("** Token returned from the getPayPalToken() method: " + token);

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
				$sp.log("** Payment Notification - Payment completed, HTTP Status Code: " + httpStatus + "/ Body: " + responseBody);
			} else {
				data.payPalStatus = "failed";
				$sp.log("** Payment Notification - Payment failed, HTTP Status Code: " + httpStatus + "/ Body: " + responseBody);
			}
		}
		catch(ex) {
			var message = ex.getMessage();
			$sp.log("** Caught an exception within the PayPal payment block: " + message);
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
			sm.setBasicAuth("AaRUqMvjYBZ1FE8dEt2mamy3WlHaZJU4SRehZGkv3A46tSPND2A2EvS5Ceg6JaOHfNYWKhevLMXVPy9B","EHgHpMx3HTzgZOf4mG_WU_tPTHdosgkOSDoSgwMQgUwqg6ChFPdRRns-SP3KZpzc1uzOEQoTONEUVXid");
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
			$sp.log("** Caught an exception within the PayPal token block: " + message);
		}
	}
})();
