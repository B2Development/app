angular.module('credentials',['ngDialog'])
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

    .controller('credentialControl', ['$scope', '$rootScope', '$http','ngDialog', 'gettextCatalog',
        function($scope, $rootScope, $http, ngDialog, gettextCatalog) {

        var CredentialsTable = null;
        var allCredentials;
        var credentialRowData = null;
        var base_url = "/api/credentials/";
        var credentialEdit;
        $scope.selectedCredential = null;

        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;

        $scope.initCtrl = function(dlg){
            $scope.credential = {};
            $scope.sid = $scope.ngDialogData;           //If systemID is passed as ngDialogData show credential management for that system.
            switch (dlg.name){
                case 'Credential-Add':
                    credentialEdit = false;
                    break;
                case 'Credential-Edit':
                    credentialEdit = true;
                    $scope.editProcessing();
                    break;
                case 'Credential-Manager':
                    processDialog(PHD, window);
                    break;
                default:
                    // No action.
                    break;
            }

        };

        function handleError(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
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
        }

        $scope.onConfirmError = function () {
            ngDialog.close('ErrorDialog');
            if (credentialEdit) {
                $scope.credential.name = credentialname;
                $scope.credential.username = username;
                $scope.credential.password = password;
                $scope.credential.domain = domain;
                if(isDefault){
                    $('#id_default').prop("checked", true);
                }
                else{
                    $('#id_default').prop("checked", false);
                }
            }
        };

        $scope.onConfirmWarning = function () {
            ngDialog.close('SelectCredential');
        };

        $scope.launchAddCredentials = function() {
            credentialEdit = false;
            ngDialog.open({
                template: 'app/configure/credentials/add-edit-credentials.html',
                scope: $scope,
                overlay:true,
                name: 'Credential-Add',
                documentID: DOC_PROTECTED_ASSETS,
                ngDialogStyle:'width:500px; height:430px;',
                closeByDocument: false,
                closeByEscape: true,
                modelDialogId:'add-credentials-dialog'
            });
        };

        $scope.launchCredentialEditor = function() {
            if (typeof id != "undefined" && id != null && $scope.selectedCredential){
                ngDialog.open({
                    template: 'app/configure/credentials/add-edit-credentials.html',
                    name: 'Credential-Edit',
                    scope: $scope,
                    overlay:true,
                    ngDialogStyle:'width:500px; height:430px;',
                    modelDialogId : 'edit-credentials-dialog',
                    closeByDocument: false,
                    closeByEscape: true,
                    showClose: false
                });
            } else {
                ngDialog.open({
                    dialogType:'Warning',
                    modelDialogId:'SelectCredential',
                    dialogMessage: gettextCatalog.getString('Select a credential to edit.'),
                    scope:$scope,
                    onConfirmOkButtonClick:'onConfirmWarning()'
                });
            }
        };

        $scope.editProcessing = function(){
            $("#add-edit-credentials_dialog_title").text("Edit Credential");
            $scope.credential.name = credentialname;
            $scope.credential.username = username;
            $scope.credential.password = password;
            $("#id_credmgr_domain").val(domain);
            if(isDefault){
                $('#id_default').prop("checked", true);
            }
            else{
                $('#id_default').prop("checked", false);
            }
            if (self_serve_creds) {
                $('#id_display_name').prop("disabled", true);
                $('#id_username').prop("disabled", true);
                $('#id_credmgr_domain').prop("disabled", true);
                $('#id_default').prop("disabled", true);
            } else {
                $('#id_display_name').prop("disabled", false);
                $('#id_username').prop("disabled", false);
                $('#id_credmgr_domain').prop("disabled", false);
                $('#id_default').prop("disabled", false);
            }
        };

        $scope.deleteCredential = function() {
            var dialogMsg = gettextCatalog.getString("Are you sure you want to delete the selected credential?");
            if ($scope.selectedCredential) {
                if (self_serve_creds) {
                    dialogMsg += "\n\n" +
                        gettextCatalog.getString("Self-service information cannot be obtained from the target system, if the selected credentials are deleted.");
                }
                ngDialog.open({
                    dialogType: 'Confirmation',
                    dialogMessage: dialogMsg,
                    scope: $scope,
                    overlay:true,
                    modelDialogId:'DeleteCredentialConfirmation',
                    onConfirmOkButtonClick:'onConfirmDelete()'
                });
            } else {
                ngDialog.open({
                    modelDialogId:'NoCredentialSelected',
                    dialogType: 'Information',
                    dialogMessage: gettextCatalog.getString("No credential has been selected for deletion."),
                    scope: $scope,
                    overlay:true,
                    onConfirmOkButtonClick:'onConfirmNoneSelected()'
                });
            }
        };

        $scope.onConfirmNoneSelected = function() {
            ngDialog.close('NoCredentialSelected');
        };

        $scope.onConfirmDelete = function() {
            console.log("Delete Credential Confirmation") ;
            ngDialog.close('DeleteCredentialConfirmation');
            var base_url = "/api/credentials/";
            console.log("Credential ID being deleted : " + $scope.selectedCredential.id + " -- appliance : " + $scope.selectedCredential.system_id);
            base_url += $scope.selectedCredential.id + "/" ;
            var new_url = base_url + "?sid=" +  $scope.selectedCredential.system_id;
            $http({
                method: 'DELETE',
                url: new_url
            }).success(function(data, status, headers) {
                $scope.selectedCredential = null;
                refreshCredentialList();
            }).error(function(data, status, headers) {
                var message;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    message = data.result[0].message;
                } else {
                    message = "Unknown deletion error; please try again.";
                }
                credentialEdit = false; // not editing credentials.
                ngDialog.open({
                    dialogType: 'ERROR',
                    dialogMessage: message,
                    overlay: true,
                    modelDialogId:'ErrorDialog',
                    scope:$scope,
                    onConfirmOkButtonClick:'onConfirmError()'
                });
            });
        };

        $scope.addCredentials = function() {
            console.log("Adding credentials..");
            saveCredentials();
        };

        function refreshCredentialList() {
            var systemID = $scope.sid !== undefined ? $scope.sid : PHD.appliance_sid;
            if (systemID === undefined){
                systemID = $scope.local.id;
            }
            console.log($scope.sid);
            var resp = PHD.Ajax.get(base_url+ "?sid=" + systemID);
            resp.done(function(data){
                var credentialList = data.data;
                credentialList.forEach(function(item, index) {
                    item.id = item.credential_id;
                    item.system_id = item.sid;
                    if(item.is_default)
                        item.display_name = item.display_name+ " (default)";
                });
                allCredentials = credentialList;
                if (CredentialsTable) {
                    if (!$scope.credentialTableLoaded) {
                        CredentialsTable.load(allCredentials);
                        $scope.credentialTableLoaded = true;
                    } else {
                        CredentialsTable.update(allCredentials, true);
                    }
                }
            });
        }

        function processDialog(PHD, window) {

            $scope.credentialTableLoaded = false;

            var $el = $("#credentials-dialog");
            var $credentialsTable;

            var dtOptions = {
                multiselect: false,
                sortable: true,
                sortOnHeader: true,
                sortableCells: [true, true, true, true],
                sortOnLoad: true,
                sortingType : "string",
                cellClasses: ["long-text truncate", "long-text truncate", null, null, null, null],
                placeholder: gettextCatalog.getString("There are no credentials")
            };

            if (CredentialsTable == null) {
                $credentialsTable = $el.find(".credentials-table");
                CredentialsTable = PHD.DataTable($credentialsTable, dtOptions);

                refreshCredentialList();

                $credentialsTable.on("rowselect", "tr", function (event, dbid, $el, DataTable, DataRow) {
                    credentialRowData = DataRow.data;
                    id = credentialRowData.id;
                    isDefault = credentialRowData.is_default;
                    credentialname = credentialRowData.display_name;
                    username = credentialRowData.username;
                    password = credentialRowData.password;
                    domain = credentialRowData.domain;
                    $scope.selectedCredential = credentialRowData;
                    self_serve_creds = false;
                    if (credentialRowData.self_service != undefined && credentialRowData.self_service != null) {
                        self_serve_creds = true;
                    }
                });

                $credentialsTable.on("loadfinished updatefinished", function () {
                    $credentialsTable.scrollTable({"resize": false});
                    $credentialsTable.sortTable();
                });
            } else {
                refreshCredentialList();
            }

        }

        function saveCredentials() {
            var obj = {};
            var display_name = $("#id_display_name").val();
            if (display_name != "") {
                obj.display_name = display_name;
                if(display_name.indexOf("(default)") > -1){
                    var name = display_name;
                    name = name.replace('(default)','');
                    obj.display_name = name;
                }
                else{
                    obj.display_name = display_name;
                }
            }
            obj.username = $("#id_username").val();
            var password = $("#id_password").val();
            if (password != "") {
                obj.password = password;
            }
            var domain = $("#id_credmgr_domain").val();
            obj.domain = domain;
            obj.is_default = $("#id_default").prop("checked");

            var resp;
            var url = "/api/credentials/";
            if (credentialEdit) {
                url += id + "/?sid=" + $scope.selectedCredential.system_id;
                obj = JSON.stringify(obj);
                resp = PHD.Ajax.put(url, obj, null, handleError);
            } else {
                //var sid = PHD.appliance_sid !== undefined ? PHD.appliance_sid : 1;
                var systemID = $scope.sid !== undefined ? $scope.sid : PHD.appliance_sid;
                url += "?sid=" + systemID;
                obj = JSON.stringify(obj);
                resp = PHD.Ajax.post(url, obj, null, handleError);
            }
            resp.done(function(data) {
                refreshCredentialList();
                if(credentialEdit){
                    ngDialog.close('edit-credentials-dialog');
                }
                else{
                    ngDialog.close('add-credentials-dialog');
                }
            });
        }

        $scope.closeThisDialog = function() {
            ngDialog.close('credential-manager-dialog');
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
        };

        // Initialize the controller.
        unbindHandler = $scope.$on('ngDialog.opened', function (event, obj) {
            $scope.initCtrl(obj)
        });

    }]);
