angular.module('advanced-settings-module', ['ngDialog', 'ui.grid','ui.grid.resizeColumns','ui.grid.autoResize','ngGrid','ui.grid.selection'])
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
    .controller('advancedSettingsCtrl', ['$scope', '$rootScope', '$http','ngDialog', '$window', '$timeout', '$compile', 'uiGridConstants',
        function($scope, $rootScope, $http, ngDialog, $window, $timeout, $compile, uiGridConstants) {

            $scope.settingsDialog = null;
            $scope.selectedSetting = null;
            $scope.rowEntity = null;

            $scope.saveSettings = function(commandName) {
                var url = "/api/settings/?sid=" + selectedAppliance.id;
                var load = PHD.showLoadingIndicator("body", true);
                var payload = $scope.selectedSetting;
                payload = JSON.stringify(payload);
                var resp = PHD.Ajax.put(url, payload, load, handleError);
                resp.done(function(data) {
                    if ($scope.rowEntity !== null) {
                        $timeout(function() {
                            $scope.rowEntity.value = $scope.selectedSetting.value;
                        });
                    }
                    $scope.closeEditDialog();
                });
            };

            function handleError(jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 500) {
                    var data = jqXHR.responseJSON;
                    if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                        var message = data.result[0].message;
                        ngDialog.open({
                            dialogType: 'Error',
                            modelDialogId: 'edit-settings-error-dialog',
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
                ngDialog.close('edit-settings-error-dialog');
            };

            $scope.closeEditDialog = function() {
                $scope.settingsDialog.wizard("close");
                // Must clear settings Dialog so it will open next time.
                $scope.settingsDialog = null;
            };

            $scope.closeThisDialog = function() {
                // closing the wizard clears errors and state.
                $scope.PHD.currentMiniWizard.wizard("close");
            };

            $scope.showSetting = function(row) {
                /*
                 * Create a nested jQuery UI dialog for the setting.  use jQueryUI because it tracks zIndex (and Edit Appliance dialog is jQuery UI).
                 */
                $scope.selectedSetting = jQuery.extend({}, row.entity);
                $scope.rowEntity = row.entity;

                if ($scope.settingsDialog == null) {
                    var options = {
                        title: "Edit Settings (Advanced)",
                        helpArticle: PHD.App.getHelpLink("advanced-settings", true),
                        appendTo: "#dialogs",
                        width: 600,
                        height: 300
                    };
                    options = $.extend(PHD.dialogs.wizard, options);
                    var dialog = $("<div/>", { id: "dialog-edit-setting", "class": "dialog-box" });
                    dialog.data("edit", false);
                    $("body").css("overflow", "hidden");
                    $scope.PHD.Ajax
                        .getHTML('app/configure/advanced-settings/settings-edit.html')
                        .done(function(data) {
                            dialog.hide()
                                .appendTo("body")
                                .html(data)
                                .wizard(options);
                            var elements = angular.element(document.getElementById("advancedEditSettingsDialog"));
                            $compile(elements.contents())($scope);
                            $scope.$digest();
                            $scope.showSettingsTooltip = function(){
                                var form = angular.element("#edit-settings-form");
                                form.find(".definition").popover({
                                    appendTo: form
                                });
                            };
                            $scope.showSettingsTooltip();
                            $scope.settingsDialog = dialog;
                        });
                }
            };

            var settingsTemplate = "<div ng-click=\"grid.appScope.showSetting(row)\" ng-repeat=\"(colRenderIndex, col) in colContainer.renderedColumns track by col.colDef.name\" " +
                "class=\"ui-grid-cell\" ng-class=\"{ 'ui-grid-row-header-cell': col.isRowHeader }\" ui-grid-cell></div>";

            $scope.settingsGridData = {
                multiSelect: false,
                selectionRowHeaderWidth: 35,
                rowHeight: 30,
                enableFullRowSelection : true,
                gridMenuShowHideColumns:false,
                enableColumnMenus:false,
                enableFiltering: true,
                enableHorizontalScrollbar: 0,
                rowTemplate: settingsTemplate,
                data: []
            };

            $scope.settingsGridData.columnDefs = [
                {
                    field: "section",
                    displayName: "Section",
                    headerCellFilter: "translate",
                    sortable : true,
                    sortingType : "string",
                    sort: {
                        direction: uiGridConstants.ASC,
                        priority: 0
                    }
                },
                {
                    field: "field",
                    displayName: "Name",
                    headerCellFilter: "translate",
                    sortable : true,
                    sortingType : "string"
                },
                {
                    field: "value",
                    displayName: "Value",
                    headerCellFilter: "translate",
                    sortable : true,
                    sortingType : "string"
                }
            ];

            $scope.loadSettings = function() {
                $timeout(function() {
                    $scope.settingsGridData.data = $scope.gridData;
                });
            };

            // use instead of ngDialog load event.
            angular.element(document).ready(function () {
                $scope.loadSettings();
            });

        }]);