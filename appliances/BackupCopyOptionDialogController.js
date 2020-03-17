angular.module('backupCopyOptionDialogModule', ['ngDialog'])

.controller('BackupCopyOptionDialogController', ['$scope', '$rootScope', '$http','ngDialog', function($scope, $rootScope, $http,ngDialog) {
    
    $scope.applianceObject = $("[ng-controller=AppliancesCtrl]").scope(); 
    $scope.applianceStorageArr=[];
    $scope.formName = {};
    $scope.strApprovalDeniedMessage= "";
    $scope.applianceStoragename={};
    $scope.selectedPendingSource = $scope.ngDialogData.selectedPendingSource;
    var loader;
    
    $http({
        method: 'GET',
        url: '/api/storage/?sid=1&usage=backup' 
    }).success(function(data, status, headers) {
        if (data && data.storage) {
            $scope.applianceStorageArr = data.storage;
            
            if((data.storage) != null && ($scope.applianceStorageArr.length > 0)){
                $scope.applianceStoragename = $scope.applianceStorageArr[0];
            }
        }
    }); 
    
    $scope.init = function (dlg) {
       
        $scope.isStorageShow = false;
        $scope.selectionchangeflag = false;
        $scope.processDialog(PHD, window);
    }
    
    $scope.onBackupCopyOptionChange=function(){
        $scope.selectionchangeflag =true;
    }

    $scope.processDialog = function(PHD, window){
        var $form = $("form[name=backupCopyOptionForm]");
        $scope.$form = $form;

        var backupCopyOptionForm = PHD.FormController($form, {
            serialize: function ($form) {
                return $form.find("input").serialize();
            }
        });
        
        $.validator.addMethod("isSelectTargetStorage", function(value, element) { 
            var strSelectStorage = $('#backup-copy-selectstorage').val();

            if($scope.backupCopySelection == 'approval'){
                if(strSelectStorage != "?"){
                    return true;
                }else{
                    return false;
                }
            }else{
                return true;
            }
        }, gettext("Select storage from list"));
        
        $.validator.addMethod("isReasonRequired", function(value, element) { 
            var strReason = $('#backup-copy-not-approval-textarea').val();

            if($scope.backupCopySelection == 'notapproval'){
                if(strReason != '' && strReason != undefined){
                    return true;
                }else{
                    return false;
                }
            }else{
                return true;
            }
        }, gettext("Reason for approval denied required"));

        backupCopyOptionForm
                .validate({
                    errorLabelContainer: "#dialog-error-list",
                    errorContainer: "#dialog-errors",
                    showErrors: function(errorMap, errorList) {
                        $("#dialog-errors").find(".summary")
                            .html(gettext("Correct the following errors:"));
                        this.defaultShowErrors();
                    },
                    rules: {
                        name: {
                            isSelectTargetStorage:true
                        },
                        strApprovalDeniedMessage: {
                            isReasonRequired:true
                        }
                    },
                    messages: {
                        name: {
                            isSelectTargetStorage: gettext("Select storage from list")
                        },
                        strApprovalDeniedMessage: {
                            isReasonRequired: gettext("Reason for approval denied required")
                        }
                    }
                });
    }
    
    $scope.replicationPendingApproval = function(){
        var parameters = {};
        var pendingObj={};
        var request_id = 0;
        var url = "/api/replication/source/";
        
        if ((!$scope.$form.valid())) {
            return false;
        }
        
        if($scope.backupCopySelection == 'notapproval'){
            pendingObj.accept = false;
            pendingObj.request_id = $scope.selectedPendingSource.request_id;
            pendingObj.message = $scope.strApprovalDeniedMessage;

        }else{
            pendingObj.accept = true;
            pendingObj.request_id = $scope.selectedPendingSource.request_id;
            pendingObj.storage_id = $scope.applianceStoragename.id;
        }

        loader = PHD.showLoadingIndicator("body", true, gettext("Saving..."));
        
        $http({
            method: 'POST',
            params:parameters,
            url :url,
            data: JSON.stringify( pendingObj)
        }).success(function(data, status, headers){
            PHD.hideLoadingIndicator(loader);
             if($scope.backupCopySelection == 'notapproval'){
                ngDialog.open({
                    dialogType:'Information',
                    dialogMessage: gettext("Backup copies from this appliance have been rejected.")
                })
             }else{
                ngDialog.open({
                    dialogType:'Information',
                    dialogMessage:gettext("Backup Copies from this appliance have been approved.")
                })
             }
        }).error(function(response) { 
            PHD.hideLoadingIndicator(loader);
            ngDialog.open({
            dialogType:'retry',
            modelDialogId:'replication-source-approval-dailog',
            dialogMessage:response.result[0].message
          })
        });

    };
    
    $scope.$on('ngDialog.opened', function(event,obj) { $scope.init(obj) });
    
}]);