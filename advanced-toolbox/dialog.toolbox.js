angular.module('advanced-toolbox', ['ngDialog'])
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
    .controller('advancedToolboxCtrl', ['$scope', '$rootScope', '$http','ngDialog', '$window', function($scope, $rootScope, $http, ngDialog, $window) {

        $scope.commands = $scope.ngDialogData;

        $scope.runCommand = function(commandName) {
            var url = "/api/commands/?sid=" + selectedAppliance.id;
            var load = PHD.showLoadingIndicator("body", true); //, "Running command " + commandName + "....");
            var dimensions = 'width:650px; height:475px;';
            var payload = {'name': commandName};
            payload = JSON.stringify(payload);
            var resp = PHD.Ajax.post(url, payload, load, handleError);
            resp.done(function(data) {
                var message = (data !== undefined && data.data !== undefined) ? data.data : "unknown error running specified command";

                // Special command return -- a hyperlink to a report in the Recoveryconsole reports directory.
                if (message.substring(0,5) == 'html:') {
                    var outputURL = '/recoveryconsole/' + message.substring(5);
                    $window.open(outputURL, '_blank');
                } else {
                    $scope.outputTitle = "Results: " + commandName;
                    $scope.outputData = message;
                    $scope.onConfirmOkButtonClick = $scope.onConfirmOutput;
                    ngDialog.open({
                        template: 'app/common/command-output.html',
                        modelDialogId:'data-output-dialog',
                        dialogMessage:message,
                        scope:$scope,
                        ngDialogStyle: dimensions,
                        onConfirmOkButtonClick: 'onConfirmOutput()'
                    });
                }
            });
        };

        $scope.onConfirmOutput = function () {
            ngDialog.close('data-output-dialog');
        };

        function handleError(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var message = data.result[0].message;
                    ngDialog.open({
                        dialogType: 'Error',
                        modelDialogId: 'data-output-error-dialog',
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
            ngDialog.close('data-output-error-dialog');
        };

        $scope.$on('ngDialog.opened', function(event, obj) { $scope.initCtrl(obj) });

        $scope.initCtrl = function(dlg){
            switch (dlg.name){
                // When putting an ngDialog above a UI Dialog, we need to adjust the vertical alignment (the default ngDialog top is 25%).
                case 'advanced-toolbox-dialog':
                    $("#advanced-toolbox-dialog").css('top', '21%');
                    break;
                default:
                    // No action.
                    break;
            }
        };

    }]);