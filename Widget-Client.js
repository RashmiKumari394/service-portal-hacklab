function($scope, $window, spUtil, $rootScope, $uibModal) {
	var c = this;

	$scope.loadingIndicator = $rootScope.loadingIndicator;

	$scope.$on('sp_loading_indicator', function(e, value) {
		$scope.loadingIndicator = value;
	});

	//using uibModal (UI Bootstrap) for displaying the modal
	c.openPaymentModal = function() {
		c.modalInstance = $uibModal.open({
			templateUrl: 'paymentModal',
			scope: $scope
		});
	};

	c.closeModal = function() {
		c.modalInstance.close();
	};

	c.payNow = function(isValid) {

		//form is submitted, if there are any AngularJS validation errors they will now be displayed
		c.submitted = true;
		if(isValid) {

			//setting an action variable is a good practice, if you have multiple functions on the server that you want to trigger individually
			c.data.action = "make_payment";

			c.server.update().then(function(response) {
				if(response.payPalStatus == "failed") {
					c.paymentStatus = "failed";
				} else if(response.payPalStatus == "success") {
					c.paymentStatus = "success";
					setTimeout(function(){
						c.modalInstance.close();
					}, 3000);
				}
			});

		}
	};
}
