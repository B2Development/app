angular.module('edit_server',['ngDialog'])
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

    .controller('EditServerCtrl', ['$scope', '$rootScope', '$http', 'AssetService', 'ngDialog', 'gettextCatalog', '$q',
        function($scope, $rootScope, $http, AssetService, ngDialog, gettextCatalog, $q) {

        var selectedCredential;
        var selectedCredentialID = -1;
        var associatedAppliance;
        var serverEdit = true;
        var selectedRetention,MinMaxRetentionName;
        var assetId;
        var $formName;
       	var doAllOfTheAssetsSupportEncryption;
        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;
        $scope.encryption_strategy = "none";
        $scope.showEncryptionCheckBox = true;
        $rootScope.retentionStrategy = "";
        $scope.gridData = [$scope.affectedBackups];


        $scope.supportsBlock = false;
        $scope.showVssAppAwareBox = false;
        $scope.allowExchangeBackups_vssAppAwareStrategy = null;

        $scope.initCtrl = function(dlg){
            switch (dlg.name){
                case 'Edit-Server':
                    $formName = "EditServerForm";
                    $scope.editProcessing($scope.ngDialogData);
                    processDialog(PHD, window);
                    break;
                case 'Edit-Assets':
                    $formName = "EditMultipleAssetsForm";
                    $scope.editAssetProcessing($scope.ngDialogData);
                    processDialog(PHD, window);
                    break;
            }
        };

        // AssetService.getApplianceEncryptionStatus will trigger this event if encryption cannot be set.
        $(document).on("noEncryption", function(event) {
            $scope.encryption_strategy = "none";
        });

        $scope.editProcessing = function(asset){
            $scope.assets = asset;
            $scope.grandClient = asset.grandclient;
            assetId = asset.id;

            var tempAssetsArray = [];
            tempAssetsArray.push(asset);
            if ( asset.is_encrypted ) {
                if ($scope.checkEncryptionForTheNodeAndItsChildren( tempAssetsArray ) === true) {
                    $scope.encryption_strategy = "all";
                } else {
                    $scope.encryption_strategy = "top-level";
                }
            } else {
                if ($scope.checkToSeeIfAnyEncryptionIsEnabledForTheNodeAndItsChildren( tempAssetsArray ) === true) {
                    $scope.encryption_strategy = "not-top-level";
                } else {
                    $scope.encryption_strategy = "none";
                }
            }
            $("#retentionSection").show();
            // If this appliance does not allow the user to manage retention, change the definition text.
            if (!$rootScope.showRetention) {
                $("#id-retention-definition").text("Retention may not be changed for this appliance model.");
            }
            $("#id_installAgentDiv").hide();
            $("#id_server").val(asset.name);
            $("#id_ip").val(asset.ip);
            $("#edit_object_id").text(asset.id);
            $("#id_enabled").prop('checked', asset.is_enabled);
            $("#id_encrypted").prop('checked', asset.is_encrypted);
            $('#id_encrypted').prop('disabled', true);
            selectedCredential = asset.credentials != undefined ? asset.credentials.credential_id : -1;
            selectedRetention = asset.retention != undefined ? asset.retention.id_retentionPolicy : 0;
            MinMaxRetentionName = asset.retention;
            associatedAppliance = asset.system_id;
            $scope.selectedSystemID = asset.system_id;
            // Currently, physical assets all support encryption
            doAllOfTheAssetsSupportEncryption = true; //$scope.doTheAssetsAllSupportEncryption can be used in the future if not all physical assets support encryption
            /*
             * For iSeries disable edit of, ip, server, encryption as these are set by the profile (console menu), only allow retention and credentials.
             * If not iSeries, re-enable fields, tooltips, and determine encryption status.
             */
            if (asset.os_type == 'iSeries') {
                $scope.iSeriesAsset = true;
                $("#id_ip").prop('disabled', true);
                $("#id_server").prop('disabled', true);
                $("#credential_id").prop('disabled', true);
                var message = "iSeries asset name and address must be changed by editing the hosts file and using the menu-based console interface.";
                $("#host_name_tooltip").text(message);
                $("#ip_address_tooltip").text(message);
                $("#credentials_tooltip").text("iSeries asset credentials must be managed through the menu-based console interface.");
            } else {
                $scope.iSeriesAsset = false;
                $("#id_ip").prop('disabled', false);
                $("#id_server").prop('disabled', false);
                $("#credential_id").prop('disabled', false);
                $("#host_name_tooltip").text(asset.os_family == "Windows" ? HOSTNAME_ERROR_MESSAGE : HOSTNAME_NON_WINDOWS_ERROR_MESSAGE);
                $("#ip_address_tooltip").text("Enter either the IP address or a resolvable hostname of this system.");
                $("#credentials_tooltip").text("Enter administrative credentials.");
                AssetService.getApplianceEncryptionStatus(associatedAppliance, ($scope.encryption_strategy === "top-level" || $scope.encryption_strategy === "all"), true, doAllOfTheAssetsSupportEncryption, true, $scope.copyEdit);
            }

            if (asset.block_supported === true) {
                $scope.supportsBlock = true;
                // Check to see if the client is "aware of applications" and will do VSS_COPY
                // Thus, Application Backups Quiesce and Image Level Backups Do Not Quiesce
                $scope.allowExchangeBackups_vssAppAwareStrategy = (asset.app_aware_flg === 1);
            }
        };

            // Returns true if an application node is selected in the tree, false otherwise.
            var isAppNodeSelected = function(assets) {
                return (assets.length === 1
                    && assets[0].$$treeLevel === 1                  // $$treeLevel in ui-grid-tree, 2nd level (app)
                    && assets[0].children !== undefined
                    && assets[0].children !== "undefined"
                    && assets[0].children.length > 0
                    && (assets[0].is_encrypted === undefined || assets[0].is_encrypted === "undefined")
                    && (assets[0].type === APPLICATION_TYPE_NAME_EXCHANGE
                        || assets[0].type === APPLICATION_TYPE_NAME_HYPER_V
                        || assets[0].type === APPLICATION_TYPE_NAME_NDMP_DEVICE
                        || assets[0].type === APPLICATION_TYPE_NAME_SQL_SERVER
                        || assets[0].type === APPLICATION_TYPE_NAME_UCS_SERVICE_PROFILE
                        || assets[0].type === APPLICATION_TYPE_NAME_XEN
                        || assets[0].type === APPLICATION_TYPE_NAME_AHV));
            };

            var getClientFromNodeChild = function(assets) {
                var client_id = 0;
                if (assets !== undefined && assets.length === 1) {
                    var children = assets[0].children;
                    if (children.length > 0) {
                        var child = children[0];
                        if (child.parent_id !== undefined) {
                            client_id = child.parent_id;
                        }
                    }
                }
                return client_id;
            };

            $scope.editAssetProcessing = function(assets){
            $scope.assets = assets;

            $("#retentionSection").show();
            // If this appliance does not allow the user to manage retention, change the definition text.
            if (!$rootScope.showRetention) {
                $("#id-retention-definition").text("Retention may not be changed for this appliance model.");
            }
            $("#id_server").hide();
            if ($("#retention_information_text").find('p').length > 0){     
                $("p").remove();
            }
            $scope.checkFromSameSystem = $scope.isFromSameSystem(assets);
            //Check if selected asset/assets is/are associated with local system.
            if($scope.checkFromSameSystem){
                if(assets.length === 1) {           //If only one asset is selected and is a VM we have "Virtual host" e.g. esx server name, XenServer name, field shown in Dialog
                    if (assets[0].asset_type === "VMware:VM" || assets[0].asset_type === "Hyper-V:VM" || assets[0].asset_type === "Xen:VM" || assets[0].asset_type === "AHV:VM") {
                        // TODO: SET VIRTUAL HOST NAME
                        // TODO: Don't we want to display the name of Hyper-V:VM ?
                        console.log("Single VM edit");
                        $("#id_description").text("Edit settings of " + assets[0].asset_type + " - " + assets[0].name);
                        $("#id_virtualHost").text(assets[0].parent_name);
                        associatedAppliance = assets[0].system_id;
                        // At present VMware, Hyper-V, Xen, and AHV all support encryption
                        doAllOfTheAssetsSupportEncryption = true; //$scope.doTheAssetsAllSupportEncryption can be used in the future if VMs stop supporting Encryption
                        AssetService.getApplianceEncryptionStatus(associatedAppliance, assets[0].is_encrypted, true, doAllOfTheAssetsSupportEncryption, undefined, $scope.copyEdit);
                    }
                    else{
                        $("#id_virtualHost_info").hide();
                    }
                }
                else if(assets.length > 1)
                {
                    $("#id_virtualHost_info").hide();
                    $("#id_description").text("Edit settings of " + assets.length + " assets");
                }
                $("#details_box_multiple_assets").show();
                $scope.isEncryptionEnabled = $scope.checkEncryption(assets);

                // Since all of these assets are on the same system and is_quiesce_supported is per system, only one asset needs to be checked
                $scope.isQuiesceSupported = ( assets[0].hasOwnProperty('is_quiesce_supported') && assets[0].is_quiesce_supported === true );
                $scope.quiesceSetting = $scope.getQuiesceSetting(assets);
                // Quiesce Setting is false if any of the assets do not have a quiesce property
                if ( $scope.quiesceSetting !== false ) {
                    // App-aware credentials are only supported for VMware VM's. So check if selected assets are VMware VM's. If yes, show app-aware radio button.
                    $scope.appAwareFlag = $scope.checkAppAware(assets);
                    if ( $scope.isQuiesceSupported === true ) {
                        // Quiesce is supported. Thus show at least two quiesce options (crash consistent and app consistent)
                        $("#quiesce_box").show();
                        $("#quiesce_crash_consistent_radioselection").show();
                        if($scope.appAwareFlag){
                            // All of the selected assets support app aware, and quiesce is supported.  Thus show all 3 quiesce options (crash consistent, app aware, and app consistent) and credentials
                            $("#quiesce_app_aware_radioselection_row").show();
                            $("#credentials_is_allowed").prop("checked",true);
                            $("#credential_id").enable();
                        } else {
                            // Quiesce is supported, but at least some of the assets do not support app aware.  Thus only show 2 quiesce options (crash consistent and app consistent) and do not show credentials
                            $("#quiesce_app_aware_radioselection_row").hide();
                            $("#credentials_is_allowed").prop("checked",false);
                            $("#credential_id").disable();
                        }
                    } else if($scope.appAwareFlag){
                        // All of the selected assets support app aware, but crash consistent quiesce is not supported.  Thus only show 2 quiesce options (app aware and app consistent) and show credentials
                        $("#quiesce_box").show();
                        $("#quiesce_app_aware_radioselection_row").show();
                        $("#quiesce_crash_consistent_radioselection").hide();
                        $("#credentials_is_allowed").prop("checked",true);
                        $("#credential_id").enable();
                    } else {
                        // Not all of the assets support app aware, and quiesce is not supported.  Thus do not show any quiesce options nor any credentials.
                        $("#quiesce_box").hide();
                        $("#credentials_is_allowed").prop("checked",false);
                        $("#credential_id").disable();
                    }

                    // If quiesce settings are shown, then select the radio button that corresponds with the selected assets
                    if ( $("#quiesce_box").is(":visible") ) {
                        switch ( $scope.quiesceSetting ) {
                            case QUIESCE_MULTIPLE_SETTINGS:
                                $("#quiesce_box").height(175);
                                $("#quiesce_multiple_settings_radioselection_row").show();
                                $('#quiesce_multiple_settings_radioselection').prop('checked','true');
                                break;
                            case QUIESCE_SETTING_DISPLAY_NAME_APPLICATION_CONSISTENT:
                                $("#quiesce_box").height(140);
                                $("#quiesce_multiple_settings_radioselection_row").hide();
                                $('#quiesce_app_consistent_radioselection').prop('checked','true');
                                break;
                            case QUIESCE_SETTING_DISPLAY_NAME_APPLICATION_AWARE:
                                $("#quiesce_box").height(140);
                                $("#quiesce_multiple_settings_radioselection_row").hide();
                                $('#quiesce_app_aware_radioselection').prop('checked','true');
                                break;
                            case QUIESCE_SETTING_DISPLAY_NAME_CRASH_CONSISTENT:
                                $("#quiesce_box").height(140);
                                $("#quiesce_multiple_settings_radioselection_row").hide();
                                $('#quiesce_crash_consistent_radioselection').prop('checked','true');
                                break;
                        }
                    }
                }
                else{
                    // Not all of the assets support quiesce, so check and see if they support credentials instead.  Thus do not show any quiesce options.
                    $("#quiesce_box").hide();

                    //If selected assets are not VMware VM's check if credentials are allowed to be shown for selected assets. Eg: Physical assets, Sharepoint, oracle instances.
                    $scope.physicalAssetsFlag = $scope.checkPhysical(assets);
                    $scope.applicationsForAuthentication = $scope.checkAppsAuthSupported(assets);
                    if($scope.physicalAssetsFlag || $scope.applicationsForAuthentication){
                        $("#credentials_is_allowed").prop("checked",true);
                        $("#credential_id").enable();
                    }
                    else{
                        $("#credentials_is_allowed").prop("checked",false);
                        $("#credential_id").disable();
                    }
                }
                selectedCredential = -1;
                // Now check if all selected assets have same credentials associated to them.
                var credential = $scope.checkCredentials(assets);
                if(credential){
                    var credentials = {};
                    credentials = assets[0].credentials;
                    selectedCredential = (credentials != null && credentials != undefined && credentials != "") ? credentials.credential_id : -1;
                }
                else{
                    selectedCredential = -1;
                }
                // Even if a single VMWare host is selected we do not show encryption checkbox in UI since we do not support encryption at VMware host(ESX,VCenter) level.
                $scope.checkVMwareHost =  $scope.isVMwareHost(assets);
                if($scope.checkVMwareHost){
                    $("#details_box_multiple_assets").hide();
                }
                else{
                    doAllOfTheAssetsSupportEncryption  = $scope.doTheAssetsAllSupportEncryption(assets);
                    AssetService.getApplianceEncryptionStatus(associatedAppliance, $scope.isEncryptionEnabled, true, doAllOfTheAssetsSupportEncryption, false, $scope.copyEdit);
                    associatedAppliance = assets[0].system_id;

                    if (doAllOfTheAssetsSupportEncryption === true && isAppNodeSelected(assets)) {
                        //This is an application node
                        $scope.showEncryptionCheckBox = false;
                        // If encryption is false for the appliance, then this should also be disabled.
                        $('#id_encrypted_dropdown').prop('disabled', !($("#id_encrypted").is(':enabled')) );
                        $('#id_encrypted_dropdown').prop('title', $('#id_encrypted').prop('title'));
                        if ($scope.checkEncryptionForTheNodeAndItsChildren( assets ) === true) {
                            $scope.encryption_strategy = "all";
                        } else if ($scope.checkToSeeIfAnyEncryptionIsEnabledForTheNodeAndItsChildren( assets ) === false) {
                            $scope.encryption_strategy = "none";
                        } else {
                            $scope.encryption_strategy = "keep-current";
                        }
                    } else {
                        $scope.showEncryptionCheckBox = true;
                    }
                }
            }
            else{                                                       //If user selects asset from any other system do not allow any operation.
                $("#credentials_is_allowed").prop("checked",false);
                $("#credentials_is_allowed").disable();
                $("#credential_id").disable();
                $("#quiesce_box").hide();
            }
            // Now check retention
            selectedRetention =  0;
            $("#retention_is_allowed").prop("checked",true);
            var flag = $scope.checkRetention(assets);
            // TODO : Why are we setting null here? I am supposed to display the appliance when a single VMware:WM is being edited.
            //associatedAppliance = null;
        };

        $scope.isFromSameSystem = function(data) {
            var index,flag = true;
            var systemID = data[0].system_id;
            for (index = 0; index < data.length; ++index) {
                if(data[index].system_id !== systemID){
                    flag = false;
                    break;
                }
                else{
                    $scope.selectedSystemID = systemID;
                }
            }
            return flag;
        };

        $scope.checkRetention = function(data) {
            var index,flag = true, instances = {};
            if(typeof(data[0].type) !== "undefined"){
                if(data[0].type === "SQL Server" || data[0].type === "Exchange" || data[0].type === "Hyper-V" || data[0].type === "Oracle"
                    || data[0].type === "SharePoint" || data[0].type === "UCS Service Profile" || data[0].type === "NDMP Device"){
                    instances = data[0].children;
                    var commonRetention = instances[0].retention;
                    for (index = 0; index < instances.length; ++index){
                        if(instances[index].min_max_policy){
                            if(instances[index].retention !== commonRetention){
                                flag = false;
                                continue;
                            }
                        }
                        else{
                            flag = false;
                        }
                    }

                    if(data[0].type === "SQL Server" || data[0].type === "Oracle"){
                        console.log("SQL or ORACLE");
                        $(".retention_checkbox_text").text("DB Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings are applied to all databases associated with this application. Existing retention settings will be overwritten.</p>");
                    }
                    else if(data[0].type === "Hyper-V"){
                        console.log("HyperV");
                        $(".retention_checkbox_text").text("VM Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings are applied to all VMs associated with this virtual host. Existing retention settings will be overwritten.</p>");
                    }
                    else if(data[0].type === "Exchange"){
                        console.log("Exchange");
                        $(".retention_checkbox_text").text("Exchange Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings are applied to all databases associated with this Application. Existing retention settings will be overwritten.</p>");
                    }
                    else if(data[0].type === "SharePoint"){
                        console.log("SharePoint");
                        $(".retention_checkbox_text").text("SharePoint Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings will be applied to Sharepoint farm associated with this Application. Existing retention settings will be overwritten.</p>");
                    }
                    else if(data[0].type === "UCS Service Profile"){
                        console.log("UCS Service Profile");
                        $(".retention_checkbox_text").text("UCS Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings are applied to all profiles associated with this UCS. Existing retention settings will be overwritten.</p>");
                    }
                    else if(data[0].type === "NDMP Device"){
                        console.log("NDMP Device");
                        $(".retention_checkbox_text").text("NDMP Backup Retention");
                        $("#retention_information_text").append("<p>Retention settings are applied to all volumes associated with this NDMP device. Existing retention settings will be overwritten.</p>");
                    }

                    if(flag === true){
                        MinMaxRetentionName = commonRetention;
                        //Construct min-max policy array and add it to Application array so it can be used by min-max-config.js
                        var minmaxValues = {};
                        minmaxValues.retention_max = instances[0].min_max_policy.retention_max;
                        minmaxValues.retention_min = instances[0].min_max_policy.retention_min;
                        minmaxValues.legal_hold = instances[0].min_max_policy.legal_hold;
                        $scope.assets[0].min_max_policy = minmaxValues;
                    }
                    else{
                        MinMaxRetentionName = "Multiple";
                        //Construct min-max policy array with 0 values and add it to Application array so it can be used by min-max-config.js
                        var minmaxValues = {};
                        minmaxValues.retention_max = 0;
                        minmaxValues.retention_min = 0;
                        minmaxValues.legal_hold = 0;
                        $scope.assets[0].min_max_policy = minmaxValues;
                    }
                    $("#retention_is_allowed").prop("checked",true);
                    $("#id_retentionPolicy").val(MinMaxRetentionName);
                    /*
                    for min/max retention, the retention policy name will be a disabled text box.
                    var retentionPolicySelect = $("#id_retentionPolicy");
                    retentionPolicySelect = retentionPolicySelect[0];
                    retentionPolicySelect.options[0] = new Option(MinMaxRetentionName, 0);
                    */
                }
                else{
                    for (index = 0; index < data.length; ++index) {
                        if(data[index].min_max_policy){
                            var min = data[0].retention;
                            if(data[index].retention !== min){
                                flag = false;
                                continue;
                            }
                        }
                        else{
                            flag = false;
                        }
                    }
                    if(flag === true){
                        MinMaxRetentionName = data[0].retention;
                    }
                    else{
                        MinMaxRetentionName = "Multiple";
                    }
                }
            }
            return flag;
        };

        $scope.isVMwareHost = function(data) {
            var index,flag = true;
            for (index = 0; index < data.length; ++index) {
                if(data[index].asset_type !== "VMware Host"){
                    flag = false;
                    continue;
                }
            }
            return flag;
        };

        $scope.checkAppAware = function(data) {
            var index,flag = true;
            for (index = 0; index < data.length; ++index) {
                if(data[index].asset_type !== "VMware:VM"){
                    flag = false;
                    break;
                }
            }
            return flag;
        };

        // Data must be an array with at least one element
        // Returns false if not all of the assets have a Quiesce setting
        // Returns QUIESCE_MULTIPLE_SETTINGS if all of the assets have a Quiesce setting but those settings are different
        // Returns the display name if all of the assets have a Quiesce setting and those settings are the same
        $scope.getQuiesceSetting = function(data) {
            var index = true;
            var returnSetting = false;
            if ( data[0].hasOwnProperty('quiesce') ) {
                var firstQuiesceSetting = data[0].quiesce;
                returnSetting = firstQuiesceSetting;
                for (index = 0; index < data.length; ++index) {
                    if ( data[index].hasOwnProperty('quiesce') ) {
                        if (data[index].quiesce !== firstQuiesceSetting) {
                            returnSetting = QUIESCE_MULTIPLE_SETTINGS;
                        }
                    } else {
                        returnSetting = false;
                        break;
                    }
                }
            }
            return returnSetting;
        };

        $scope.checkPhysical = function(data) {
            var index,flag = true;
            for (index = 0; index < data.length; ++index) {
                if(data[index].asset_type !== "physical"){
                    flag = false;
                    continue;
                }
            }
            return flag;
        };

        $scope.checkCredentials = function(data) {
            var index, flag = true;
            for (index = 0; index < data.length; ++index) {
                var cred = data[0].credential_display;
                if(data[index].credential_display !== cred){
                    flag = false;
                    continue;
                }
            }
            return flag;
        };

        $scope.checkAppsAuthSupported = function(data) {
            var index,flag;
            for (index = 0; index < data.length; ++index) {
                if(data[index].asset_type === "Oracle" || data[index].asset_type === "SharePoint" || data[index].asset_type === "VMware:VM") {
                    flag = true;
                }
                else{
                    flag = false;
                    continue;
                }
            }
            return flag;
        };

        $scope.checkEncryption = function(data) {
            var index,flag;
            for (index = 0; index < data.length; ++index) {
                if(data[index].is_encrypted) {
                    flag = true;
                }
                else{
                    flag = false;
                    continue;
                }
            }
            return flag;
        };

        $scope.checkEncryptionForTheNodeAndItsChildren = function(data) {
            var index,flag;
            for (index = 0; index < data.length; ++index) {
                if(data[index].is_encrypted !== false) {
                    flag = true;
                    if ( data[index].children.length > 0 ) {
                        flag = $scope.checkEncryptionForTheNodeAndItsChildren(data[index].children);
                        if ( flag === false ) {
                            break;
                        }
                    }
                } else{
                    flag = false;
                    break;
                }
            }
            return flag;
        };

        // Return true if the node or any of its children do encryption, false otherwise
        $scope.checkToSeeIfAnyEncryptionIsEnabledForTheNodeAndItsChildren = function(data) {
            var index,flag;
            for (index = 0; index < data.length; ++index) {
                if(data[index].is_encrypted !== true) {
                    flag = false;
                    if ( data[index].children.length > 0 ) {
                        flag = $scope.checkToSeeIfAnyEncryptionIsEnabledForTheNodeAndItsChildren(data[index].children);
                        if ( flag === true ) {
                            break;
                        }
                    }
                } else{
                    flag = true;
                    break;
                }
            }
            return flag;
        };

        $scope.doTheAssetsAllSupportEncryption = function(data) {
            var index;
            var flag = true;
            for (index = 0; index < data.length; ++index) {
                if( data[index].asset_type === APPLICATION_TYPE_NAME_ORACLE || data[index].asset_type === APPLICATION_TYPE_NAME_SHAREPOINT ||
                    data[index].type === APPLICATION_TYPE_NAME_ORACLE || data[index].type === APPLICATION_TYPE_NAME_SHAREPOINT ) {
                    flag = false;
                    break;
                }
            }
            return flag;
        };

        function processDialog(PHD, window) {

            var $form = $("form[name=" + $formName + "]");
            $scope.$form = $form;

            var credentials = [];
            var credentialsSelect;
            var $credentialsSelect = $("#credential_id");
            var applianceSelect;
            var $applianceSelect = $("#id_system");
            applianceSelect = $applianceSelect[0];
            applianceSelect.options.length = 0;
            var retentionPolicySelect;
            var $retentionPolicySelect = $("#id_retentionPolicy");

            $scope.ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
            $scope.ipErrorString = gettext("IP Address is not a valid address");

            $scope.credentialNamePattern = /^[ A-Za-z0-9_@./#&+-/!$%^*()=\\|:;'"<>,?`~{}\[\]]{0,64}$/;
            $scope.credentialNameErrorString = gettext("Credential Name: Max 64 characters");

            var editServerForm = PHD.FormController($form, {
                serialize: function ($form) {
                    return $form.find("input").serialize();
                }
            });

            if ($formName === "EditServerForm") {
                editServerForm
                    .validate({
                        rules: {
                            ip: {
                                pattern: !$scope.grandClient ? $scope.ipPattern : "N/A"
                            },
                            display_name: {
                                required: true,
                                pattern: $scope.credentialNamePattern
                            },
                            user_name: {
                                required: true
                            }
                        },
                        messages: {
                            ip: {
                                pattern: gettextCatalog.getString($scope.ipErrorString)
                            },
                            display_name: {
                                required: gettextCatalog.getString("Credential name is required"),
                                pattern: gettextCatalog.getString($scope.credentialNameErrorString)
                            },
                            user_name: {
                                required: gettextCatalog.getString("Username is required")
                            }
                        }
                    });
            }

            editServerForm.submit = function() {
                if($formName === "EditMultipleAssetsForm")
                    $scope.editMultipleAssets();
                else
                    $scope.editAsset();
            };

            function refreshSystemsList() {
                AssetService.getSystemsList().done(function (data) {
                    var appliances = data.appliance.sort(AssetService.sortIDs);
                    appliances.forEach(function (system, index) {
                        applianceSelect.options[index] = new Option(system.name, system.id);
                    });
                    if (associatedAppliance !== undefined) {
                        $("#id_system").val(parseInt(associatedAppliance));
                    }
                });
            }

            function populateCredentials() {
                credentialsSelect = $credentialsSelect[0];
                credentialsSelect.options.length = 0;
                var i = 0;
                credentialsSelect.options[i] = new Option('None', -1);
                if(!$scope.applicationsForAuthentication){
                    i++;
                    credentialsSelect.options[i] = new Option('New', 0);
                }
                if (credentials.length > 0) {
                    credentials.forEach(function (credential, index) {
                        if (credential.display !== null && credential.display !== undefined && credential.display.length > 0) {
                            credentialsSelect.options[index + (i+1)] = new Option(credential.display, credential.credential_id);
                        }
                    })
                }
            };

            function refreshRetentionList () {
                if ($scope.copyEdit) {
                    return PHD.Ajax.get('/api/retention/policy/?sid=' + $rootScope.local.id + "&source_id=" + associatedAppliance, null, this.handlePolicyError);
                } else {
                    return PHD.Ajax.get('/api/retention/policy/?sid=' + associatedAppliance, null, this.handlePolicyError);
                }
            }

            $credentialsSelect.on("change", function (event) {
                selectedCredentialID = $credentialsSelect.val();
                $scope.selectedCredentialName =  $("#credential_id option:selected").text();
                if (selectedCredentialID == 0) {
                    $(".modal-form-credential" ).show();
                    $("#id_credentials_displayName").val("");
                    $("#id_credentials_username").val("");
                    $("#id_credentials_password").val("");
                    $("#id_domain").val("");
                } else {
                    $( ".modal-form-credential" ).hide();
                }
            });

            function initForm() {
                if ($scope.copyEdit !== undefined) {
                    if ($scope.copyEdit) {
                        $("#id_ip").disable();
                        $("#id_server").disable();
                        $("#credential_id").disable();
                        $("#id_encrypted").disable();
                        $('#id_encrypted_dropdown').disable();
                        $("#host_name_tooltip").text("The name of the asset cannot be changed.");
                        $("#ip_address_tooltip").text("The IP address or hostname of the asset cannot be changed.");
                        $("#credentials_tooltip").text("Cannot change credentials for this asset.");
                        $("#credentials_is_allowed").prop("checked",false);
                        $("#credentials_is_allowed").disable();
                    }
                }

                $form.find(".definition").popover({
                    appendTo: $form
                });

                refreshSystemsList();

                AssetService.getCredentials($scope.selectedSystemID, $scope.copyEdit).done(function (data) {
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
                    $(".modal-form-credential").hide();
                    $("#credential_id").val(parseInt(selectedCredential));
                });

                sid = $scope.copyEdit ? $rootScope.local.id : associatedAppliance;
                var strategy = PHD.Ajax.get('/api/retention/strategy/?sid=' + sid, null, handlePolicyError);
                strategy.done(function(data){
                    retentionPolicySelect = $("#id_retentionPolicy");
                    retentionPolicySelect = retentionPolicySelect[0];
                    //retentionPolicySelect.options.length = 0;
                    var i = 0;
                    if(data.data.strategy === "MinMax"){
                        retentionPolicySelect.options[i] = new Option(MinMaxRetentionName, 0);
                        $("#id_retentionPolicy").prop("disabled", true);
                        $rootScope.retentionStrategy = "MinMax";
                    }
                    else{
                        $rootScope.retentionStrategy = "ltr";

                        var policyID = 0;
                        refreshRetentionList().done(function(data){
                            $scope.isPolicyGFS = true;
                            var index;
                            if(data !== null && data !== undefined && data.data instanceof Array) {
                                for (index = 0; index < data.data.length; index++) {
                                    var policy = data.data[index];
                                    retentionPolicySelect.options[index] = new Option(policy.name, policy.id);
                                    if (policy.name === MinMaxRetentionName) {
                                        policyID = policy.id;
                                    }
                                }
                                retentionPolicySelect.options[index] = new Option("None", 0);
                            }
                            if (MinMaxRetentionName === 'Multiple') {
                                policyID = "-1";
                                retentionPolicySelect.options[++index] = new Option(MinMaxRetentionName, policyID);
                            }
                            $("#id_retentionPolicy").val(policyID);
                        });
                        $("#id_system").val(parseInt(associatedAppliance));
                        $("#id_server").prop("disabled", true);
                    }
                });
                //AssetService.getApplianceEncryptionStatus(associatedAppliance, isAssetEncrypted, true);
            }
            initForm();

            $scope.launchRetentionManager = function () {
                if($rootScope.retentionStrategy !== "ltr"){
                    $scope.showSwitchLTR = false;
                    ngDialog.open({
                        template: 'app/configure/retention/min-max.html',
                        overlay: true,
                        scope: $scope,
                        data: $scope.assets,
                        name: 'MinMaxRetention',
                        ngDialogStyle:'width:600px;',
                        closeByDocument: false,
                        closeByEscape: false
                    });
                }
                else{
                    $scope.launchGFSRetentionManager(associatedAppliance);
                }
            };

            $scope.editMultipleAssets = function () {
                console.log("editMultipleAssets - serverEdit : " + serverEdit);
                $scope.associatePolicy(associatedAppliance)
                    .then(function () {
                        if ($scope.copyEdit) {
                            // If a copy, no credentials, display change, just close the dialog.
                            $scope.closeAssetDialog(true);
                        } else {
                            $scope.editMultipleAfterPolicySave();
                        }
                    });
            };

            $scope.editMultipleAfterPolicySave = function() {

                selectedCredentialID = $credentialsSelect.val();
                console.log("editMultipleAssets - serverEdit : " + serverEdit);

                var obj = {};
                var credentials = {};

                console.log("selected = " + selectedCredentialID);
                if (selectedCredentialID == 0) {
                    credentials.display_name = $("#id_credentials_displayName").val();
                    credentials.username = $("#id_credentials_username").val();
                    credentials.password = $("#id_credentials_password").val();
                    credentials.domain = $("#id_domain").val();
                    credentials.is_default = $("#id_default").prop("checked");
                    obj.credentials = credentials;
                }
                else if (selectedCredentialID == -1) {
                    obj.credential_id = -1;
                }
                else {
                    obj.credential_id = parseInt(selectedCredentialID);
                }

                var client_url = "/api/credentials/bind/client/";
                var instance_url = "/api/credentials/bind/instance/";
                var asset_url = "/api/assets/";  // Use this for saving VMware and/or Xen credentials and/or quiesce settings
                var encrypt_enable_url = "/api/encryption/enable-instance/";
                var encrypt_disable_url = "/api/encryption/disable-instance/";
                var encrypt_application_url = "/api/encryption/encrypt-application/";
                var putObj = JSON.stringify(obj);
                var hasErrors = false;

                if($scope.showEncryptionCheckBox && $("#id_encrypted").is(':visible') && $("#id_encrypted").is(':enabled')){
                    $scope.LoadIndicator = PHD.showLoadingIndicator("body", true, "Saving...");

                    obj = {};
                    var instance_ids = "";
                    $scope.assets.forEach(function(asset){
                        if($scope.physicalAssetsFlag && asset.file_level_instance_id){
                            instance_ids += asset.file_level_instance_id + ",";
                        }
                        else{
                            instance_ids += asset.id + ",";
                        }
                    });
                    var str = instance_ids.substring(0, instance_ids.length - 1);
                    obj.instance_id = str;
                    putObj = JSON.stringify(obj);
                    var encrypt_url = $("#id_encrypted").prop("checked") ? encrypt_enable_url : encrypt_disable_url;

                    var resp = PHD.Ajax.put(encrypt_url + "?sid=" + $scope.selectedSystemID, putObj, $scope.LoadIndicator, handleAssetError);
                    resp.done(function(data) {
                        PHD.hideLoadingIndicator($scope.LoadIndicator);
                        if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                            var error = data.result[0].message;
                            console.log("The error " +
                            "is:" + error);
                            if (error != undefined) {
                                hasErrors = true;
                            }
                        }
                        if (!hasErrors && !$("#credentials_is_allowed").is(':checked')) {
                            $scope.closeAssetDialog(true);
                        }
                    });
                } else if ($scope.showEncryptionCheckBox === false && isAppNodeSelected($scope.assets)) {

                    if ($scope.encryption_strategy === "none" || $scope.encryption_strategy === "all") {
                        $scope.LoadIndicator = PHD.showLoadingIndicator("body", true, "Saving...");

                        obj = {};
                        obj.application_id = $scope.assets[0].id;
                        // get the client ID from a child of the app.
                        obj.client_id = getClientFromNodeChild($scope.assets);
                        obj.encrypt = ($scope.encryption_strategy !== "none");
                        putObj = JSON.stringify(obj);

                        var resp = PHD.Ajax.put(encrypt_application_url + "?sid=" + $scope.selectedSystemID, putObj, $scope.LoadIndicator, handleAssetError);
                        resp.done(function (data) {
                            PHD.hideLoadingIndicator($scope.LoadIndicator);
                            if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                                var error = data.result[0].message;
                                console.log("The error " +
                                    "is:" + error);
                                if (error != undefined) {
                                    hasErrors = true;
                                }
                            }
                            if (!hasErrors && !$("#credentials_is_allowed").is(':checked')) {
                                $scope.closeAssetDialog(true);
                            }
                        });
                    } else if (!hasErrors && !$("#credentials_is_allowed").is(':checked')) {
                        $scope.closeAssetDialog(true);
                    }
                }

                if ( $("#quiesce_box").is(":visible") ) {
                    console.log("selectedQuiesceSetting "+$scope.quiesceSetting);
                    if ($("#quiesce_app_aware_radioselection").prop("checked") && (parseInt(selectedCredentialID) == -1 || selectedCredentialID == NaN || selectedCredentialID == null)) {
                        ngDialog.open({
                            dialogType:'WARNING',
                            modelDialogId:'EditAssetErrorDialog',
                            scope:$scope,
                            dialogMessage: 'To enable Application Aware as a Quiesce Setting, you must add a new credential or select an existing one.',
                            onConfirmOkButtonClick:'onConfirmError()'
                        });
                        return false;
                    }
                    $scope.LoadIndicator2 = PHD.showLoadingIndicator("body", true, "Saving...");

                    obj = {};
                    var instance_ids="";
                    $scope.assets.forEach(function(asset){
                        instance_ids += asset.id + ",";
                    });
                    var str = instance_ids.substring(0, instance_ids.length - 1);
                    obj.instance_ids = str;

                    if ( $scope.quiesceSetting !== QUIESCE_MULTIPLE_SETTINGS ) {
                        obj.quiesce_setting = $scope.quiesceSetting;
                    }

                    if ( parseInt(selectedCredentialID) === -1  ) {
                        obj.no_credentials = true;
                    } else if ( parseInt(selectedCredentialID) === 0  ) {
                        var credentials = {};
                        credentials.display_name = $("#id_credentials_displayName").val();
                        credentials.username = $("#id_credentials_username").val();
                        credentials.password = $("#id_credentials_password").val();
                        credentials.is_default = $("#id_default").prop("checked");
                        obj.new_credential = credentials;
                    } else if ( selectedCredentialID != NaN || selectedCredentialID != null ) {
                        obj.credential_id = parseInt(selectedCredentialID);
                    }

                    putObj = JSON.stringify(obj);
                    var resp = PHD.Ajax.put(asset_url + "?sid=" + $scope.selectedSystemID, putObj, $scope.LoadIndicator2, handleAssetError);

                    resp.done(function(data) {
                        PHD.hideLoadingIndicator($scope.LoadIndicator2);
                        if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                            var error = data.result[0].message;
                            console.log("The error is:" + error);
                            if (error != undefined) {
                                hasErrors = true;
                            }
                        }
                        if (!hasErrors) {
                            $scope.closeAssetDialog(true);
                        }
                    });

                } else if($("#credentials_is_allowed").is(':visible') && $("#credentials_is_allowed").is(':checked')){
                    console.log("selectedCredentialID "+selectedCredentialID);
                    $scope.LoadIndicator2 = PHD.showLoadingIndicator("body", true, "Saving...");
                    if( $scope.applicationsForAuthentication){
                        obj = {};
                        var instance_ids="";
                        $scope.assets.forEach(function(asset){
                            instance_ids += asset.id + ",";
                        });
                        var str = instance_ids.substring(0, instance_ids.length - 1);
                        obj.instance_ids = str;

                        if ( parseInt(selectedCredentialID) === -1  ) {
                            obj.no_credentials = true;
                        } else if ( parseInt(selectedCredentialID) === 0  ) {
                            var credentials = {};
                            credentials.display_name = $("#id_credentials_displayName").val();
                            credentials.username = $("#id_credentials_username").val();
                            credentials.password = $("#id_credentials_password").val();
                            credentials.is_default = $("#id_default").prop("checked");
                            obj.new_credential = credentials;
                        } else if ( selectedCredentialID != NaN || selectedCredentialID != null ) {
                            obj.credential_id = parseInt(selectedCredentialID);
                        }

                        putObj = JSON.stringify(obj);
                        var resp = PHD.Ajax.put(asset_url + "?sid=" + $scope.selectedSystemID, putObj, $scope.LoadIndicator2, handleAssetError);

                        resp.done(function(data) {
                            PHD.hideLoadingIndicator($scope.LoadIndicator2);
                            if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                                var error = data.result[0].message;
                                console.log("The error is:" + error);
                                if (error != undefined) {
                                    hasErrors = true;
                                }
                            }
                            if (!hasErrors) {
                                $scope.closeAssetDialog(true);
                            }
                        });
                    }

                        else if($scope.physicalAssetsFlag){
                        obj = {};
                        var clientInfo = {};
                        var i=0;
                        $scope.assets.forEach(function(asset){
                            var client = {};
                            client['clientID'] = asset.id;
                            client['name'] = asset.name;
                            client['credential_display'] = $scope.selectedCredentialName;
                            clientInfo[i] = client;
                            i++;
                        });
                        obj.clients = clientInfo;
                        parseInt(selectedCredentialID);
                        putObj = JSON.stringify(obj);
                        var resp = PHD.Ajax.put(client_url + parseInt(selectedCredentialID) + "/?sid=" + $scope.selectedSystemID, putObj, $scope.LoadIndicator2, handlePhysicalAssetsError);


                        resp.done(function(data) {
                            PHD.hideLoadingIndicator($scope.LoadIndicator2);
                            if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                                var error = data.result[0].message;
                                console.log("The error is:" + error);
                                if (error != undefined) {
                                    hasErrors = true;
                                }
                            }
                            if (!hasErrors) {
                                $scope.closeAssetDialog(true);
                            }
                        });
                    }

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

            $scope.associatePolicy = function(sid) {
                sid = $scope.copyEdit ? $rootScope.local.id : sid;

                var retentionArray = [];
                var obj = {};
                var policy = {};
                var def = $q.defer();

                if ($rootScope.retentionStrategy !== "ltr"){
                    def.resolve(true);
                    return def.promise;
                }

                var selectedPolicy = $retentionPolicySelect.val();
                if (parseInt(selectedPolicy) === -1) {
                    def.resolve(true);
                    return def.promise;
                }
                var assetsForPolicy = $scope.assets;
                //get the id of the selected asset
                if ($scope.assets.length === 1 && $scope.assets[0].children !== undefined && $scope.assets[0].children.length > 0){
                    assetsForPolicy = $scope.assets[0].children;
                    serverEdit = false;
                } else if ($scope.assets.asset_type === "physical"){
                    serverEdit = true;
                    policy = {};
                    policy.instance_id = parseInt($scope.assets.file_level_instance_id);
                    policy.policy_id = parseInt(selectedPolicy);
                    retentionArray.push(policy);
                }
                if (!serverEdit) {
                    for (var i = 0; i < assetsForPolicy.length; i++) {
                        policy = {};
                        policy.instance_id = parseInt(assetsForPolicy[i].id);
                        policy.policy_id = parseInt(selectedPolicy);
                        retentionArray.push(policy);
                    }
                }
                // If no policies are changing, skip retention setting API.
                if (retentionArray.length === 0) {
                    def.resolve(true);
                    return def.promise;
                }
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
                    //if copied asset need to refresh asset view
                    $(document).trigger("assetChange");
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

            $scope.onChangePolicy = function() {
                serverEdit = $scope.assets.asset_type !== undefined && $scope.assets.asset_type === 'physical';
                sid = $scope.copyEdit ? $rootScope.local.id : $scope.selectedSystemID;
                var url = "/api/retention/affected-backups/?sid=" + sid;
                var selectedPolicy = $retentionPolicySelect.val();
                var obj = {};
                var affected = {};

                if (parseInt(selectedPolicy) !== -1) {
                    var retentionArray = [];
                    if (serverEdit) {
                        affected = {};
                        affected.instance_id = parseInt($scope.assets.file_level_instance_id);
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
                        if (data !== undefined && data.backups !== undefined) {
                            $scope.affectedBackups = data.backups;
                            ngDialog.open({
                                template: 'app/configure/retention/affected-backups.html',
                                overlay: true,
                                scope: $scope,
                                name: 'affected-backups',
                                ngDialogStyle: 'width:1200px; height:auto; padding-bottom:50px',
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
                        PHD.hideLoadingIndicator(load);
                        var error = response.result[0].message;
                        console.log("The error is:::: " + error);
                        ngDialog.open({
                            dialogType: 'ERROR',
                            modelDialogId: 'Info-Error-Dialog',
                            dialogMessage: error,
                            overlay: true
                        });
                    });
                }
            };

            $scope.editAsset = function () {
                if ((!$scope.$form.valid())) {
                    return false;
                }
                console.log("Save asset clicked - serverEdit : " + serverEdit);
                $scope.associatePolicy(associatedAppliance)
                    .then(function () {
                        if ($scope.copyEdit) {
                            // If a copy, no credentials, display change, just close the dialog.
                            $scope.closeAssetDialog(true);
                        } else {
                            $scope.editAssetAfterPolicySave();
                        }
                    });
            };

            $scope.editAssetAfterPolicySave = function() {
                // Do not call PUT /api/clients for iSeries assets, just close the window.
                if ($scope.iSeriesAsset) {
                    $scope.closeAssetDialog();
                    return true;
                }
                var obj={};
                // associatedAppliance is being passed as query param. Form element(id_system) is not used by the API.
                //var associatedAppliance = $("#id_system").val();
                var selectedCredentialNow = $credentialsSelect.val();
                obj.name = $("#id_server").val();
                obj.os_type = ($scope.assets !== undefined && $scope.assets.os_family !== undefined) ? $scope.assets.os_family : "";
                obj.priority = 300;
                obj.is_enabled = true;
                //obj.is_synchable = false;  //UNIBP-13774 - It is better to just not send this value to the core on update
                obj.use_ssl = false;
                obj.is_auth_enabled = (selectedCredentialNow == -1) ? false : true;
                switch ($scope.encryption_strategy) {
                    case "none":
                        obj.is_encrypted = false;
                        // If encryption_for_all_assets_for_this_server is false, then all of the assets attaached to this server (DBs, VMs, etc.) are not encrypted
                        obj.encryption_for_all_assets_for_this_server = false;
                        break;
                    case "not-top-level":
                        obj.is_encrypted = false;
                        break;
                    case "top-level":
                        obj.is_encrypted = true;
                        break;
                    case "all":
                        obj.is_encrypted = true;
                        // If encryption_for_all_assets_for_this_server is true, then all of the assets attaached to this server (DBs, VMs, etc.) are encrypted
                        obj.encryption_for_all_assets_for_this_server = true;
                        break;
                }

                if ( $scope.showVssAppAwareBox === true ) {
                    if ($scope.allowExchangeBackups_vssAppAwareStrategy === true) {
                        obj.app_aware_flg = 1;
                    } else {
                        obj.app_aware_flg = 0;
                    }
                }

                var hostinfo = {};
                if (!$scope.grandClient) {
                    hostinfo.ip = $("#id_ip").val();
                }

                console.log("selected = " + selectedCredentialNow);
                if(selectedCredentialNow == 0){
                    var credentials = {};
                    credentials.display_name = $("#id_credentials_displayName").val();
                    credentials.username = $("#id_credentials_username").val();
                    credentials.password = $("#id_credentials_password").val();
                    credentials.domain = $("#id_domain").val();
                    credentials.is_default = $("#id_default").prop("checked");
                    obj.credentials = credentials;
                }
                else if(selectedCredentialNow == -1){
                    obj.credential_id = -1;
                }
                else{
                    obj.credential_id = parseInt(selectedCredentialNow);
                }
                obj.host_info = hostinfo;

                var base_url = "/api/clients/";

                obj = JSON.stringify(obj);
                console.log("selected retentionPolicy = " + $("#id_retentionPolicy").val());
                //TODO: VALIDATE the retentionID usage once the API is ready to attach the retention policy with the Asset.
                obj.retention_id = $("#id_retentionPolicy").val();
                console.log("PUT called to edit Asset with ID : " + assetId + " -- associatedAppliance : " + associatedAppliance);
                base_url +=assetId + "/";
                $scope.LoadIndicator = PHD.showLoadingIndicator("body", true, "Editing ...");
                resp = PHD.Ajax.put(base_url + "?sid=" +  associatedAppliance, obj, null, handleAssetError);

                resp.done(function(data) {
                    PHD.hideLoadingIndicator($scope.LoadIndicator);
                    var result = data.result;
                    if (Array.isArray(result)) {
                        result = result[0];
                    }
                    if (result !== undefined) {
                        if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                            console.log("SUCCESS");
                            $scope.closeAssetDialog(true);
                        } else if (parseInt(result.code) === AJAX_RESULT_ERROR) {
                            console.log("FAILURE");
                            ngDialog.open({
                                dialogType: 'ERROR',
                                modelDialogId:'Info-Error-Dialog',
                                dialogMessage: data,
                                overlay: true
                            });
                        } else {
                            console.log("SUCCESS");
                            $scope.closeAssetDialog(true);
                        }
                    }
                });
            };
        }

        function handlePhysicalAssetsError(jqXHR, textStatus, errorThrown){
            PHD.hideLoadingIndicator($scope.LoadIndicator);
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.messages !== undefined) {
                    var errors = data.messages+"";
                    console.log(errors);
                    var errorArray = {};
                    errorArray = errors.split('|');
                    var index = errorArray.indexOf("");
                    errorArray.splice(index,1);
                    console.log(errorArray);
                    ngDialog.open({
                        template: 'app/configure/environments/MultipleErrorDialog.html',
                        overlay:true,
                        ngDialogStyle:'width:600px;',
                        closeByDocument: false,
                        closeByEscape: false,
                        data: errorArray,
                        modelDialogId:'ErrorDialog',
                        scope:$scope
                    });
                } else {
                    PHD.throwError(data);
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        };

        function handleAssetError (jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var error = data.result[0].message;
                    console.log("The error is:" + error);
                    PHD.hideLoadingIndicator($scope.LoadIndicator);
                    ngDialog.open({
                        dialogType:'Error',
                        modelDialogId:'ErrorDialog',
                        scope:$scope,
                        dialogMessage: error,
                        onConfirmOkButtonClick:'onConfirmAssetError()'
                    });
                } else {
                    PHD.throwError(data);
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        };

        $scope.onConfirmAssetError = function () {
            ngDialog.close('ErrorDialog');
        };

        function handlePolicyError(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined &&
                    data.result[0].message.indexOf("strategy of the system is not GFS") != -1) {
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

        // Initialize the controller, returning the function to turn off the listener.
        unbindHandler = $scope.$on('ngDialog.opened', function(event,obj) {
            $scope.initCtrl(obj);
        });

        $(document).one('retentionChange', function(event, obj) {
            $scope.closeAssetDialog(true);
        });
    }]);
