angular.module('editFromSource', ['ngDialog'])
.controller('editFromSourceCtrl', ['$scope', '$rootScope', '$http','ngDialog', function($scope, $rootScope, $http,ngDialog) {

        $scope.initCtrl = function(dlg){
            switch (dlg.name){
                case 'Backup-Copy-Edit-Target':
                    $scope.init();
                    break;
                default:
                    // No action.
                    break;
            }
        };

        $scope.strUsername="";
        $scope.strPassword="";
        $scope.strtooltip = "";
        $scope.isDisabled=true;

        $scope.selectedAppliance = $scope.ngDialogData.selectedAppliance;
        $scope.target = $scope.ngDialogData.target;

        $scope.init = function () {
            $scope.$form = $("form[name=editFromSourceForm]");

            $scope.$form.validate({
                errorLabelContainer: "#dialog-error-list",
                errorContainer: "#dialog-errors",
                showErrors: function(errorMap, errorList) {
                    $("#dialog-errors").find(".summary")
                        .html(gettext("Correct the following errors:"));
                    this.defaultShowErrors();
                },
                rules: {
                    username: {
                        required:  true //!$('#txtuserName').prop('disabled')
                    },
                    password: {
                        required: true //!$('#txtpassword').prop('disabled')
                    }
                },
                messages: {
                    username: {
                        required: gettext("Username is required")
                    },
                    password: {
                        required: gettext("Password is required")
                    }
                }
            });
        };

        $scope.onEditCredentialsChange=function(){
            if($('#updateTargetCredentials').prop("checked") == false){
                $('#txtuserName').attr('disabled','disabled');
                $('#txtpassword').attr('disabled','disabled');
                $('#txtuserName').removeAttr('required');
                $('#txtuserName').removeAttr('required');
            }else{
                $('#txtuserName').removeAttr('disabled');
                $('#txtpassword').removeAttr('disabled');
                $('#txtuserName').prop('required',true);
                $('#txtpassword').prop('required',true);
            }
        };

        $scope.editTargetCredentials = function(){

            if (!$scope.$form.valid()) {
                return false;
            }

            if($('#updateTargetCredentials').prop("checked") == true){
                var parameters = {};
                var targetObj={};
                var user = {};
                var url = "/api/users/";

                targetObj.target = $scope.target.id;
                targetObj.name = $('#txtuserName').val();
                targetObj.password = $('#txtpassword').val();

                $http({
                    method: 'PUT',
                    params:parameters,
                    url :url,
                    data: JSON.stringify(targetObj)
                }).success(function(data, status, headers){
                     ngDialog.open({
                        dialogType:'Information',
                        dialogMessage: "Credentials updated successfully for target appliance."
                    });
                }).error(function(response) {
                    ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'edit-backupcopy-error',
                        dialogMessage:response.result[0].message
                    })
                });
            }
        };

        $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });
}]);