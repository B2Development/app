angular.module('hypervisor_ctrl',['ngDialog'])
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

    .controller('HypervisorCtrl', ['$scope', '$rootScope', '$http', 'AssetService', 'ngDialog', '$timeout', 'gettextCatalog', '$q',
        function($scope, $rootScope, $http, AssetService, ngDialog, $timeout, gettextCatalog, $q) {

        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;
        var unbindPolicyHandler = null;

        var retentionPolicySelect;
        var $retentionPolicySelect;
        $scope.showRetentionSettings = true;
        $scope.gridData = [$scope.affectedBackups];
        $scope.PolicyName = '';          // Will be set to the name of the VMs policy, or None, or Multiple if not common for all VMs.


        $scope.initCtrl = function(obj) {

            switch(obj.name){
                case "Add-Hypervisor":
                    console.log("Here");
                    $retentionPolicySelect = $("#id_Hypervisor_retentionPolicy");
                    $scope.hypervisor = {};
                    serverEdit = false;
                    $("#id_hostnameDiv").hide();
                    $("#retentionSection").hide();
                    $scope.showRetentionSettings = false;
                    $("#quiesce_box").hide();
                    processDialog(PHD, window);
                    break;
                case "Edit-Hypervisor":
                    console.log("EDIT");
                    $retentionPolicySelect = $("#id_Hypervisor_retentionPolicy");
                    // If this appliance does not allow the user to manage retention, change the definition text.
                    if (!$rootScope.showRetention) {
                        $("#id-retention-definition").text("Retention may not be changed for this appliance model.");
                    }
                    $scope.hypervisor = {};
                    $scope.HypervisorData = $scope.ngDialogData[0];
                    console.log($scope.HypervisorData);
                    serverEdit = true;
                    $scope.id = $scope.HypervisorData.id;
                    $(".ngdialog-title").text("Edit Virtual Host");
                    $("#id_server").val($scope.HypervisorData.name);
                    $("#id_server").disable();
                    $("#id_ip").val($scope.HypervisorData.ip);
                    setTooltipsForEdit($scope.HypervisorData.asset_type);
                    $("#quiesce_box").show();
                    $scope.quiesceSetting = QUIESCE_MULTIPLE_SETTINGS;
                    $scope.getRetention($scope.HypervisorData);
                    if($scope.HypervisorData.asset_type === "Xen"){
                        $("#id_os_type option[value='Xen']").attr("selected", true);
                    } else if($scope.HypervisorData.asset_type === ASSET_TYPE_AHV){
                        $("#id_os_type option[value='AHV Host']").attr("selected", true);
                    }
                    else{
                        $("#id_os_type option[value='VMware']").attr("selected", true);
                    }

                    if ($scope.copyEdit){
                        $("#id_os_type").disable();
                        $("#id_system").disable();
                        $("#id_ip").disable();
                        $("#id_user_name").disable();
                        $("#id_password").disable();
                        //$("#quiesce_box").hide
                        $("#quiesce_multiple_settings_radioselection").disable();
                        $("#quiesce_app_consistent_radioselection").disable();
                        $("#quiesce_crash_consistent_radioselection").disable();
                    }
                    processDialog(PHD, window);
                    break;
            }
        };

        function setTooltipsForEdit(hypervisor_type) {
            $hostnameTooltip = $("#host_name_tooltip");
            $ipTooltip = $("#ip_tooltip");
            switch (hypervisor_type) {
                case ASSET_TYPE_VMWARE_HOST:
                    $hostnameTooltip.text("The name of the VMware host cannot be changed.");
                    $ipTooltip.text("The IP address of the VMware host.");
                    break;
                case ASSET_TYPE_AHV:
                case ASSET_TYPE_XEN:
                default:
                    $hostnameTooltip.text("The name of the " + hypervisor_type + " host cannot be changed.");
                    $ipTooltip.text("The IP address of the " + hypervisor_type + " host");
                    break;
            }
        }

        function processDialog(PHD, window){
            if ($scope.copyEdit){
                $scope.grandClient = true;
            }
            var HypervisorForm,
                FQDN_REGEXP = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])(\:[0-9]{1,5})?$/i;
            var hostnamePattern = /^([a-zA-Z0-9._-]){0,31}$/;
            var applianceSelect = $("#id_system")[0];
            var $form = $("form[name=HypervisorForm]");
            var $osType = $('#id_os_type');
            var $username = $("#id_user_name");
            $scope.quiesce_setting_string = '';
            $("#hypervisor_tooltip_help").hide();

            $scope.$form = $form;

            $form.find(".definition").popover({
                appendTo: $form
            });

            var hypervisorForm = PHD.FormController($form, {
                serialize: function ($form) {
                    return $form.find("input").serialize();
                }
            });

            hypervisorForm.submit = function() {
                $scope.addAsset();
            };
            
            hypervisorForm
                .validate({
                    rules: {
                        name: {
                            required: true,
                            pattern: hostnamePattern
                        },
                        "credentials.username": {
                            required: function(element) {
                                return (!serverEdit && ($osType.val() === "VMware" || $osType.val() === ASSET_TYPE_XEN || $osType.val() === ASSET_TYPE_AHV));
                            }
                        },
                        "credentials.password": {
                            required: function(element) {
                                return (!serverEdit && ($osType.val() === "VMware" || $osType.val() === ASSET_TYPE_XEN || $osType.val() === ASSET_TYPE_AHV));
                            }
                        },
                        "host_info.ip": {
                            required: true,
                            pattern: FQDN_REGEXP
                        }
                    },
                    messages: {
                        name: {
                            required: gettextCatalog.getString("Host name is required"),
                            pattern:gettextCatalog.getString(HOSTNAME_ERROR_MESSAGE)
                        },
                        "credentials.username": {
                            required: gettextCatalog.getString("Username is required")
                        },
                        "credentials.password": {
                            required: gettextCatalog.getString("Password is required")
                        },
                        "host_info.ip": {
                            required: gettextCatalog.getString("IP address is required"),
                            pattern: gettextCatalog.getString("IP address is not valid")
                        }
                    }
                })

            function refreshSystemList() {
                PHD.appliance_sid = 1; // default to local
                console.log('set appliance id to ' + PHD.appliance_sid);
                var systems = PHD.Ajax.get('/api/systems/?get_quiesce_settings=1');
                systems.done(function(data) {
                    var appliances = data.appliance.sort(sortIDs);
                    $scope.quieseSupportBySystem = {};
                    appliances.forEach(function(system, index) {
                        console.log("adding system " + system.name);
                        $scope.quieseSupportBySystem[system.id] = {'is_quiesce_supported': system.is_quiesce_supported, 'quiesce_setting': system.quiesce_setting};
                         applianceSelect.options[index] = new Option(system.name, system.id);
                    });
                    if(serverEdit){
                        $("#id_system").val($scope.HypervisorData.system_id);
                    }
                    if( !serverEdit
                        && appliances.length > 0
                        && appliances[0].hasOwnProperty('is_quiesce_supported')
                        && appliances[0].is_quiesce_supported === true
                        && appliances[0].hasOwnProperty('quiesce_setting')
                        && appliances[0].quiesce_setting !== ''
                        && $osType.val() !== "HyperV"  ){

                        $scope.quiesce_setting_string = QUIESCE_CURRENT_DEFAULT_MESSAGE_STRING_1_of_2 + appliances[0].quiesce_setting + QUIESCE_CURRENT_DEFAULT_MESSAGE_STRING_2_of_2;
                        $("#quiesce_default_settings_label").show();

                    } else if( serverEdit
                        && $scope.quieseSupportBySystem.hasOwnProperty($scope.HypervisorData.system_id)
                        && $scope.quieseSupportBySystem[$scope.HypervisorData.system_id].is_quiesce_supported === true
                        && $scope.quieseSupportBySystem[$scope.HypervisorData.system_id].quiesce_setting !== ''
                        && $osType.val() !== "HyperV"  ){

                        $("#quiesce_box").show();

                    } else {
                        $("#quiesce_box").hide();
                        $scope.quiesce_setting_string = '';
                        $("#quiesce_default_settings_label").hide();
                    }
                    $timeout(function () {
                        $scope.$apply();
                    }, 0);
                });
            }
            refreshSystemList();

            function sortIDs(a, b) {
                return (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0);
            }

            $("#id_system").on("change", function (event) {
                $scope.sid = $("#id_system option:selected").val();
                if( !serverEdit
                    && $scope.quieseSupportBySystem.hasOwnProperty($scope.sid)
                    && $scope.quieseSupportBySystem[$scope.sid].is_quiesce_supported === true
                    && $scope.quieseSupportBySystem[$scope.sid].quiesce_setting !== ''  ) {
                    $scope.quiesce_setting_string = QUIESCE_CURRENT_DEFAULT_MESSAGE_STRING_1_of_2 + $scope.quieseSupportBySystem[$scope.sid].quiesce_setting + QUIESCE_CURRENT_DEFAULT_MESSAGE_STRING_2_of_2;
                } else {
                    $scope.quiesce_setting_string = '';
                }
                $timeout(function () {
                    $scope.$apply();
                }, 0);
                console.log("set sid to " + $scope.sid);
                PHD.appliance_sid = $scope.sid;
            });

            $osType.on("change", function (event) {
                // reset errors
                var $validator = $form.data('validator');
                if ($validator !== undefined){
                    $form.data('validator').resetForm();
                    $form.find(".control-group.text.error").removeClass("error");
                }
                var osTypeValue = $osType.val();
                if(osTypeValue === "VMware" )
                {
                    $("#id_hostnameDiv").hide();
                    $("#quiesce_default_settings_label").show();
                    $("#id_CredentialsDiv").show();
                    $("#hypervisor_tooltip_help").hide();
                }
                else if(osTypeValue === "Xen"){
                    $("#id_hostnameDiv").show();
                    $("#quiesce_default_settings_label").show();
                    $("#id_CredentialsDiv").show();
                    $("#hypervisor_tooltip_help").hide();
                }
                else if (osTypeValue === "HyperV" ) {
                    $("#id_hostnameDiv").show();
                    $("#quiesce_default_settings_label").hide();
                    $("#id_CredentialsDiv").hide();
                    $("#hypervisor_tooltip_help").show();
                }
                else if(osTypeValue === "AHV Host"){
                    $("#id_hostnameDiv").show();
                    $("#quiesce_default_settings_label").show();
                    $("#id_CredentialsDiv").show();
                    $("#hypervisor_tooltip_help").hide();
                }
            });

            $username.on("blur", function (event) {
                if ($osType.val() === "HyperV") {
                    //$is_auth_enabled.prop("checked", $username.val().length > 0);
                }
            });

            if($rootScope.isXenUEB) {
                if(!serverEdit){
                    $("#id_os_type option[value='Xen']").attr("selected", true);
                    $("#id_hostnameDiv").show();
                }
                if (!serverEdit || (serverEdit && $osType.val() !== "VMware")) {
                    $('#id_description').text("Enter the details of the virtual host you would like to manage.");
                    $("#id_os_type").attr( "title", "Register Pool Master or Citrix Xen standalone server" );
                    $('#host_name_tooltip').text("Resolvable hostname of the Hyper-V host or Citrix XenServer.");
                    $('#ip_tooltip').text("For VMware or Nutanix hosts, enter the IP address. For Hyper-V host, enter the IP address or hostname. For Citrix XenServer, enter the IP address of pool master or standalone server.");
                }
            }
            else {
                $("#id_os_type option[value='Xen']").remove();
            }

            if (serverEdit) {
                $('#id_description').text(gettextCatalog.getString("Edit settings for ") + " " + $scope.HypervisorData.name + ".");
                // on edit cannot modify appliance.
                $("#id_system").prop("disabled", true);
                $("#id_os_type").prop("disabled", true);
            }

        }

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
                    visible: false,
                    type: 'string'
                },
                {
                    field: "server_name",
                    headerCellFilter: 'translate',
                    displayName: gettextCatalog.getString("Server Name"),
                    cellTooltip: true,
                    visible: true,
                    type: "string"
                },
                {
                    field: "database_name",
                    headerCellFilter: 'translate',
                    displayName: gettextCatalog.getString("DB Name"),
                    cellTooltip: true,
                    visible: false,
                    type: "string"
                },
                {
                    field: "vm_name",
                    headerCellFilter: 'translate',
                    displayName: gettextCatalog.getString("VM Name"),
                    cellTooltip: true,
                    visible: true,
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

        $scope.getRetention = function (hypervisorData) {
            $scope.associatedAppliance = serverEdit ? $scope.HypervisorData.system_id : PHD.appliance_sid;
            var vmData = processSelectedVMs(hypervisorData);
            retentionPolicySelect = $retentionPolicySelect[0];
            if (retentionPolicySelect.options !== undefined) {
                retentionPolicySelect.options.length = 0;
            }
            //Xen, AHV and VMware implementation is different and we have vCenter RRC-> ESX -> VMs.
            if ($scope.copyEdit){
                var strategy = PHD.Ajax.get('/api/retention/strategy/?sid=' + $rootScope.local.id, null, handlePolicyError);
            } else {
                var strategy = PHD.Ajax.get('/api/retention/strategy/?sid=' + $scope.associatedAppliance, null, handlePolicyError);
            }
            strategy.done(function(data){
                if(data.data.strategy === "MinMax"){
                    $scope.retentionStrategy = "MinMax";
                    $scope.getMinMaxRetention(vmData);
                }
                else{
                    $scope.retentionStrategy = "ltr";
                    $scope.getLongTermRetention(vmData);
                }
            });
        };

        function refreshRetentionList(associatedAppliance) {
            if ($scope.copyEdit) {
                return PHD.Ajax.get('/api/retention/policy/?sid=' + $rootScope.local.id + "&source_id=" + associatedAppliance, null, this.handlePolicyError);
            } else {
                return PHD.Ajax.get('/api/retention/policy/?sid=' + associatedAppliance, null, this.handlePolicyError);
            }
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

        function processSelectedVMs(data) {
            var vms ={};
            // if VMware and AHV, the direct children are the VMs.
            // For Xen, the VMs are children of the app node.
            if(data.asset_type === ASSET_TYPE_VMWARE_HOST || data.asset_type === ASSET_TYPE_AHV){
                vms = data.children;
            } else if(data.asset_type === ASSET_TYPE_XEN){
                if(data.children[0].description === "Xen"){
                    var XenData = data.children[0];                          //Z for XenData.
                    vms = XenData.children;
                }
                else if(data.children[0].description === "Xen:VM"){
                    vms = data.children;
                }
            }
            var index,flag = true;
            var commonRetention = "None";
            if (vms.length > 0) {
                commonRetention = vms[0].retention;
                for (index = 0; index < vms.length; ++index){
                    if(vms[index].retention !== commonRetention){
                        flag = false;
                        break;
                    }
                }
            } else {
                // create a dummy policy element with no min/max set.
                var min_max_policy_element = [];
                min_max_policy_element.min_max_policy = { retention_min: 0, retention_max: 0, legal_hold: 0 };
                vms.push(min_max_policy_element);
            }
            return { 'vms': vms, 'flag': flag, 'commonRetention' : commonRetention };
        }

        $scope.getLongTermRetention = function(vmData) {
            var vms = vmData.vms;
            $scope.assets = vmData.vms;
            var flag = vmData.flag;
            var commonRetention = vmData.commonRetention;
            $scope.PolicyName = flag ? commonRetention : "Multiple";  // "Multiple" if VMs have different values.

            $("#retention_is_allowed").prop("checked",true);

            $scope.buildRetentionList($scope.PolicyName);
        };

        $scope.buildRetentionList = function(PolicyName) {
            var i = 0;
            refreshRetentionList($scope.associatedAppliance).done(function(data){
                $scope.isPolicyGFS = true;
                if(data !== null && data !== undefined && data.data instanceof Array) {
                    var index;
                    var policyId = 0;
                    for (index = 0; index < data.data.length; index++) {
                        var policy = data.data[index];
                        if (policy.name === PolicyName) {
                            policyId = policy.id;
                        }
                        retentionPolicySelect.options[index + i] = new Option(policy.name, policy.id);
                    }
                    retentionPolicySelect.options[index + i] = new Option("None", 0);
                    if (PolicyName === "Multiple") {
                        i++;
                        policyId = "-1";
                        retentionPolicySelect.options[++index] = new Option(PolicyName, policyId);
                    }
                    $("#id_Hypervisor_retentionPolicy").val(policyId);
                }
            });
        };

        $scope.getMinMaxRetention = function(vmData) {
            var vms = vmData.vms;
            $scope.assets = vmData.vms;
            var flag = vmData.flag;
            var commonRetention = vmData.commonRetention;

            if(flag === true){
                MinMaxRetentionName = commonRetention;
                //Construct min-max policy array and add it to Hypervisor array so it can be used by min-max-config.js
                var minmaxValues = {};
                minmaxValues.retention_max = vms[0].min_max_policy.retention_max;
                minmaxValues.retention_min = vms[0].min_max_policy.retention_min;
                minmaxValues.legal_hold = vms[0].min_max_policy.legal_hold;
                $scope.HypervisorData.min_max_policy = minmaxValues;
            }
            else{
                MinMaxRetentionName = "Multiple";
                //Construct min-max policy array with 0 values and add it to Hypervisor array so it can be used by min-max-config.js
                var minmaxValues = {};
                minmaxValues.retention_max = 0;
                minmaxValues.retention_min = 0;
                minmaxValues.legal_hold = 0;
                $scope.HypervisorData.min_max_policy = minmaxValues;
            }
            $("#retention_is_allowed").prop("checked",true);

            var i = 0;
            retentionPolicySelect.options[i] = new Option(MinMaxRetentionName, 0);

            console.log(MinMaxRetentionName, $("#id_Hypervisor_retentionPolicy").val());
        };

        $scope.launchRetentionManager = function () {
            if($scope.retentionStrategy === "MinMax"){
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
                $scope.launchGFSRetentionManager($scope.associatedAppliance);
            }
        };

            $scope.onChangePolicy = function () {
                var sid = $scope.copyEdit ? $rootScope.local.id : $scope.HypervisorData.system_id;
                var url = "/api/retention/affected-backups/?sid=" + sid;
                var selectedPolicy = $retentionPolicySelect.val();
                var obj = {};
                var affected = {};

                if (parseInt(selectedPolicy) !== -1) {
                    var retentionArray = [];
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

        $scope.associatePolicy = function(sid){
            sid = $scope.copyEdit ? $rootScope.local.id : sid;
            var retentionArray = [];
            var obj = {};
            var def = $q.defer();

            // If adding assets, or not on LTR, or Multiple policies (-1 value), do not associate.
            var selectedPolicy = $retentionPolicySelect.val();
            if (!$scope.showRetentionSettings || $scope.retentionStrategy !== "ltr" || parseInt(selectedPolicy) === -1) {
                def.resolve(true);
                return def.promise;
            }

            var assetsForPolicy = $scope.assets;
            for (var i = 0; i < assetsForPolicy.length; i++){
                var policy = {};
                policy.instance_id = parseInt(assetsForPolicy[i].id);
                policy.policy_id = parseInt(selectedPolicy);
                retentionArray.push(policy);
            }
            obj.retention = retentionArray;
            var params = JSON.stringify(obj);
            var url = "/api/retention/?sid=" + sid;

            $http({
                method: 'post',
                url: url,
                data: params
            }).success(function (data, status, headers) {
                def.resolve();
               //policy is applied
               //PHD.hideLoadingIndicator(load);
            }).error(function (response) {
                var error = response.result[0].message;
                console.log("The error is:::: " + error);
                ngDialog.open({
                    dialogType:'ERROR',
                    modelDialogId:'EditAssetErrorDialog',
                    scope:$scope,
                    dialogMessage: error,
                    onConfirmOkButtonClick:'onConfirmPolicyError()'
                });
                def.reject();
            });
            return def.promise;
        };

        $scope.onConfirmPolicyError = function () {
            ngDialog.close('EditAssetErrorDialog');
        };

        $scope.addAsset = function () {

            if ((!$scope.$form.valid())) {
                return false;
            }

            $scope.associatePolicy($("#id_system option:selected").val())
                .then(function () {
                    if ($scope.copyEdit) {
                        // If a copy, no credentials, display change, just close the dialog.
                        $scope.closeAssetDialog(true);
                    } else {
                        $scope.addAssetAfterPolicy();
                    }
                });
        };

        $scope.addAssetAfterPolicy = function() {

            var obj = {};
            var hostinfo = {};
            var credentials = {};
            obj.os_type = $('#id_os_type').val();
            obj.system = $("#id_system option:selected").val();
            if($("#id_hostnameDiv").is(":visible")){
                obj.name = $("#id_server").val();
            }
            hostinfo.ip = $("#id_ip").val();
            obj.host_info = hostinfo;
            credentials.username = $("#id_user_name").val();
            credentials.password = $("#id_password").val();
            obj.credentials = credentials;
            
            if($('#id_os_type').val() === "HyperV"){
                obj.is_auth_enabled = false;
            }
            else if($('#id_os_type').val() === "VMware" || $('#id_os_type').val() === "Xen" || $('#id_os_type').val() === ASSET_TYPE_AHV){
                obj.is_auth_enabled = true;
            }
            obj.is_enabled = true;
            obj.is_encrypted = false;
            if(!serverEdit) {
                //UNIBP-13774 Do not send is_synchable on update
                obj.is_synchable = false;
            }

            if ( $("#quiesce_box").is(":visible") ) {
                console.log("selectedQuiesceSetting " + $scope.quiesceSetting);
                if ( $scope.quiesceSetting !== QUIESCE_MULTIPLE_SETTINGS ) {
                    obj.quiesce_setting = $scope.quiesceSetting;
                }
            }

            obj = JSON.stringify(obj);
            console.log(obj);

            var base_url = "/api/clients/";

            if(serverEdit){
                console.log("PUT called");
                base_url +=$scope.id + "/";
                $scope.LoadIndicator = PHD.showLoadingIndicator("body", true, "Saving...");
              resp = PHD.Ajax.put(base_url + "?sid=" + $("#id_system option:selected").val(), obj, null, handleServerError);
            }
            else{
                $scope.LoadIndicator = PHD.showLoadingIndicator("body", true, "Adding...");
                resp = PHD.Ajax.post(base_url + "?sid=" +  $("#id_system option:selected").val(), obj, null, handleServerError);
            }

            resp.done(function(data) {
                PHD.hideLoadingIndicator($scope.LoadIndicator);
                $scope.closeAssetDialog();
                var result = data.result;
                if (Array.isArray(result)) {
                    result = result[0];
                }
                if (result !== undefined) {
                    if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                        ngDialog.close("Info-Error-Dialog");
                        console.log("SUCCESS");
                        $(document).trigger("assetChange");
                    } else if (parseInt(result.code) === AJAX_RESULT_ERROR) {
                        console.log("FAILURE");
                        ngDialog.open({
                            dialogType: 'ERROR',
                            modelDialogId:'Info-Error-Dialog',
                            dialogMessage: data,
                            overlay: true
                        });
                    } else {
                        // adding server, get back id.
                        console.log("SUCCESS");
                        $(document).trigger("assetChange");
                        if (data.message !== undefined && data.message !== "") {
                            ngDialog.open({
                                modelDialogId:'Node-Info-Dialog',
                                dialogType: 'Information',
                                dialogMessage: data.message
                            })
                        }
                    }
                    
                    $scope.checkTourIsRunning();
                }
            });
        };

        $scope.closeAssetDialog = function(triggerChange){
            $scope.checkTourIsRunning();
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
            if ( _.isFunction(unbindPolicyHandler)) {
                unbindPolicyHandler();
            }
            ngDialog.close("addHostDialogID");
            if (triggerChange === true) {
                $(document).trigger("assetChange");
            }
        };

        $scope.checkTourIsRunning = function(){
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
     
     function handleServerError (jqXHR, textStatus, errorThrown) {
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
                        onConfirmOkButtonClick:'onConfirmError()'
                    });
                } else {
                    PHD.throwError(data);
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        };

        $scope.onConfirmError = function () {
            ngDialog.close('ErrorDialog');
        };

        /* Event listener for policy modification */
        unbindPolicyHandler = $scope.$on('policiesModified', function (event, obj) {
            if (obj.policiesDeleted || obj.policiesAdded) {
                $scope.buildRetentionList($scope.PolicyName);
            }
        });

        // Initialize the controller, returning the function to turn off the listener.
        unbindHandler = $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });

        $(document).one('retentionChange', function(event, obj) {
            $scope.closeAssetDialog(true);
        });
    }]);


