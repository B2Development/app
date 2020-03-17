angular.module('active-directory-module', ['ngDialog'])
    .config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            plain: false,
            showClose: true,
            closeByDocument: true,
            closeByEscape: true,
            appendTo: false,
            trapFocus: true,
            preCloseCallback: function (value) {

            }
        });
    }])
    .controller('activeDirectoryCtrl', ['$scope', '$rootScope', '$http','ngDialog', '$window', '$timeout', 'gettextCatalog',
        function($scope, $rootScope, $http, ngDialog, $window, $timeout, gettextCatalog) {

        // Used to unbind the watched event on dialog close.
        var unbindHandler = null;

        $scope.originalADSettings = $scope.ngDialogData.activeDirectorySettings;
        $scope.activeDirectorySettings = jQuery.extend({}, $scope.originalADSettings);

        $scope.displayOnly = false;
        $scope.adHelp = gettextCatalog.getString("Use an Active Directory server for user authentication.");

        $scope.showADTooltip = function(){
            var form = angular.element("#active-directory-advanced-form");
            form.find(".definition").popover({
                appendTo: form
            });
        };

        $scope.saveSettings = function() {
            var url = "/api/active-directory/?sid=" + selectedAppliance.id;
            var load = PHD.showLoadingIndicator("body", true);
            var dimensions = 'width:650px; height:475px;';
            var payload = [];
            for (var prop in $scope.activeDirectorySettings) {
                if ($scope.activeDirectorySettings.hasOwnProperty(prop)) {
                    var adValue = $scope.activeDirectorySettings[prop];
                    if (typeof(adValue) === 'boolean') {
                        adValue = adValue ? gettext("Yes") : gettext("No");
                    }
                    var item = {"field": prop, "value": adValue};
                    payload.push(item);
                }
            }
            payload = JSON.stringify(payload);
            var resp = PHD.Ajax.put(url, payload, load, handleError);
            resp.done(function(data) {
                $rootScope.$broadcast("adUpdated");
                $scope.closeThisDialog();
            });
        };

        function handleError(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var message = data.result[0].message;
                    ngDialog.open({
                        dialogType: 'Error',
                        modelDialogId: 'ad-error-dialog',
                        scope: $scope,
                        dialogMessage: message,
                        onConfirmOkButtonClick: 'onConfirmError()'
                    });
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        }

        $scope.onConfirmError = function () {
            ngDialog.close('ad-error-dialog');
        };

        $scope.closeThisDialog = function(update) {
            console.log('handleCancel');
            if ( _.isFunction(unbindHandler)) {
                unbindHandler();
            }
            ngDialog.close();
        };

        $scope.processDialog = function(obj) {
            $scope.showADTooltip();
        };

        // Initialize the controller, returning the function to turn off the listener.
        unbindHandler = $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });

        $scope.initCtrl = function(dlg){
            switch (dlg.name){
                // When putting an ngDialog above a UI Dialog, we need to adjust the vertical alignment (the default ngDialog top is 25%).
                case 'edit-active-directory':
                    $scope.processDialog();
                    break;
                default:
                    // No action.
                    break;
            }
        };

    }])
    .controller('activeDirectoryDisplayCtrl', ['$scope', '$rootScope', '$http','ngDialog', '$window', '$timeout', 'gettextCatalog',
        function($scope, $rootScope, $http, ngDialog, $window, $timeout, gettextCatalog) {
            $scope.displayOnly = true;

            $scope.$on("adUpdated", function (event, data) {
                $scope.refreshADSettingsDisplay();
            });

            $scope.refreshADSettingsDisplay = function() {
                $scope.$parent.activeDirectorySettings = {};
                console.log("getting AD Settings");
                var resp = PHD.Ajax.get('/api/active-directory/?sid=' + PHD.appliance_sid);
                resp.done(function (data) {
                    console.log("return from AD settings");
                    console.log(data, data.data);
                    if (data !== undefined && data.data !== undefined) {
                        var settings = data.data;
                        for (var i = 0; i < settings.length; i++) {
                            var setting = settings[i];
                            switch (setting.field) {
                                case "AD_AuthenticationEnabled":
                                    $scope.$parent.activeDirectorySettings.AD_AuthenticationEnabled = setting.value == "Yes";
                                    break;
                                case "AD_ServerName":
                                    $scope.$parent.activeDirectorySettings.AD_ServerName = setting.value;
                                    break;
                                case "AD_DomainName":
                                    $scope.$parent.activeDirectorySettings.AD_DomainName = setting.value;
                                    break;
                                case "AD_IP":
                                    $scope.$parent.activeDirectorySettings.AD_IP = setting.value;
                                    break;
                                case "AD_UseSSL":
                                    $scope.$parent.activeDirectorySettings.AD_UseSSL = setting.value == "Yes";
                                    break;
                                case "AD_Superuser":
                                    $scope.$parent.activeDirectorySettings.AD_Superuser = setting.value;
                                    break;
                                case "AD_Admin":
                                    $scope.$parent.activeDirectorySettings.AD_Admin = setting.value;
                                    break;
                                case "AD_Manage":
                                    $scope.$parent.activeDirectorySettings.AD_Manage = setting.value;
                                    break;
                                case "AD_Monitor":
                                    $scope.$parent.activeDirectorySettings.AD_Monitor = setting.value;
                                    break;
                            }
                        }
                        // This is a display screen, so disable fields.
                        $("#ad-template-ad_server").attr('disabled', true);
                        $("#ad-template-ad_domain").attr('disabled', true);
                        $("#ad-template-ad_enabled").attr('disabled', true);
                        $("#ad-template-ad_ssl").attr('disabled', true);
                    }
                    $scope.$apply();
                });
            };
        }
    ]);