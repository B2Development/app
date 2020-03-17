angular.module('editNonManagedResourceApplianceModule', ['ngDialog'])
.controller('editNonManagedResourceApplianceController', ['$scope', '$rootScope', '$http','ngDialog', function($scope, $rootScope, $http,ngDialog) {
        $scope.applianceObject = $("[ng-controller=AppliancesCtrl]").scope();
        $scope.strUsername="";
        $scope.strPassword="";
        $scope.invalidUsername = false;
        $scope.invalidPassword = false;
        $scope.isSuspendBackupSelectionChecked = false;
        $scope.strtooltip = "";
        $scope.isDisabled=true;

        $scope.selectedAppliance = selectedAppliance; //$scope.applianceObject.selectedPendingSource;

        $scope.init = function () {
            $scope.invalidUsername = false;
            $scope.invalidPassword = false;

            // According to the API, we will get "not available" if the source is non-managed, so we cannot disable the checkbox.
            $scope.isDisabled = false;
            if($scope.selectedAppliance.status === "suspended"){
                $scope.isSuspendBackupSelectionChecked = true;
            }else{
                $scope.isSuspendBackupSelectionChecked = false;
            }
        };

        $scope.onEnableManagementSelectionChange=function(){
            if($('#enableManagementSelection').prop("checked") == false){
                $('#txtuserName').attr('disabled','disabled');
                $('#txtpassword').attr('disabled','disabled');
                $('#txtuserName').removeAttr('required');
                $('#txtuserName').removeAttr('required');
                $scope.invalidUsername = false;
                $scope.invalidPassword = false;
            }else{
                $('#txtuserName').removeAttr('disabled');
                $('#txtpassword').removeAttr('disabled');
                $('#txtuserName').prop('required',true);
                $('#txtpassword').prop('required',true);
            }
        };

        $scope.editNonManagedAppliance = function(){

            if($('#enableManagementSelection').prop("checked") == true){
                var parameters = {};
                var managedObj={};
                var credentials = {};
                var url = "/api/systems/add-management";

                if(($scope.strUsername == "") || ($scope.strPassword == "")){
                    if($scope.strUsername == ""){$scope.invalidUsername = true; }
                    if($scope.strPassword == ""){$scope.invalidPassword = true; }
                    return;
                }

                managedObj.id = $scope.selectedAppliance.id;

                if(($scope.selectedAppliance.name) != null && ($scope.selectedAppliance.name) != ""){
                    managedObj.name = $scope.selectedAppliance.name;
                }

                if(($scope.selectedAppliance.location_id) != null && ($scope.selectedAppliance.location_id) != ""){
                    managedObj.location_id = $scope.selectedAppliance.location_id;
                }

                credentials.username = $('#txtuserName').val();
                credentials.password = $('#txtpassword').val();
                managedObj.credentials = credentials;

                $http({
                    method: 'PUT',
                    params:parameters,
                    url :url,
                    data: JSON.stringify(managedObj)
                }).success(function(data, status, headers){
                    $scope.suspendResumeFromTarget();

                    ngDialog.open({
                        dialogType:'Information',
                        dialogMessage: gettext("Data is updated successfully for managed appliance.")
                    });
                    $(document).trigger("editappliance");
                }).error(function(response) {
                    ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'add-management-error-dailog',
                        dialogMessage:response.result[0].message
                    })
                });
            }else{
                $scope.suspendResumeFromTarget();
            }

        };

        $scope.suspendResumeFromTarget = function(){
            var replicationsuspendurl="/api/replication/suspend/source/?sid=";
            var replicationresumeurl="/api/replication/resume/source/?sid=";
            var arg={};

            // Check state to see if want to change it.
            var currentlySuspended = $scope.selectedAppliance.status == "suspended";
            var wantToSuspend = $('#suspendBackupSelection').prop("checked") == true;

            arg.source_hostname = $scope.selectedAppliance.name;

            if (wantToSuspend == true && currentlySuspended == false){
                replicationsuspendurl += $rootScope.local.id;

                $http({
                    method: 'PUT',
                    url :replicationsuspendurl,
                    data: JSON.stringify(arg)
                }).success(function(data, status, headers){
                    ngDialog.open({
                        dialogType:'Information',
                        dialogMessage: gettext("Suspended copies to target from selected source successfully.")
                    });
                    $(document).trigger("editappliance");
                }).error(function(response) {
                    ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'suspend-error-message-dailog',
                        dialogMessage:response.result[0].message
                    })
                });

            } else if (wantToSuspend == false && currentlySuspended == true) {
                replicationresumeurl += $rootScope.local.id;

                $http({
                    method: 'PUT',
                    url :replicationresumeurl,
                    data: JSON.stringify(arg)
                }).success(function(data, status, headers){
                    ngDialog.open({
                        dialogType:'Information',
                        dialogMessage: gettext("Resumed copies to target from selected source successfully.")
                    });
                    $(document).trigger("editappliance");
                }).error(function(response) {
                    ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'suspend-error-message-dailog',
                        dialogMessage:response.result[0].message
                    })
                });
            }
        }
    
}]);