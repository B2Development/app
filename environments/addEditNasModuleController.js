angular.module('addEditNasModule', ['ngDialog', 'angulartics', 'angulartics.google.analytics'])
.config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            plain: false,
            showClose: true,
            closeByDocument: true,
            closeByEscape: true,
            appendTo: false,
            preCloseCallback: function (value) {

            }
        });
    }])
.controller('addEditNasModuleController', ['$scope', '$rootScope', '$http', 'ngDialog', 'AssetService', '$analytics', 'gettextCatalog', '$q',
    function($scope, $rootScope, $http, ngDialog, AssetService, $analytics, gettextCatalog, $q) {

        var unbindHandler = null;
        $scope.MinMaxRetentionName = "";
        var retentionPolicySelect;
        var $retentionPolicySelect;

        $scope.gridData = [$scope.affectedBackups];

        $scope.assetNAS={};
        $scope.assetNAS.properties={};
        $scope.assetNAS.usage='source';
        $scope.assetNAS.type=4;
        $scope.applianceList=[];
        $scope.credentials = {};
        $scope.assetNAS.is_encrypted = false;
        var selectedCredentialID = 0;
    if ($scope.copyEdit){
        $scope.grandClient = true;
    }
    if($scope.isEdit){
        console.log($scope.assetList);
        $scope.dialogTitle = gettext('Edit');
        if($scope.isNDMP) {
            $scope.assetNAS.name=$scope.assetList.name;
            $scope.assetNAS.id=$scope.assetList.id;
            $scope.assetNAS.instance_id = $scope.assetList.file_level_instance_id;
            $scope.assetNAS.properties.hostname =$scope.assetList.ip;
            $scope.assetNAS.properties.protocol = "ndmp";
            $scope.assetNAS.properties.port =  parseInt($scope.assetList.remote_port);
            $scope.assetNAS.vendor = $scope.assetList.vendor;
            $scope.assetNAS.credential = $scope.assetList.credentials;
        } else {
            $scope.assetNAS.name=$scope.assetList.name;
            $scope.assetNAS.id=$scope.assetList.id;
            $scope.assetNAS.instance_id = $scope.assetList.file_level_instance_id;
            $scope.assetNAS.properties.hostname = $scope.assetList.nas_properties.hostname;
            $scope.assetNAS.properties.nas_id   =   $scope.assetList.nas_properties.nas_id;
            $scope.assetNAS.properties.protocol = $scope.assetList.nas_properties.protocol;
            $scope.assetNAS.properties.port =  parseInt($scope.assetList.nas_properties.port);
            $scope.assetNAS.properties.share_name = $scope.assetList.nas_properties.share_name;
            $scope.assetNAS.properties.username = $scope.assetList.nas_properties.username;
        }
        $scope.assetNAS.is_encrypted = (typeof($scope.assetList.is_encrypted) != 'undefined') ? $scope.assetList.is_encrypted: false;
        $scope.MinMaxRetentionName = $scope.assetList.retention;

    }else{
        $scope.dialogTitle = gettext('Add');
        $scope.assetNAS.properties.protocol = 'nfs';
        $scope.assetNAS.properties.port=2049;
    }
    $http({
        method: 'get',
        url : '/api/systems'
    }).success(function(data, status, headers){
         console.log('data');
          console.log(data);
        for (var i=0 ;  i< data.appliance.length; i++){
            //Don't try to add a client to a system that is not available
            if ( data.appliance[i].status != "not available" ) {
                var obj = {
                    id: data.appliance[i].id,
                    name: data.appliance[i].name
                };
                $scope.applianceList.push(obj);
            }
        }
        $scope.assetNAS.system = ($scope.isEdit)?$scope.assetList.system_id: $scope.applianceList[0].id;
        $scope.getApplianceEncryptionStatusForNAS($scope.assetNAS.system, $scope.assetNAS.is_encrypted, $scope.isEdit);
        if ( $scope.isEdit ) {
            $scope.changePort();
            $scope.getRetention();

        }
        if ($scope.copyEdit){
            $('#id_ip').disable();
            $('#id_protocol').disable();
            $('#id_port').disable();
            $('#id_share').disable();
            $('#id_credentials_username').disable();
            $('#id_credentials_password').disable();
        }
      }).error(function(response){
        
    });

        $scope.getRetention = function () {

            $retentionPolicySelect = $("#id_retentionPolicy");

            $scope.associatedAppliance = serverEdit ? $scope.assetNAS.id : PHD.appliance_sid;
            retentionPolicySelect = $retentionPolicySelect[0];
            if (retentionPolicySelect.options !== undefined) {
                retentionPolicySelect.options.length = 0;
            }
            //Xen, AHV and VMware implementation is different and we have vCenter RRC-> ESX -> VMs.
            var strategy = PHD.Ajax.get('/api/retention/strategy/?sid=' + $scope.associatedAppliance, null, handlePolicyError);
            strategy.done(function(data){
                if(data.data.strategy === "MinMax"){
                    $scope.retentionStrategy = "MinMax";
                    $scope.getMinMaxRetention();
                }
                else{
                    $scope.retentionStrategy = "ltr";
                    $scope.getLongTermRetention();
                }
            });
        };
        function refreshRetentionList(associatedAppliance) {
            return PHD.Ajax.get('/api/retention/policy/?sid=' + associatedAppliance, null, this.handlePolicyError);
        }

        function handlePolicyError(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined &&
                    data.result[0].message.indexOf("strategy of the system is not GFS") !== -1) {
                    console.log("Not GFS, don't allow assignment of policies");
                    $scope.isPolicyGFS = false;
                    $('#retentionSection').prop('disabled', true);
                    $('.retentionPolicyList').prop('disabled', true);
                    $('.retentionPolicyList').attr('title', data.result[0].message);
                } else {
                    PHD.throwError(data);
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        }

        $scope.getLongTermRetention = function() {

            var i = 0;
            refreshRetentionList($scope.associatedAppliance).done(function(data){
                $scope.isPolicyGFS = true;
                if(data !== null && data !== undefined && data.data instanceof Array) {
                    var index;
                    var policyId = 0;
                    for (index = 0; index < data.data.length; index++) {
                        var policy = data.data[index];
                        retentionPolicySelect.options[index + i] = new Option(policy.name, policy.id);
                        if (policy.name === $scope.MinMaxRetentionName) {
                            policyId = policy.id;
                        }
                    }
                    retentionPolicySelect.options[index + i] = new Option("None", 0);

                    $("#id_retentionPolicy").val(policyId);
                }
            });
        };
    $scope.launchRetentionManager = function() {
        resp = PHD.Ajax.get("/api/retention/strategy/" + "?sid=" + PHD.appliance_sid );
        resp.done(function(data){
            var result = data.data;
            var strategy = result.strategy;
            if (strategy === 'MinMax') {
                ngDialog.open({
                    template: 'app/configure/retention/min-max.html',
                    overlay: true,
                    name: 'MinMaxRetention',
                    data:$scope.assetList,
                    ngDialogStyle:'width:700px; height:440px;',
                    closeByDocument: false,
                    closeByEscape: false
                });
            } else {
                $scope.launchGFSRetentionManager(associatedAppliance);
            }
        });

    };
    $scope.validation = function(){
            $scope.nasName = false;
            $scope.nasIp = false;
            $scope.nasShareName = false;
            $scope.NDMPcredentialName = false;
            $scope.NDMPcredentialUsername = false;
            $scope.NDMPcredentialPassword = false;
        var FQDN_REGEXP = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])(\:[0-9]{1,5})?$/i;
        var NAME_REGEXP = /^[a-zA-Z0-9_-]*$/;
        if (typeof $scope.assetNAS.name == 'undefined' || !NAME_REGEXP.test($scope.assetNAS.name)){
            $scope.nasName = true;
            return false;
        }else if (typeof $scope.assetNAS.properties.hostname == 'undefined' || $scope.assetNAS.properties.hostname == '' || !FQDN_REGEXP.test($scope.assetNAS.properties.hostname)){
            $scope.nasIp = true;
            return false;
        }else if ((typeof $scope.assetNAS.properties.share_name == 'undefined' || $scope.assetNAS.properties.share_name == '') && $scope.isNDMP != true) {
            $scope.nasShareName = true;
            return false;
        } else if ($scope.isNDMP == true && selectedCredentialID == 0 && (typeof $scope.credential.name == 'undefined' || $scope.credential.name == '')) {
            $scope.NDMPcredentialName = true;
            return false;
        } else if ($scope.isNDMP == true && selectedCredentialID == 0 && (typeof $scope.credential.username == 'undefined' || $scope.credential.username == '')) {
            $scope.NDMPcredentialUsername = true;
            return false;
        } else if ( $scope.isNDMP == true && selectedCredentialID == 0 && (typeof $("#id_credentials_password_ndmp").val() == 'undefined' || $("#id_credentials_password_ndmp").val() == '')) {
            $scope.NDMPcredentialPassword = true;
            return false;
        }else {
            $scope.nasName = false;
            $scope.nasIp = false;
            $scope.nasShareName = false;
            $scope.NDMPcredentialName = false;
            $scope.NDMPcredentialUsername = false;
            $scope.NDMPcredentialPassword = false;
            return true;
        }

    };
    $scope.changePort = function(){
        if($scope.assetNAS.properties.protocol == "nfs") {
           $scope.assetNAS.properties.port=2049;
            $scope.isNDMP = false;
        } else if ($scope.assetNAS.properties.protocol == "ndmp") {
            $scope.assetNAS.properties.port=10000;
            $scope.isNDMP = true;
            AssetService.getCredentials($scope.assetNAS.system).done(function (data) {
                console.log("GET credentials");
                credentials = data.data;
                credentials.forEach(function (credential, index) {
                    if(credential.display_name != undefined){
                        var display = credential.display_name;
                        if (credential.is_default) {
                            display += " (Default)";
                        }
                        credential.display = display;
                    }
                    else{
                        credentials.splice(credentials.indexOf(credential),1);
                    }
                });
                populateCredentials();
            });
        } else {
            $scope.assetNAS.properties.port=445;
            $scope.isNDMP = false;
        }
    };

    $scope.getApplianceEncryptionStatusForNAS = function(associatedAppliance, assetEncryptionStatus, serverEdit){
        // If the associatedAppliance is not known use the local.
        if (associatedAppliance === null || associatedAppliance === undefined) {
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
            if ( (data.state != "off" && serverEdit) || (data.state == "off" && serverEdit && assetEncryptionStatus) || (!serverEdit && data.state != "off") ) {
                $('#id_nas_encrypted').prop('disabled', false);
                $('#id_nas_encrypted').prop('title', "");
            }
            else if ( (!serverEdit && data.state == "off") || (serverEdit && data.state == "off" && !assetEncryptionStatus) ) {
                $('#id_nas_encrypted').prop('disabled', true);
                $('#id_nas_encrypted').prop('title', "Backups cannot be encrypted as the associated appliance does not support encryption.");
                $("#id_nas_encrypted").prop('checked', assetEncryptionStatus);
            }
            // disable encryption in case of copied assets page
            if ($scope.copyEdit){
                $("#id_nas_encrypted").prop('checked', assetEncryptionStatus);
                $('#id_nas_encrypted').prop('disabled', true);
                $('#id_nas_encrypted').prop('title', "Cannot modify this on the Copied Assets page.");
            }
        })
        };

    $scope.showDialogTooltips = function(){
        var form = angular.element("#form-server");
        form.find(".definition").popover({
            appendTo: form
        });
    };

    $scope.saveNAS = function() {
        if ($scope.validation()) {
            $scope.associatePolicy($scope.assetNAS.system)
                .then(function () {
                    if ($scope.copyEdit) {
                        // Only save if not a copied asset.
                        $scope.closeAssetDialog(true);
                    } else {
                        $scope.saveNASAfterPolicySave();
                    }
                });
        }
    };

    $scope.saveNASAfterPolicySave = function() {
                var url = '';
                var httpMethod = '';
                var dataObject = {};
                if ($scope.isEdit) {
                    if ($scope.isNDMP) {
                        dataObject.name = $scope.assetNAS.name;
                        dataObject.is_auth_enabled = true;
                        dataObject.remote_port = $scope.assetNAS.properties.port;
                        dataObject.remote_address = $scope.assetNAS.properties.hostname;
                        dataObject.is_encrypted = $scope.assetNAS.is_encrypted;
                        console.log("selected = " + selectedCredentialID);
                        if (selectedCredentialID == 0) {
                            var credentials = {};
                            credentials.display_name = $scope.credential.name;
                            credentials.username = $scope.credential.username;
                            credentials.password = $scope.credential.name;
                            credentials.password = $("#id_credentials_password_ndmp").val();
                            credentials.domain = $("#id_domain").val();
                            credentials.is_default = $("#id_default").prop("checked");
                            dataObject.credentials = credentials;
                        }
                        else {
                            dataObject.credential_id = parseInt(selectedCredentialID);
                        }

                        console.log("PUT called to update a NDMP Asset. AssociatedAppliance .  " + $scope.assetNAS.system);

                        url = '/api/clients/' + $scope.assetNAS.id + '/?sid=' + $scope.assetList.system_id;
                    } else {
                        dataObject.properties = $scope.assetNAS.properties;
                        dataObject.usage = $scope.assetNAS.usage;
                        dataObject.type = $scope.assetNAS.type;
                        url = '/api/storage/' + $scope.assetNAS.properties.nas_id + '/?sid=' + $scope.assetList.system_id;
                    }
                    httpMethod = 'put';
                } else {
                    if ($scope.isNDMP) {
                        dataObject.name = $scope.assetNAS.name;
                        dataObject.os_type = "NAS NDMP Client"; //const ADD_CLIENT_DISPLAY_NAME_NAS_NDMP_CLIENT   = 'NAS NDMP Client';
                        dataObject.priority = 300;
                        dataObject.is_enabled = true;
                        dataObject.is_synchable = false;
                        dataObject.use_ssl = false;
                        dataObject.is_auth_enabled = true;
                        dataObject.is_encrypted = $scope.assetNAS.is_encrypted;
                        dataObject.port = $scope.assetNAS.properties.port;
                        dataObject.oid = 40; // OS_GENERIC
                        dataObject.generic_property = 4; // const GENERIC_PROPERTY_NDMP_DEVICE    = 4;

                        var hostInfo = {};
                        hostInfo.ip = $scope.assetNAS.properties.hostname;
                        dataObject.host_info = hostInfo;

                        console.log("selected = " + selectedCredentialID);
                        if (selectedCredentialID == 0) {
                            var credentials = {};
                            credentials.display_name = $scope.credential.name;
                            credentials.username = $scope.credential.username;
                            credentials.password = $scope.credential.name;
                            credentials.password = $("#id_credentials_password_ndmp").val();
                            credentials.domain = $("#id_domain").val();
                            credentials.is_default = $("#id_default").prop("checked");
                            dataObject.credentials = credentials;
                        }
                        else {
                            dataObject.credential_id = parseInt(selectedCredentialID);
                        }

                        console.log("POST called to add a NDMP Asset. AssociatedAppliance .  " + $scope.assetNAS.system);

                        url = '/api/clients/?sid' + $scope.assetNAS.system;
                    } else {
                        dataObject = $scope.assetNAS;
                        url = '/api/storage/?sid=' + $scope.assetNAS.system;
                    }
                    httpMethod = 'post';
                }
                var load = PHD.showLoadingIndicator("body", true, "Saving...");
                $http({
                    method: httpMethod,
                    url: url,
                    data: JSON.stringify(dataObject)
                }).success(function (data) {
                    PHD.hideLoadingIndicator(load);
                    if ($scope.isEdit) {
                        dataObject.is_encrypted = $scope.assetNAS.is_encrypted;
                        console.log("PUT called to update encryption for an NDMP Asset. AssociatedAppliance .  " + $scope.assetNAS.system);

                        url = '/api/clients/' + $scope.assetNAS.id + '/?sid=' + $scope.assetList.system_id;
                        var load2 = PHD.showLoadingIndicator("body", true, "Saving...");
                        $http({
                            method: 'put',
                            url: url,
                            data: JSON.stringify(dataObject)
                        }).success(function (data) {
                            PHD.hideLoadingIndicator(load2);
                            $scope.checkTourOnOff();
                            $scope.closeAssetDialog(true);
                        }).error(function (response) {
                            PHD.hideLoadingIndicator(load2);
                            ngDialog.open({
                                dialogType: 'retry',
                                dialogMessage: response.result[0].message
                            })
                        });
                    } else {
                        $scope.checkTourOnOff();
                        $scope.closeAssetDialog(true);
                    }
                }).error(function (response) {
                    PHD.hideLoadingIndicator(load);
                    ngDialog.open({
                        dialogType: 'retry',
                        dialogMessage: response.result[0].message
                    })
                });

            };

        // When closing the asset dialog, unbind the ngDialog listener and if the asset was changed, trigger a reload.
        $scope.closeAssetDialog = function(triggerChange) {
            var changed = triggerChange || false;
            $scope.closeThisDialog();
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
            if (changed) {
                $(document).trigger("assetChange");
            }
        };

        $scope.affectedBackupsData = {
            data: 'affectedBackups',
            multiSelect: false,
            enableSelectAll: false,
            selectionRowHeaderWidth: 30,
            rowHeight: 26,
            enableFullRowSelection: false,
            enableFiltering: true,
            enableSorting: true,
            enableColumnResizing: true,
            gridMenuShowHideColumns: true,
            enableColumnMenus: true,
            enableGridMenu: true,
            enableHorizontalScrollbar: 0,
            onRegisterApi: function (gridApi) {
                $scope.onRegisterGrid(gridApi);
            }
        };

        $scope.affectedBackupsData.columnDefs = [
            {
                field: "id",
                visible: false
            },
            {
                field: "client_name",
                displayName: gettextCatalog.getString("Asset"),
                headerCellFilter: 'translate',
                visible: true,
                type: 'string'
            },
            {
                field: "server_name",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("Server Name"),
                cellTooltip: true,
                visible: false,
                type: "string"
            },
            {
                field: "database_name",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("DB Name"),
                cellTooltip: true,
                visible: true,
                type: "string"
            },
            {
                field: "vm_name",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("VM Name"),
                cellTooltip: true,
                visible: false,
                type: "string"
            },
            {
                field: "start_time",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("Date/Time"),
                cellTooltip: true,
                visible: true,
                type: "string",
                width: 150
            },
            {
                field: "type",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("Type"),
                cellTooltip: true,
                visible: true,
                type: "string",
                width: 150
            },
            {
                field: "replicated",
                headerCellFilter: 'translate',
                displayName: gettextCatalog.getString("Replicated"),
                cellTooltip: true,
                visible: false,
                type: "string",
                width: 100
            }
        ];
        $scope.onRegisterGrid = function (gridApi) {
            $scope.gridApi = gridApi;
            gridApi.selection.on.rowSelectionChanged($scope, function (rows) {
                var selectedItems = gridApi.selection.getSelectedRows();
                if (selectedItems.length > 0) {
                    $scope.selectedItem = selectedItems[0];
                } else if (selectedItems.length === 0) {
                    $scope.selectedItem = null;
                }
            });
        };


    $scope.onChangePolicy = function(){
        var url = "/api/retention/affected-backups/?sid=" + $scope.assetNAS.system;
        var selectedPolicy = $retentionPolicySelect.val();
        var obj = {};
        var affected = {};

        var retentionArray = [];
        if ($scope.assetNAS) {
            affected = {};
            affected.instance_id = parseInt($scope.assetNAS.instance_id);
            affected.policy_id = parseInt(selectedPolicy);
            retentionArray.push(affected);
        } else {
            var assetsForAffectedAPI = $scope.assets;
            if ($scope.assets.length === 1 && $scope.assets[0].children !== undefined && $scope.assets[0].children.length > 0) {
                assetsForAffectedAPI = $scope.assets[0].children;
            }
            for (var i = 0; i < assetsForAffectedAPI.length; i++) {
                affected = {};
                affected.instance_id = parseInt(assetsForAffectedAPI[i].id);
                affected.policy_id = parseInt(selectedPolicy);
                retentionArray.push(affected);
            }
        }

        obj.retention = retentionArray;
        var params = JSON.stringify(obj);
        var load = PHD.showLoadingIndicator("body", true, "Checking for affected backups ...");

        $http({
            method: 'post',
            url: url,
            data: params
        }).success(function (data, status, headers) {
            if (data !== undefined && data.backups !== undefined){
                $scope.affectedBackups = data.backups;
                ngDialog.open({
                    template: 'app/configure/retention/affected-backups.html',
                    overlay: true,
                    scope: $scope,
                    name: 'affected-backups',
                    ngDialogStyle:'width:1200px; height:auto; padding-bottom:50px',
                    closeByDocument: false,
                    closeByEscape: true
                });
                PHD.hideLoadingIndicator(load);
            } else {
                PHD.hideLoadingIndicator(load);
            }
        }).error(function (response) {
            var error = response.result[0].message;
            console.log("The error is:::: " + error);
        });
    };

    $scope.associatePolicy = function (sid) {
        var retentionArray = [];
        var obj = {};

        var def = $q.defer();

        if (!$scope.isPolicyGFS){
            def.resolve(true);
            return def.promise;
        }

        var selectedPolicy = $retentionPolicySelect.val();
        var policy = {};
        policy.instance_id = parseInt($scope.assetNAS.instance_id);
        policy.policy_id = parseInt(selectedPolicy);
        retentionArray.push(policy);

        obj.retention = retentionArray;
        var params = JSON.stringify(obj);
        var url = "/api/retention/?sid=" + sid;
        console.log("Policy Object:::: " + policy);
        console.log("params:::::: " + params);
        $http({
            method: 'post',
            url: url,
            data: params
        }).success(function (data, status, headers) {
            console.log("Policy applied:::: ");
            def.resolve();
        }).error(function (response) {
            var error = response.result[0].message;
            console.log("The error is:::: " + error);
            ngDialog.open({
                dialogType:'ERROR',
                modelDialogId:'EditAssetErrorDialog',
                scope:$scope,
                dialogMessage: error,
                onConfirmOkButtonClick:'onConfirmError()'
            });
            def.reject();
        });
        return def.promise;
    };

    $scope.onConfirmError = function () {
        ngDialog.close('EditAssetErrorDialog');
    };
    
    $scope.closedAddEditNASDlg = function(triggerChange){
        var changed = triggerChange || false;
        $scope.checkTourOnOff();
        if (changed) {
            $(document).trigger("assetChange");
        }
    };
    
    $scope.checkTourOnOff = function(){
        ngDialog.close("addeditnasdailogId"); 
        if(resetTour){
            refreshPage();
            setTimeout(function(){
                var $scope = $("[ng-controller=GlobalCtrl]").scope();
                $scope.user.showTour = true;
                if ($scope.tourBackupDisabled) {
                    $scope.tourBackupDisabled = false;
                }
                window.location.href = "#/dashboard/"; 
                resetTour = false;
                $(".btn-pref-cancel").trigger('click');
            }, 1000);
         }
    };

        $(document).one('retentionChange', function(event, obj) {
            $scope.closedAddEditNASDlg(true);
        });

        function showCredentialsFormWithBlankValues() {
            $scope.selectedCredential = $scope.credentials[0];
            $( "#id_credentials_form" ).show();
            $("#id_credentials_displayName").val("");
            $("#id_credentials_username").val("");
            $("#id_credentials_password").val("");
            $("#id_domain").val("");
        }

        $scope.credentialChange = function() {
            selectedCredentialID = $scope.selectedCredential.value;
            if (selectedCredentialID == 0) {
                showCredentialsFormWithBlankValues();
            } else {
                $( "#id_credentials_form" ).hide();
            }
        };

        function populateCredentials() {
            $scope.credentials = [{name:'New', value: 0}];
            $scope.selectedCredential = $scope.credentials[0];
            var i = 0;
            if (credentials.length > 0) {
                credentials.forEach(function (credential, index) {
                    if (credential.display !== null && credential.display !== undefined && credential.display.length > 0) {
                        $scope.credentials.push({name:credential.display, value:credential.credential_id});
                    }
                    if ( $scope.isEdit && $scope.assetNAS.credential.credential_id === credential.credential_id ) {
                        $scope.selectedCredential = $scope.credentials[index + 1];  // Index is off by one because of 'New'
                        $scope.credentialChange();
                    }
                })
            }
            $scope.$apply($scope.credentials);
        }

        $scope.initCtrl = function (obj) {
            switch (obj.name) {
                case 'add-edit-nas-dialog':
                    if ($scope.isEdit) {
                        // If this appliance does not allow the user to manage retention, change the definition text.
                        if (!$rootScope.showRetention) {
                            $("#id-retention-definition").text(gettextCatalog.getString("Retention may not be changed for this appliance model."));
                        }
                    }
                    $scope.showDialogTooltips();
                    break;
                default: break;
            }
        };

        // Initialize the controller, returning the function to turn off the listener.
        unbindHandler = $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });


    }]);
