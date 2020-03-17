angular.module('add_server',['ngDialog'])
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

    .controller('AddServerCtrl', ['$scope', '$rootScope', '$http', 'AssetService', 'ngDialog', 'gettextCatalog',
        function($scope, $rootScope, $http, AssetService, ngDialog, gettextCatalog) {

        var serverEdit = false;
        var selectedCredentialID = 0;
        var errorDialog = false;
        
        $scope.pushMessage = $rootScope.isCE ?
            gettextCatalog.getString("Installing agents automatically is not supported for Unitrends Free.  You must download and install the agent before adding the asset.") :
                    
            gettextCatalog.getString("Installing agents automatically is supported for Windows servers only.") + "  <b>" +
            gettextCatalog.getString("You must ensure that all prerequisites in the linked") + " " +
            "<a href=\"https://unitrends-support.force.com/UnitrendsBackup/s/article/000003739\" target=\"_blank\">" +
            gettextCatalog.getString("Unitrends Agent Push KB Article") + "</a> " +
            gettextCatalog.getString("have been met before attempting to install the agent automatically.") + "</b><br/><br/>" +
            gettextCatalog.getString("For non-Windows, download and install the agent before adding the server to the appliance.");

        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;
        
        $scope.initCtrl = function(dlg){
            serverEdit = false;
            switch (dlg.name){
                case 'Add-Server':
                    processDialog(PHD, window);
                    break;
                default:
                    // No action.
                    break;
            }
        };

        function processDialog(PHD, window) {

            var $form = $("form[name=AddServerForm]");
            $scope.$form = $form;
            var applianceSelect;
            var credentials = [];
            var credentialsSelect;
            var $credentialsSelect = $("#credential_id");
            var $installAgent = $("#id_installAgent");

            var $applianceSelect = $("#id_system");
            applianceSelect = $applianceSelect[0];
            applianceSelect.options.length = 0;

            $scope.hostnamePattern = /^([a-zA-Z0-9._-]){0,31}$/;
            $scope.hostnameErrorString = HOSTNAME_ERROR_MESSAGE;

            $scope.ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
            $scope.ipErrorString = gettext("IP Address is not a valid address");

            $scope.credentialNamePattern = /^[ A-Za-z0-9_@./#&+-/!$%^*()=\\|:;'"<>,?`~{}\[\]]{0,64}$/;
            $scope.credentialNameErrorString = gettext("Credential Name: Max 64 characters");

            var addServerForm = PHD.FormController($form, {
                serialize: function ($form) {
                    return $form.find("input").serialize();
                }
            });

            addServerForm
                .validate({
                    rules: {
                        name: {
                            required: true,
                            pattern: $scope.hostnamePattern
                        },
                        ip: {
                            pattern: $scope.ipPattern
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
                        name: {
                            required: gettextCatalog.getString("Hostname is required"),
                            pattern:gettextCatalog.getString($scope.hostnameErrorString)
                        },
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

            addServerForm.submit = function() {
                $scope.addAsset();
            };

            function refreshSystemsList() {
                AssetService.getSystemsList().done(function (data) {
                    var appliances = data.appliance.sort(AssetService.sortIDs);
                    appliances.forEach(function (system, index) {
                        applianceSelect.options[index] = new Option(system.name, system.id);
                    });
                });
            }

            function populateCredentials() {
                credentialsSelect = $credentialsSelect[0];
                credentialsSelect.options.length = 0;
                var i = 0;
                credentialsSelect.options[i] = new Option('New', 0);
                if (credentials.length > 0) {
                    credentials.forEach(function (credential, index) {
                        if (credential.display !== null && credential.display !== undefined && credential.display.length > 0) {
                            credentialsSelect.options[index + (i+1)] = new Option(credential.display, credential.credential_id);
                        }
                    })
                }
            }

            // AssetService.getApplianceEncryptionStatus will trigger this event if encryption cannot be set.
            $(document).on("noEncryption", function(event) {
                $scope.encryption_strategy = "none";
            });


            $applianceSelect.on("change", function (event) {
                AssetService.getApplianceEncryptionStatus($applianceSelect.val(), false, false);
            });

            function showCredentialsFormWithBlankValues() {
                $(".modal-form-credential").show();
                $credentialsSelect.val(0);
                $("#id_credentials_displayName").val("");
                $("#id_credentials_username").val("");
                $("#id_credentials_password").val("");
                $("#id_domain").val("");
            }

            function ShowOrHideCredentialsSection() {
                if ($("#id_installAgent").prop("checked")) {
                    $("#id_CredentialsDiv").show();
                    showCredentialsFormWithBlankValues();
                } else {
                    $("#id_CredentialsDiv").hide();
                }
            }

            $installAgent.on("change", function (event) {
                ShowOrHideCredentialsSection();
            });

            $credentialsSelect.on("change", function (event) {
                selectedCredentialID = $credentialsSelect.val();
                if (selectedCredentialID == 0) {
                    showCredentialsFormWithBlankValues();
                } else {
                    $( ".modal-form-credential" ).hide();
                }
            });

            function initForm() {
                $form.find(".definition").popover({
                    appendTo: $form
                });
                var $agentDefinition =  $form.find(".agent-definition");
                var agentHTML = jQuery.parseHTML($scope.pushMessage);
                $agentDefinition.html(agentHTML);
                $($agentDefinition).popover({
                    appendTo: $form
                });

                refreshSystemsList();
                $("#id_server").prop("disabled", false);

                AssetService.getCredentials().done(function (data) {
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
                if(!errorDialog) {
                    ShowOrHideCredentialsSection();
                }
                AssetService.getApplianceEncryptionStatus(PHD.appliance_sid, false, false);
            }
            initForm();

            $scope.addAsset = function () {
                if ((!$scope.$form.valid())) {
                    return false;
                }
                var obj = {};
                // associatedAppliance is being passed as query param. Form element(id_system) is not used by the API.
                var associatedAppliance = $("#id_system").val();
                var installAgent = $("#id_installAgent").prop("checked") ? true : false;
                obj.name = $("#id_server").val();
                // If "Windows", the input is restricted to 15 characters. At this time, only Windows allows push.
                // Once others allow push, the UX will need to be altered to specify agent to push (and OS), which cna be set here.
                // The default, "", will allow up to 31 characters (max for the clients/nodes table).
                obj.os_type = installAgent ? "Windows" : "";
                obj.priority = 300;
                obj.is_enabled = true;
                obj.is_synchable = false;
                obj.use_ssl = false;
                obj.install_agent = installAgent;
                obj.is_auth_enabled = installAgent;
                obj.is_encrypted = $("#id_encrypted").prop("checked") ? true : false;

                var hostinfo = {};
                hostinfo.ip = $("#id_ip").val();

                console.log("selected = " + selectedCredentialID);
                if (installAgent) {
                    if (selectedCredentialID == 0) {
                        var credentials = {};
                        credentials.display_name = $("#id_credentials_displayName").val();
                        credentials.username = $("#id_credentials_username").val();
                        credentials.password = $("#id_credentials_password").val();
                        credentials.domain = $("#id_domain").val();
                        credentials.is_default = $("#id_default").prop("checked");
                        obj.credentials = credentials;
                    }
                    else {
                        obj.credential_id = parseInt(selectedCredentialID);
                    }
                }
                obj.host_info = hostinfo;

                var base_url = "/api/clients/";

                // if the defaultschedule exists, add the asset to it.
                obj.defaultschedule = true;

                obj = JSON.stringify(obj);
                console.log("POST called to add an Asset. AssociatedAppliance .  "+associatedAppliance);
                $scope.AddAssetIndicator = PHD.showLoadingIndicator("body", true, "Adding Asset...");
                var resp = PHD.Ajax.post(base_url + "?sid=" +  associatedAppliance, obj, null, handleAssetError);
                resp.done(function(data) {
                    PHD.hideLoadingIndicator($scope.AddAssetIndicator);
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
                    }
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
                });
            };
        }

        function handleAssetError (jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                PHD.hideLoadingIndicator($scope.AddAssetIndicator);
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var error = data.result[0].message;
                    console.log("The error is:" + error);
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
            errorDialog = true;
        };

        $scope.onConfirmError = function () {
            ngDialog.close('ErrorDialog');
        };

        // Initialize the controller.
        unbindHandler = $scope.$on('ngDialog.opened', function(event,obj) { $scope.initCtrl(obj) });
		  
		$scope.closeAssetDialog = function(){
			ngDialog.close("addAssetDialogID");
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
			if(resetTour){
				refreshPage();
				setTimeout(function(){
				var $scope = $("[ng-controller=GlobalCtrl]").scope();
				$scope.user.showTour = true;
				window.location.href = "#/dashboard/"; 
				resetTour = false;
				$(".btn-pref-cancel").trigger('click');
				}, 1000);
			 } 
	   }
    }]);
