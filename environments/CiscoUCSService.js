var assetOperations = angular.module('cisco_ucs_service', []);

assetOperations.service("CiscoUCSService",['$rootScope', function($rootScope) {

    var ciscoUCSEdit = false;
    var credentials = [];

    this.sortIDs = function(a, b){
        return (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0);
    };

    this.getSystemsList = function(){
        //PHD.appliance_sid = 1; // default to local
        console.log('set appliance id to ' + PHD.appliance_sid);
        return PHD.Ajax.get('/api/systems');
    };

    this.getCredentials = function(systemID) {
        if(systemID == null || typeof systemID === "undefined"){
            systemID = $rootScope.local.id;
        }
        return PHD.Ajax.get('/api/credentials/?sid=' + systemID);
    };

    this.setDialogHeight = function(height){
        $("#resizableDialog").one( "click", function() {
            $(".ngdialog-content").height(height).css({
                height: height + "px;"
            });
        });
    };

    this.clickTitleBarToFixHeight = function() {
        $(".ngdialog-titlebar").click();
    }

    this.getApplianceEncryptionStatus = function(associatedAppliance, isAssetEncrypted, ciscoUCSEdit){
        var resp = PHD.Ajax.get("/api/encryption/?sid=" + associatedAppliance);
        resp.done(function (data) {
            if(data != "undefined" && data.data != "undefined" && data != undefined && data.data != undefined)
                data = data.data[0];
            /* Enable Encrypt backup checkbox, for following scenarios
             1) Edit Asset, Appliance Encryption ON/PERSIST
             2) Edit Asset, Appliance Encryption OFF and Asset Encryption ON
             3) Add Asset, Appliance Encryption ON/PERSIST
             */
            if ( (data.state != "off" && ciscoUCSEdit) || (data.state == "off" && ciscoUCSEdit && isAssetEncrypted) || (!ciscoUCSEdit && data.state != "off") ) {
                $('#id_encrypted').prop('disabled', false);
                $('#id_encrypted').prop('title', "");
                $("#id_encrypted").prop('checked', isAssetEncrypted);
            }
            else if ( (!ciscoUCSEdit && data.state == "off") || (ciscoUCSEdit && data.state == "off" && !isAssetEncrypted) ) {
                $('#id_encrypted').prop('disabled', true);
                $('#id_encrypted').prop('title', "Backups cannot be encrypted as the associated appliance does not support encryption.");
                $("#id_encrypted").prop('checked', isAssetEncrypted);
            }
        })
    };

    this.launchCredentialManager = function() {
        ngDialog.open({
            template: 'app/configure/credentials/credentials.html',
            scope: $scope,
            overlay:true,
            name: 'Credential-Manager',
            modelDialogId : 'credential-manager-dialog',
            ngDialogStyle:'width:700px; height:550px;',
            closeByDocument: false,
            closeByEscape: false,
            preCloseCallback: function (value) {
                processDialog(PHD,window);              //Update the dialog contents after returning from "Manage Credentials"
            }
        });
    };

}]);

