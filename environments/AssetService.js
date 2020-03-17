var assetOperations = angular.module('asset_service', []);

assetOperations.service("AssetService",['$rootScope', function($rootScope) {

    var serverEdit = false;
    var credentials = [];

    this.sortIDs = function(a, b){
        return (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0);
    };

    this.getSystemsList = function(){
        //PHD.appliance_sid = 1; // default to local
        console.log('set appliance id to ' + PHD.appliance_sid);
        return PHD.Ajax.get('/api/systems');
    };

    this.getCredentials = function(systemID, copyAsset) {
        var isCopiedAsset = copyAsset || false;
        // Do not go to the server if a copied asset, return an empty set of results.
        if (!isCopiedAsset) {
            if(systemID == null || typeof systemID === "undefined"){
                systemID = $rootScope.local.id;
            }
            return PHD.Ajax.get('/api/credentials/?sid=' + systemID);
        } else {
            var data = {data: []};
            return $.when(data);
        }
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

    // doesAssetTypeSupportEncryption should be false for Oracle and SharePoint assets
    this.getApplianceEncryptionStatus = function(associatedAppliance, assetEncryptionStatus, serverEdit, doesAssetTypeSupportEncryption, isAgentBased, copyEdit){
        // If the associatedAppliance is not known use the local.
        if (associatedAppliance === null || associatedAppliance === undefined || copyEdit) {
            associatedAppliance = $rootScope.local.id;
        }
        var resp = PHD.Ajax.get("/api/encryption/?sid=" + associatedAppliance);
        resp.done(function (data) {
            if(data != "undefined" && data.data != "undefined" && data != undefined && data.data != undefined)
                data = data.data[0];
            /* Enable Encrypt backup checkbox, for following scenarios
             1) Edit Asset, Appliance Encryption ON/PERSIST
             2) Edit Asset, Appliance Encryption OFF and Asset Encryption ON
             3) Add Asset, Appliance Encryption ON/PERSIST
             */

            if (copyEdit){
                $('#id_encrypted_dropdown').prop('disabled', true);
                $('#id_encrypted').prop('disabled', true);
                $(document).trigger("noEncryption");

            } else {

                if (doesAssetTypeSupportEncryption != undefined && doesAssetTypeSupportEncryption != "undefined" && doesAssetTypeSupportEncryption === false) {

                    $('#id_encrypted').prop('disabled', true);
                    $('#id_encrypted').prop('title', "Backups cannot be encrypted because Oracle and SharePoint Assets do not support encryption.");
                    $("#id_encrypted").prop('checked', false);

                } else {
                    if ((data.state != "off" && serverEdit) || (data.state == "off" && serverEdit && assetEncryptionStatus) || (!serverEdit && data.state != "off")) {
                        $('#id_encrypted').prop('disabled', false);
                        $('#id_encrypted').prop('title', "");
                        if (isAgentBased == undefined || isAgentBased == "undefined" || isAgentBased !== true) {
                            $("#id_encrypted").prop('checked', assetEncryptionStatus);
                        }
                    }
                    else if ((!serverEdit && data.state == "off") || (serverEdit && data.state == "off" && !assetEncryptionStatus)) {
                        $('#id_encrypted').prop('disabled', true);
                        $('#id_encrypted').prop('title', "Backups cannot be encrypted as the associated appliance does not support encryption.");
                        $("#id_encrypted").prop('checked', assetEncryptionStatus);
                        if (isAgentBased != undefined && isAgentBased != "undefined" && isAgentBased === true) {
                            $(document).trigger("noEncryption");
                        } else {
                            $("#id_encrypted").prop('checked', assetEncryptionStatus);
                            if ($('#id_encrypted_dropdown') != undefined && $('#id_encrypted_dropdown') != "undefined") {
                                $('#id_encrypted_dropdown').prop('disabled', true);
                                $('#id_encrypted_dropdown').prop('title', "Backups cannot be encrypted as the associated appliance does not support encryption.");
                            }
                        }
                    }
                }
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

    // Similar to protectsvc iconfunc but compares asset and type strings.
    // It would be good when tuning for performance to add the inventory type id to the protected assets API and use a common function.
    this.getIconForTypeString = function (item) {
        var icon = 'icon-uui-agent-asset';
        var type = item.type;
        if (item.asset_type === ASSET_TYPE_PHYSICAL) {
            if (type === "Windows") {
                return 'icon-uui-agent-asset-win';
            } else {
                return 'icon-uui-agent-asset';
            }
        } else if (type === 'Hyper-V') {
            return 'icon-uui-hyperv-instance';
        } else if (type === 'Hyper-V:VM Instance') {
            return 'icon-uui-hyperv-vm';
        } else if (type === 'VMware') {
            return 'icon-uui-vmware-server';
        } else if (type === 'VMware:VM Instance') {
            return 'icon-uui-vmware-vm';
        } else if (type === 'Xen') {
            return 'icon-uui-citrix-server';
        } else if (type === 'Xen:VM Instance') {
            return 'icon-uui-citrix-vm';
        } else if (item.asset_type === 'AHV Host') {
            return 'icon-hv-cluster';
        } else if (type === 'AHV:VM Instance') {
            return 'icon-uui-nutanix-x';
        } else if (type === 'SQL Server') {
            return 'icon-uui-sql-instance';
        } else if (type ===  'SQL Server Instance') {
            return 'icon-uui-sql-db';
        } else if (type === 'Exchange') {
            return 'icon-uui-exchange-instance';
        } else if (type === 'Exchange Instance') {
            return 'icon-uui-exchange-db';
        } else if (type === 'Oracle') {
            return 'icon-uui-oracle-instance';
        } else if (type === 'Oracle Instance') {
            return 'icon-uui-oracle-db';
        } else if (type === 'SharePoint') {
            return 'icon-uui-sharepoint-instance';
        } else if (type === 'SharePoint Instance') {
            return 'icon-uui-sharepoint-db';
        } else if (type === 'NDMP Device Instance') {
            return 'icon-database';
        } else if (type === 'UCS Service Profile Instance') {
            return 'icon-ram';
        } else if (type === 'Image Level Instance') {
            return 'icon-uui-block-app';
        }
        return icon;
    };
}]);

