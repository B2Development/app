angular.module('backup-copy-configuration', ['ngDialog','ui.grid','ui.grid.resizeColumns','ui.grid.autoResize','ngGrid','ui.grid.selection'])
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
    .controller('backupCopyRestartCtrl', ['$scope', '$http','ngDialog', 'gettextCatalog',
        function($scope, $http, ngDialog, gettextCatalog) {

        $scope.selectedAppliance = $scope.ngDialogData.appliance;

        $scope.confirmRestart = function() {
            var restart_url = "/api/replication/restart/?sid=" + $scope.selectedAppliance.id;
            var load = PHD.showLoadingIndicator("body", true, "Restarting");
            $http({
                method: 'PUT',
                url: restart_url
            }).success(function(data, status, headers) {
                PHD.hideLoadingIndicator(load);
                $scope.closeDialog();
            }).error(function(data, status, headers) {
                PHD.hideLoadingIndicator(load);
                var message = gettextCatalog.getString("Error restarting the backup copy processes.");
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    message = data.result[0].message;
                }
                ngDialog.open({
                    dialogType: 'Error',
                    modelDialogId: 'restart-copy-error',
                    scope: $scope,
                    dialogMessage: message,
                    onConfirmOkButtonClick: 'onConfirmError()'
                });
            });
        };

        $scope.onConfirmError = function () {
            ngDialog.close('restart-copy-error');
        };

        $scope.cancelRestart = function() {
            $scope.closeDialog();
        };

        $scope.closeDialog = function() {
            ngDialog.close('restart-backup-copy');
        };

    }])
    .controller('backupCopyCatalogCtrl', ['$scope', '$rootScope', '$http', '$timeout','ngDialog', 'mediaService', 'gettextCatalog', 'uiGridConstants',
        function($scope, $rootScope, $http, $timeout, ngDialog, mediaService, gettextCatalog, uiGridConstants) {

            // Used to unbind the watched event on dialog close.
            var unbindHandler = null;

            $scope.sid = $scope.ngDialogData.sid;
            $scope.target = $scope.ngDialogData.target;
            $scope.selectedSets = [];
            $scope.showSets = true;

            $scope.setsGridData = {
                multiSelect: false,
                selectionRowHeaderWidth: 35,
                rowHeight: 30,
                enableFullRowSelection : true,
                gridMenuShowHideColumns:false,
                enableColumnMenus:false,
                enableHorizontalScrollbar: 0,
                onRegisterApi: function (gridApi) {
                    $scope.notInGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope, function(row){
                        $scope.selectedSets = gridApi.selection.getSelectedRows();
                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope, function (rows) {
                        $scope.selectedSets = gridApi.selection.getSelectedRows();
                    });
                },
                data: []
            };

            $scope.setsGridData.columnDefs = [
                {
                    field: "id",
                    visible: false,
                    sortable : true,
                    sort: {
                        direction: uiGridConstants.DESC,
                        priority: 0
                    },
                    type: "number"
                },
                {
                    field: "description",
                    displayName: gettext("Job"),
                    headerCellFilter: 'translate',
                    sortable : true,
                    cellTooltip: true,
                    sortingType : "string",
                    width: '100'
                },
                {
                    field: "date",
                    displayName: gettext("Date"),
                    headerCellFilter: 'translate',
                    sortable : true,
                    sortingType : "string",
                    width: '170'
                },
                {
                    field: "status",
                    displayName: gettext("Status"),
                    headerCellFilter: 'translate',
                    sortable : true,
                    cellTooltip: true,
                    sortingType : "string"
                },
                {
                    field: "available",
                    displayName: gettext("Available"),
                    headerCellFilter: 'translate',
                    sortable : true,
                    sortingType : "boolean",
                    width: '95'
                }
            ];

            $scope.loadSets = function() {
                console.log($scope.target, $scope.sid);

                var url = "/api/archive/sets/?sid=" + $scope.sid + "&lang=" + $rootScope.userLanguageCode;
                var load = PHD.showLoadingIndicator("body", true, "Loading");
                $http({
                    method: 'GET',
                    url: url
                }).success(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    $scope.sets = data.sets;
                    $scope.setCount = $scope.sets.length;
                    $scope.showSets = $scope.setCount > 0;
                    $timeout(function () {
                        $scope.setsGridData.data = $scope.sets;
                    });
                }).error(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    var message = gettextCatalog.getString("Error loading set information.");
                    if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                        message = data.result[0].message;
                    }
                    ngDialog.open({
                        dialogType: 'Error',
                        modelDialogId: 'set-info-error',
                        scope: $scope,
                        dialogMessage: message,
                        onConfirmOkButtonClick: 'onConfirmError()'
                    });
                });
            };

            $scope.purgeSets = function() {
                $scope.deleteTitle = gettextCatalog.getString('Confirm Set Removal');
                $scope.confirmMessage1 = gettextCatalog.getString('Removing a Backup Copy set removes the status information but not data from the media, with one exception:');
                $scope.confirmMessage2 = gettextCatalog.getString('if a cloud target and in the Advanced Settings, RemoveFiles is 1, data will be removed from the media.');
                $scope.confirmMessage3 = gettextCatalog.getString('I understand that, depending on cloud settings, data may be removed from the media.');
                $scope.submitButtonText = gettextCatalog.getString('Remove Set');

                ngDialog.open({
                    template: 'app/common/confirmationDialog.html',
                    scope: $scope,
                    overlay:true,
                    modelDialogId: 'purge-set-dialog',
                    ngDialogStyle:'width:650px;height:225px',
                    closeByDocument: false,
                    closeByEscape: true
                });
            };

            $scope.closePurgeDialog = function() {
                ngDialog.close('purge-set-dialog');
            };

            $scope.deleteAsset = function() {
                var purge_url = "/api/archive/catalog/" + $scope.selectedSets[0].id + "/?sid=" + $scope.sid;
                var load = PHD.showLoadingIndicator("body", true, "Removing Set");
                $http({
                    method: 'DELETE',
                    url: purge_url
                }).success(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    $scope.closePurgeDialog();
                    $scope.selectedSets = [];
                    $scope.loadSets();
                }).error(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    var message = gettextCatalog.getString("Error deleting the backup copy sets.");
                    if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                        message = data.result[0].message;
                    }
                    ngDialog.open({
                        dialogType: 'Error',
                        modelDialogId: 'set-info-error',
                        scope: $scope,
                        dialogMessage: message,
                        onConfirmOkButtonClick: 'onConfirmError()'
                    });
                });
            };

            $scope.onConfirmError = function() {
                ngDialog.close('set-info-error');
            };

            $scope.onConfirmOutput = function () {
                ngDialog.close('data-output-dialog');
            };

            function getDateRange(startDate, endDate, jobDate) {
                var dateString;
                if (startDate === 0) {
                    if (endDate === 0) {
                        dateString = gettextCatalog.getString("Last Backups");
                    } else {
                        dateString = " " + gettextCatalog.getString("before") + " " + endDate;
                    }
                } else {
                    if (endDate === 0) {
                        dateString = startDate + " " + gettextCatalog.getString("to") + " " + jobDate;
                    } else {
                        dateString = startDate + " " + gettextCatalog.getString("to") + " " + endDate;
                    }
                }
                return dateString;
            }

            $scope.showSetDetails = function() {
                var url = "/api/archive/sets/" + $scope.selectedSets[0].id + "/?sid=" + $scope.sid;
                var load = PHD.showLoadingIndicator("body", true, "Loading Details");
                $http({
                    method: 'GET',
                    url: url
                }).success(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    if (data.sets !== undefined && data.sets.length > 0) {
                        $scope.setInfo = data.sets[0];
                        if ($scope.setInfo.profile !== undefined) {
                            $scope.setInfo.dateRange = getDateRange($scope.setInfo.profile.start_date, $scope.setInfo.profile.end_date, $scope.setInfo.date);
                            var instanceNames = [];
                            if ($scope.setInfo.profile.instances !== undefined) {
                                for (var i = 0; i < $scope.setInfo.profile.instances.length; i++) {
                                    var instanceName = $scope.setInfo.profile.instances[i].primary_name;
                                    if (instanceName === undefined || instanceName === null) {
                                        instanceName = 'unknown';
                                    }
                                    instanceNames.push(instanceName);
                                }
                            }
                            if ($scope.setInfo.profile.objects !== undefined) {
                                for (i = 0; i < $scope.setInfo.profile.objects.length; i++) {
                                    instanceNames.push($scope.setInfo.profile.objects[i]);
                                }
                            }
                            $scope.setInfo.instanceNames = instanceNames.join(',');
                            $scope.setInfo.backupTypes = $scope.setInfo.profile.types.join(',');
                        }
                        ngDialog.open({
                            template: 'app/configure/backupcopy/catalog/set-details.html',
                            scope: $scope,
                            name: 'catalog-set-details',
                            overlay:true,
                            data: {setInfo: $scope.setInfo },
                            ngDialogStyle:'width:850px;height:500px',
                            modelDialogId:'catalog-set-details'
                        });
                    } else {
                        ngDialog.open({
                            dialogType: 'Error',
                            modelDialogId: 'set-info-error',
                            scope: $scope,
                            dialogMessage: gettextCatalog.getString("No Detailed set information found"),
                            onConfirmOkButtonClick: 'onConfirmError()'
                        });
                    }
                }).error(function(data, status, headers) {
                    PHD.hideLoadingIndicator(load);
                    var message = gettextCatalog.getString("Error obtaining set details.");
                    if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                        message = data.result[0].message;
                    }
                    ngDialog.open({
                        dialogType: 'Error',
                        modelDialogId: 'set-info-error',
                        scope: $scope,
                        dialogMessage: message,
                        onConfirmOkButtonClick: 'onConfirmError()'
                    });
                });                
            };

            $scope.closeDetailsDialog = function() {
                ngDialog.close('catalog-set-details');
            };

            $scope.init = function(dlg) {
                if (dlg.name === 'archive-catalog-sets') {
                    $scope.loadSets();
                }
            };

            $scope.closeSetsDialog = function() {
                if ( _.isFunction(unbindHandler)) {
                    unbindHandler();
                }
                $scope.closeThisDialog();
            };

            // Initialize the controller.
            unbindHandler = $scope.$on('ngDialog.opened', function(event, obj) { $scope.init(obj) });

        }]);
