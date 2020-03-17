angular.module('manage-appliance', ['ngDialog'])
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
    .controller('ManagedApplianceCtrl', ['$scope', '$rootScope', '$http','ngDialog', function($scope, $rootScope, $http,ngDialog) {

        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;

        $scope.initCtrl = function(dlg){
            switch (dlg.name){
                case 'add-appliance-dialog':
                    processDialog(PHD, window);
                    break;
                default:
                    // No action.
                    break;
            }
        };

        var editing = false;


        function processDialog(PHD, window) {

            var $form = $("form[name=applianceForm]");
            $scope.$form = $form;

            var applianceForm,
            FQDN_REGEXP = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])(\:[0-9]{1,5})?$/i;

            // Copy system name to host.
            $("#id_name").focusout(function () {
                $("#id_host").val($("#id_name").val());
            });

            $form.find(".definition").popover({
                appendTo: $form
            });

            applianceForm = PHD.FormController($form, {
                serialize: function ($form) {
                    return $form.find("input").serialize();
                }
            });

            applianceForm
                .validate({
                    rules: {
                        name: {
                            required: true
                        },
                        ip: {
                            pattern: FQDN_REGEXP
                        },
                        username: {
                            required: true
                        },
                        password: {
                            required: true
                        }
                    },
                    messages: {
                        name: {
                            required: gettext("Appliance name is required")
                        },
                        ip: {
                            pattern: gettext("IP Address is not a valid address")
                        },
                        username: {
                            required: gettext("Username is required")
                        },
                        password: {
                            required: gettext("Password is required")
                        }
                    }
                });

            applianceForm.submit = function() {
                $scope.submitForm();
            };
        }


        $scope.submitForm = function () {

            if ((!$scope.$form.valid())) {
                return false;
            }

            var obj = {};
            obj.name = $scope.appliance.name;
            obj.ip = $scope.appliance.ip;
            obj.host = obj.name;
            obj.credentials = {};
            obj.credentials.username = $scope.appliance.username;
            obj.credentials.password = $scope.appliance.password;

            console.log(obj);

            var base_url = "/api/systems/";
            var load;

            obj = JSON.stringify(obj);
            if(editing){
                base_url +=id + "/";
                load = PHD.showLoadingIndicator("body", true, "Saving Appliance...");
                resp = PHD.Ajax.put(base_url + "?sid=" +  PHD.appliance_sid, obj, load, handleError);
            }
            else{
                load = PHD.showLoadingIndicator("body", true, "Adding Appliance...");
                resp = PHD.Ajax.post(base_url + "?sid=" +  PHD.appliance_sid, obj, load, handleError);
            }

            resp.done(function(data) {
                var result = data.result[0];
                PHD.hideLoadingIndicator(load);
                if(parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                    $(document).trigger("vbaadd");
                    $scope.closeAddDialog();
                } else if(parseInt(result.code) === AJAX_RESULT_ERROR) {
                    ngDialog.open({
                        dialogType: 'ERROR',
                        dialogMessage: data,
                        overlay:true
                    });
                }
            });
        };

        $scope.closeAddDialog = function() {
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
            $scope.closeThisDialog();
        };

        function handleError(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var error = data.result[0].message;
                    ngDialog.open({
                        dialogType:'Error',
                        modelDialogId:'Add-Appliance-Error-Dialog',
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
            ngDialog.close('Add-Appliance-Error-Dialog');
        };

        // Initialize the controller, returning the function to turn off the listener.
        unbindHandler = $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });
    }]);
