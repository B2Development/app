angular.module('configCopiedAssets', ['ngDialog', 'angulartics', 'angulartics.google.analytics', 'treeGrid',
    'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.treeView', 'ui.grid.selection'])
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
    
    .controller('CopiedAssetsCtrl', ['$scope', '$rootScope', '$http', '$timeout', 'ngDialog', '$analytics', 'gettextCatalog', 'AssetService', 'localStorageService',
        function($scope, $rootScope, $http, $timeout, ngDialog, $analytics, gettextCatalog, AssetService, localStorageService) {

        $scope.initCtrl = function () {
            $scope.Assets = {};
            processAssets(PHD, window);
        };

        $scope.COLUMN_COOKIE = 'c-assets';

        $scope.button_allowed = true;
        $scope.listViewFlag =false;
        $scope.tableView = true;
        $scope.getView = function(tabular) {
            var view = tabular || $scope.tableView;
            return (view  ===true ? gettext("Table") : gettext("List"));
        };

        $scope.toggleView = function() {
            $scope.selectedObj = null;
            PHD.appliance_sid = $rootScope.local.id;

            $scope.tableView = !$scope.tableView;

            if(!$scope.tableView){
                $scope.selectedAssets = $scope.protectedAssetsDataArr[0];
                if ($scope.selectedAssets !== undefined) {
                    $scope.selectedID = $scope.selectedAssets.id;
                } else {
                    $scope.selectedID = null;
                }
                $scope.selectProtectedAssetsFromList($scope.selectedID);
                $("#" + ($scope.selectedID)).css("background-color","#f5f5f5");
            }else{
                ($(".environment-assets").find(".assets-table")).load($scope.protectedAssetsDataArr);
                ($(".environment-assets").find(".assets-table")).resize();
                if ($scope.selectedArray.length >= 1) {
                    $scope.selectedObj = $scope.selectedArray[0];
                    PHD.appliance_sid = $scope.selectedObj.system_id;
                } else {
                    $scope.selectedObj = null;
                    $scope.selectedID = null;
                }
            }
        };

        $scope.display = ASSET_DISPLAY_FILTER_ALL;
        $scope.getDisplay = function(view) {
            return $scope.display;
        };

        $scope.launchRetentionManager = function() {
            $scope.copyEdit = true;
            resp = PHD.Ajax.get("/api/retention/strategy/" + "?sid=" +  $rootScope.local.id);
            resp.done(function(data){
                var result = data.data;
                var strategy = result.strategy;
                if (strategy === 'MinMax') {
                    $scope.showSwitchLTR = true;
                    ngDialog.open({
                        template: 'app/configure/retention/min-max.html',
                        overlay: true,
                        scope: $scope,
                        name: 'MinMaxRetention',
                        ngDialogStyle:'width:700px',
                        closeByDocument: false,
                        closeByEscape: false
                    });
                } else {
                    $scope.launchGFSRetentionManager();
                }
            });

        };
            $scope.launchGFSRetentionManager = function(system_id){
                $scope.copyEdit = true;
                $scope.sid = system_id === undefined ? $rootScope.local.id : system_id;
                var load = PHD.showLoadingIndicator('body', true, "Getting Policies...");
                var url = "/api/retention/policy/?sid=" + $scope.sid;
                $http({
                    method: 'get',
                    url: url
                }).success(function (data) {
                    if (data) {
                        $scope.policyData = data.data;
                        PHD.hideLoadingIndicator(load);
                        ngDialog.open({
                            template: 'app/configure/copied-assets/copied-assets-retention.html',
                            scope: $scope,
                            overlay: true,
                            data: {copiedAssets: true},
                            modelDialogId: 'Retention-Policy',
                            name: 'Retention-Policy',
                            ngDialogStyle: 'width:1200px;height:auto;padding-bottom:50px',
                            closeByDocument: true,
                            closeByEscape: true
                        });
                    }
                })
            };

        $scope.getIcon = function(item) {
            return AssetService.getIconForTypeString(item);
        };

        var nameTemplate = '<div class="ui-grid-cell-contents" title="{{row.entity.name}}" '+
            'ng-style="{ \'margin-left\': (row.treeLevel * 20 + 2) + \'px\' }">' +
            '<i style="margin-right:4px" class="{{grid.appScope.getIcon(row.entity)}} icon"></i>{{row.entity.name}}' +
            '</div>';

        $scope.tree_data = [];
        $scope.savedState = undefined;
        $scope.columnOrderRestored = false;

        $scope.treeGridOptions = {
            data: 'tree_data',
            enableSorting: true,
            enableFiltering: true,
            showTreeExpandNoChildren: false,
            treeRowHeaderBaseWidth: 20,
            enableFullRowSelection : false,
            enableRowHeaderSelection: true,
            selectionRowHeaderWidth: 28,
            rowHeight: 28,
            enableColumnResizing: true,
            enableHorizontalScrollbar: 0,
            multiSelect: true,
            enableGridMenu: true,
            gridMenuShowHideColumns: true,
            enableColumnMenus: true,
            enableSelectAll: false,
            enableExpandAll: true,
            gridMenuCustomItems: [{
                title: gettextCatalog.getString('Reset column defaults'),
                action: function($event) {
                    // clear the current grids, then re-draw as the original.
                    $scope.restoreGridState();
                },
                order: 99
            }],
            gridMenuTitleFilter: function(title) {
                return gettextCatalog.getString(title);
            },
            columnDefs: [
                {
                    name: 'name',
                    displayName: gettextCatalog.getString('NAME'),
                    width: '18%',
                    cellTemplate: nameTemplate
                },
                {
                    name: 'description',
                    displayName: gettextCatalog.getString('DESCRIPTION'),
                    cellTooltip: true
                },
                {
                    name: 'retention',
                    displayName: gettextCatalog.getString('RETENTION'),
                    cellTooltip: true
                },
                {
                    name: 'is_encrypted',
                    displayName: gettextCatalog.getString('ENCRYPTED'),
                    type: "boolean"
                },
                {
                    name: 'system_name',
                    displayName: gettextCatalog.getString('Source Appliance'),
                    cellTooltip: true,
                    width: '*',
                    minWidth: 50
                },
                {
                    name: 'id',
                    displayName: gettextCatalog.getString('ID'),
                    cellTooltip: true,
                    visible: false
                }
            ],
            onRegisterApi: function (gridApi) {
                $scope.onRegisterGrid(gridApi);
            }
        };

        $scope.onRegisterGrid = function(gridApi) {
            $scope.gridApi = gridApi;
            /*$scope.gridApi.treeBase.on.rowExpanded($scope, function(row) {
                console.log('expand');
            });*/
            $scope.gridApi.core.on.rowsRendered($scope, function() {
                if (!$scope.stateExists()) {
                    $scope.saveGridState();
                    $scope.restorePersistedState($scope.gridApi);
                }
            });
            // configure handler for row selection changes
            $scope.gridApi.selection.on.rowSelectionChanged($scope, $scope.handleRowSelection);
            $scope.gridApi.selection.on.rowSelectionChangedBatch($scope, $scope.handleRowSelection);

            // configure handler to persist grid state changes
            gridApi.colMovable.on.columnPositionChanged($scope, $scope.persistGridState);
            gridApi.colResizable.on.columnSizeChanged($scope, $scope.persistGridState);
            gridApi.core.on.columnVisibilityChanged($scope, $scope.persistGridState);
            gridApi.core.on.filterChanged($scope, $scope.persistGridState);
            gridApi.core.on.sortChanged($scope, $scope.persistGridState);
        };

        /*
         * Returns true if a cached state exists for the tab, false if not.
         * Checks for the existence of columns because these may be delayed (returned after API returns).
         */
        $scope.stateExists = function() {
            return ($scope.savedState !== undefined && $scope.savedState.columns.length > 0);
        };

        /*
         * Use ui-grid state to save information in an array about the original grid: column order, width, filters, etc.
         */
        $scope.saveGridState = function() {
            $scope.savedState = $scope.gridApi.saveState.save();
        };

        /*
         * Save state of the grid in local storage: where the state is defined by the UI-grid.
         */
        $scope.persistGridState = function() {
            localStorageService.set($scope.COLUMN_COOKIE, $scope.gridApi.saveState.save());
        };

        /*
         * Restore the grid's state from the local storage for this tab, if it exists.
         */
        $scope.restorePersistedState = function(gridApi, tabIndex) {
            if (!$scope.columnOrderRestored) {
                var token = $scope.COLUMN_COOKIE;
                var assetState = localStorageService.get(token);
                if (assetState !== null && assetState !== undefined) {
                    gridApi.saveState.restore($scope, assetState);
                    $scope.columnOrderRestored = true;
                }
            }
        };

        /*
         * Restore this grid's state from the array (the original tabs), and delete the local storage.
         */
        $scope.restoreGridState = function() {
            $scope.gridApi.saveState.restore($scope, $scope.savedState);
            setTimeout(function () {
                var token = $scope.COLUMN_COOKIE;
                localStorageService.remove(token);
            }, 100);
            $scope.columnOrderRestored = false;
        };

        $scope.handleRowSelection = function(row) {
            $scope.selectedArray = $scope.gridApi.selection.getSelectedRows();
            if ($scope.selectedArray.length >= 1) {
                $scope.selectedObj = $scope.selectedArray[0];
                PHD.appliance_sid = $scope.selectedObj.system_id;
            } else if ($scope.selectedArray.length === 0) {
                $scope.selectedObj = null;
                $scope.selectedID = null;
                PHD.appliance_sid = $rootScope.local.id;
            }
            $scope.Assets.updateButtons();
        };

        $scope.updateTreeGrid = function(protectedAssets) {
            $scope.tree_data = [];
            writeoutNode(protectedAssets, 0, $scope.tree_data);
            $scope.$apply();
        };

        var writeoutNode = function( childArray, currentLevel, dataArray ){
            childArray.forEach( function( childNode ){
                if (childNode.children !== undefined) {
                    if (childNode.children.length >= 0 ){
                        childNode.$$treeLevel = currentLevel;
                    }
                    dataArray.push(childNode);
                    writeoutNode( childNode.children, currentLevel + 1, dataArray );
                } else {
                    childNode.$$treeLevel = currentLevel;
                    childNode.children = [];
                    dataArray.push(childNode);
                }
            });
        };

        $scope.selectedArray = [];

        $scope.displayAll = function() {
            $scope.display = ASSET_DISPLAY_FILTER_ALL;
            $scope.protectedAssetsDataArr = $scope.protectedAssetsAllDataArr;
            $timeout(function() {
                $scope.updateTreeGrid($scope.protectedAssetsDataArr);
            });
        };

        $scope.displayVirtual = function() {
            $scope.display = ASSET_DISPLAY_FILTER_VIRTUAL;

            var virtualassets = ($scope.protectedAssetsAllDataArr).filter(function(obj){
                var isHyperV = false;
                if(obj.children) {
                    for (var i = 0; i < obj.children.length; i++) {
                        if (obj.children[i].type === "Hyper-V") {
                            isHyperV = true;
                            break;
                        }
                    }
                }
                return obj.asset_type && (obj.asset_type != ASSET_TYPE_PHYSICAL
                    || (obj.asset_type === ASSET_TYPE_PHYSICAL && (obj.is_hyperv_cluster || isHyperV) ));
            });

            $scope.protectedAssetsDataArr = virtualassets;
            $timeout(function() {
                $scope.updateTreeGrid($scope.protectedAssetsDataArr);
            });
        };

        $scope.displayPhysical = function() {
            $scope.display = ASSET_DISPLAY_FILTER_PHYSICAL;
            var physicalassets = ($scope.protectedAssetsAllDataArr).filter(function(obj){
                return obj.asset_type && obj.asset_type === ASSET_TYPE_PHYSICAL;
            });

            $scope.protectedAssetsDataArr = physicalassets;
            $timeout(function() {
                $scope.updateTreeGrid($scope.protectedAssetsDataArr);
            });
        };

        $scope.launchAssetManager = function() {
            if(!$scope.button_allowed){                 //Set in updateButtons() function
                return false;
            }
            var assets = $scope.selectedArray;
            $scope.copyEdit = true;
            if (assets !== undefined) {
                $scope.copyEdit = true;
                if (assets.length > 1) {
                    $analytics && $analytics.eventTrack("Edit Assets", {  category: 'Configure', label: 'Copied Assets' });
                    ngDialog.open({
                        template: 'app/configure/environments/edit-multiple-assets.html',
                        scope: $scope,
                        overlay:true,
                        name: 'Edit-Assets',
                        data: assets,
                        ngDialogStyle:'width:600px;',
                        closeByDocument: false,
                        closeByEscape: true
                    });
                } else if (assets.length === 1) {
                    var asset = assets[0];
                    if(asset.name.endsWith(NAS_POSTFIX) || asset.os_type == ASSET_TYPE_NDMP) {
                        $scope.assetList=asset;
                        $analytics && $analytics.eventTrack("Edit NAS", {  category: 'Configure', label: 'Copied Assets' });
                        ngDialog.open({
                            template: 'app/configure/environments/addEditNas.html',
                            scope: $scope,
                            overlay:true,
                            data:asset,
                            name: 'add-edit-nas-dialog',
                            modelDialogId:'add-edit-nas-dailog',
                            ngDialogStyle:'width:600px;',
                            ngDialogPostionStyle:'top:40px;',
                            preCloseCallback: function (value) {}

                        });
                        $scope.isEdit=true;
                        if (asset.os_type == ASSET_TYPE_NDMP) {
                            $scope.isNDMP= true;
                        } else {
                            $scope.isNDMP = false;
                        }
                        associatedAppliance = asset.system_id;
                        serverEdit = true;
                        //EditDisabled = true;
                    } else if(asset.asset_type === ASSET_TYPE_VMWARE_HOST ||
                              asset.asset_type === ASSET_TYPE_XEN ||
                              asset.asset_type === ASSET_TYPE_AHV){
                        $analytics && $analytics.eventTrack("Edit Virtual Host", {  category: 'Configure', label: 'Copied Assets' });
                        ngDialog.open({
                            template: 'app/configure/environments/add-edit-hypervisor.html',
                            scope: $scope,
                            overlay:true,
                            data: assets,
                            name: 'Edit-Hypervisor',
                            ngDialogStyle: 'width:600px;',
                            ngDialogPostionStyle:'top:40px;',
                            closeByDocument: false,
                            closeByEscape: true
                        });
                    } else if (asset.asset_type == ASSET_TYPE_PHYSICAL) {
                        $analytics && $analytics.eventTrack("Edit Asset", {  category: 'Configure', label: 'Copied Assets' });
                        ngDialog.open({
                            template: 'app/configure/environments/EditAsset.html',
                            scope: $scope,
                            overlay:true,
                            name: 'Edit-Server',
                            data: asset,
                            ngDialogStyle:'width:600px;height:520px',
                            closeByDocument: false,
                            closeByEscape: true
                        });
                    } else {
                        ngDialog.open({
                            template: 'app/configure/environments/edit-multiple-assets.html',
                            scope: $scope,
                            overlay:true,
                            name: 'Edit-Assets',
                            data: assets,
                            ngDialogStyle:'width:600px;',
                            closeByDocument: false,
                            closeByEscape: true
                        });
                    }
                }
            }
            return true;
        };

        /*
         * Called once the user confirms deletion (selectedObj had to be set to get this far but we check anyway).
         */
        $scope.deleteAsset = function(){
            if ($scope.selectedObj) {
                var httpMethod = 'delete';
                var url = '/api/clients/'+$scope.selectedObj.id+'/?sid='+$rootScope.local.id;   // use local ID since copied assets.

                $http({
                    method: httpMethod,
                    url : url
                }).success(function(status, headers){
                    var newassets = $scope.protectedAssetsAllDataArr;
                    for (var i = 0; i < newassets.length; i++) {
                        if (newassets.id === $scope.selectedObj.id) {
                            delete newassets[i];
                        }
                    }
                    $scope.protectedAssetsDataArr = newassets;
                    $timeout(function() {
                        $scope.updateTreeGrid($scope.protectedAssetsDataArr);
                    });
                    $(document).trigger("assetChange");
                    ngDialog.open({
                        dialogType:'information',
                        dialogMessage: $scope.selectedObj.name + " " + gettextCatalog.getString("removed successfully.")
                    });
                }).error(function(response) {
                    ngDialog.open({
                        dialogType:'Error',
                        dialogMessage:response.result[0].message
                    });
                });
            }
        };

        $scope.deleteAssetConfirmationDialog = function() {
            if ($scope.selectedObj &&
                ($scope.tableView === false ||
                    ($scope.tableView === true && $scope.selectedArray.length === 1))) {
                var asset_type = $scope.selectedObj.asset_type;
                if (asset_type === ASSET_TYPE_PHYSICAL ||
                    asset_type === ASSET_TYPE_VMWARE_HOST ||
                    asset_type === ASSET_TYPE_XEN ||
                    asset_type === ASSET_TYPE_AHV) {

                    $scope.confirmMessage1 = gettextCatalog.getString('Are you sure want to delete copied asset') + ' ' + $scope.selectedObj.name + '?';
                    if (asset_type === ASSET_TYPE_VMWARE_HOST) {
                        $scope.deleteTitle = gettextCatalog.getString('Confirm Copied VMware Host Removal');
                        $scope.confirmMessage2 = gettextCatalog.getString("When a copied VMware host is removed, all copied VMware hosts and their backup copies are deleted.");
                        $scope.confirmMessage3 = gettextCatalog.getString('I understand that removing this host will delete all copied VMware hosts and their backup copies.');
                    } else {
                        $scope.deleteTitle = gettextCatalog.getString('Confirm Copied Asset Removal');
                        $scope.confirmMessage2 = gettextCatalog.getString('When a copied asset is removed, all of its backup copies are deleted.');
                        $scope.confirmMessage3 = gettextCatalog.getString('I understand that removing this asset will also delete all of its backup copies.');
                    }
                    $scope.submitButtonText = gettextCatalog.getString('Remove Asset and Delete Copies');

                    ngDialog.open({
                        template: 'app/common/confirmationDialog.html',
                        scope: $scope,
                        overlay:true,
                        ngDialogStyle:'width:600px;height:250px',
                        closeByDocument: false,
                        closeByEscape: true
                    });
                } else {
                    ngDialog.open({
                        dialogType:'Warning',
                        dialogMessage: gettextCatalog.getString("Discovered assets (for example, a virtual machine or database) cannot be removed.")
                    });
                }
            } else {
                ngDialog.open({
                    dialogType:'Warning',
                    dialogMessage: gettextCatalog.getString('You must select one and only one asset at a time for deletion.')
                });
            }
        };

        function processAssets(PHD, window) {

            var Assets = function($el) {
                $scope.el = $el;
                this.$el = $el;
                this.dbid = this.$el.data("dbid");
                this.$header = $el.children(".environment-header");

                this.$buttons = $el.find(".button-bar a");
                $scope.buttons = this.$buttons;
                this.$options = this.$buttons.filter(".btn-environment-options");
                this.$el.find(".btn-group-display").flyout();

                this.appliancesInit = false;

                this.assets = [];
                this.$selectedAppliance = $();
                this.selectedID = null;
                $scope.selectedID = null;

                this.applianceProcess = null;
                this.detailProcess = null;

                this.timestamp = 0;
                this.refreshInterval = null;
                this.isActive = false;

                this.loadingIndicator = null;
            };

            Assets.prototype.init = function() {
                var self = this;

                this.initButtons();

                /*this.$applianceTable
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.$applianceTable.scrollTable({"height": ".environment-assets"});
                        if(event.type === "loadfinished" && self.assets.length) {
                            //self.AssetsTable.selectByID(self.appliances[0].id);
                        }
                    }); */

                return this;
            };

            Assets.prototype.initButtons = function() {
                var self = this;
                return this;
            };

            Assets.prototype.updateButtons = function() {
                // Enable Edit button when 1 asset is selected.
                // Disable in case of: multiple assets are selected at level 1, Or Multiple assets at level 2 (enable if VMware VM's), Or multiple assets at multiple levels
                if($scope.selectedArray.length > 1){
                    var index, system_id = $scope.selectedArray[0].system_id, assetType = $scope.selectedArray[0].asset_type;
                    for (index = 0; index < $scope.selectedArray.length; ++index) {
                        if($scope.selectedArray[index].$$treeLevel === 0){
                            this.$buttons.filter(".settings-edit-assets").toggleButton();
                            $scope.button_allowed = false;
                            break;
                        }
                        else if(system_id !== $scope.selectedArray[index].system_id){
                            this.$buttons.filter(".settings-edit-assets").toggleButton();
                            $scope.button_allowed = false;
                            break;
                        }
                        else if($scope.selectedArray[index].$$treeLevel === 1 &&
                            ($scope.selectedArray[index].asset_type !== "VMware:VM" && $scope.selectedArray[index].asset_type !== "AHV:VM") ||
                            typeof ($scope.selectedArray[index].asset_type) === "undefined") {
                            // Allow multiple VMware and AHV VMS, at level 1 (host->item) be edited.
                            this.$buttons.filter(".settings-edit-assets").toggleButton();
                            $scope.button_allowed = false;
                            break;
                        }
                        else if($scope.selectedArray[index].$$treeLevel === 2 &&
                            (typeof ($scope.selectedArray[index].asset_type) === "undefined")){
                            // Allow multiple assets at level 2 (host->app->item) be edited.
                            this.$buttons.filter(".settings-edit-assets").toggleButton();
                            $scope.button_allowed = false;
                            break;
                        }
                        else{
                            this.$buttons.filter(".settings-edit-assets").toggleButton(true);
                            $scope.button_allowed = true;
                        }
                    }
                }
                else{
                    this.$buttons.filter(".settings-edit-assets").toggleButton(true);
                    $scope.button_allowed = true;
                }
                return this;
            };
            
            

            Assets.prototype.refresh = function(fn, updateDetails) {
                var self = this;
                if(this.isActive) {
                    fn = fn || this.updateAssets;
                    updateDetails = !(updateDetails === false);

                    this.applianceProcess = this.fetchAssets(fn);

                    $.when(this.applianceProcess).done(function() {
                        self.applianceProcess = null;
                        //if(!self.selectedID && self.appliances.length) self.AssetsTable.selectByID(self.appliances[0].state.id);
                        //if(!self.selectedID && self.assets.length) self.AssetsTable.selectByID(self.assets[0].id);
                        //self.setRefreshInterval();
                    });
                }
            };

            Assets.prototype.fetchAssets = function(fn) {
                if(!_.isFunction(fn)) {
                    fn = this.buildAssets;
                }

                this.loadingIndicator = PHD.showLoadingIndicator($("#config-copied-assets"), false);
                return PHD.Ajax
                    .get("/api/assets/?grandclient=true", this.loadingIndicator)
                    .done($.proxy(fn, this));
            };

            $scope.protectedAssetsDataArr = [];
            $scope.protectedAssetsAllDataArr = [];
            $scope.selectedAssets = [];
            Assets.prototype.buildAssets = function(data) {
                if(data) {
                    this.assets = data.data;
                    this.assets.forEach(function(asset, index) {
                       asset.description = (asset.os_type !== undefined) ? asset.os_type : asset.asset_type;
                    });
                    $scope.selectedArray = [];
                    $scope.protectedAssetsAllDataArr = this.assets;
                    if($scope.display === ASSET_DISPLAY_FILTER_PHYSICAL){
                        $scope.displayPhysical();
                    } else if($scope.display === ASSET_DISPLAY_FILTER_VIRTUAL){
                        $scope.displayVirtual();
                    } else {
                        $scope.displayAll();
                    }

                    $scope.selectedAssets = $scope.protectedAssetsDataArr[0];
                    if ($scope.selectedAssets !== undefined) {
                        $scope.selectedID = $scope.selectedAssets.id;
                    } else {
                        $scope.selectedID = null;
                    }
                    if ($scope.protectedAssetsDataArr[0] !== undefined && $scope.protectedAssetsDataArr[0].id !== undefined) {
                        $("#" + ($scope.protectedAssetsDataArr[0].id)).css("background-color","#f5f5f5");
                    }
                }
                if(this.applianceProcess) this.applianceProcess.resolve();
            };

            Assets.prototype.updateAssets = function(data) {
                if(data) {
                    this.assets = data.data;
                    this.assets.forEach(function(asset, index) {
                        asset.description = (asset.os_type !== undefined) ? asset.os_type : asset.asset_type;
                    });
                    this.timestamp = data.timestamp;
                    $scope.selectedArray = [];
                    $scope.protectedAssetsAllDataArr = this.assets;

                    // reset state of expandAll button on reload.
                    if ($scope.gridApi !== undefined) {
                        $scope.gridApi.grid.treeBase.expandAll = false;
                    }
                    if($scope.display === ASSET_DISPLAY_FILTER_PHYSICAL){
                        $scope.displayPhysical();
                    } else if($scope.display === ASSET_DISPLAY_FILTER_VIRTUAL){
                        $scope.displayVirtual();
                    } else {
                        $scope.displayAll();
                    }
                }
                if(this.applianceProcess) this.applianceProcess.resolve();
            };

            Assets.prototype.isReady = function() {
                return this.isActive && (this.applianceProcess === null || this.applianceProcess.state() === 'resolved') &&
                    (this.detailProcess === null || this.detailProcess.state() === 'resolved');
            };

            Assets.prototype.setButtonLock = function(locked) {
                this.$buttons.each(function() {
                    $(this).toggleButton(!locked);
                });
            };

            Assets.prototype.initAssets = function() {
                this.refresh(this.buildAssets);
                this.appliancesInit = true;
                return this;
            };

            Assets.prototype.kill = function() {
                var self = this,
                    url = "/api/clients/" + $scope.selectedObj.id + "/?sid=" + $rootScope.local.id;
                //UNIBP-1708 added loding indicator while removing
                var deleteProtectedAsset = PHD.showLoadingIndicator("body", true, "Removing...");
                var resp = PHD.Ajax.delete(url, null, deleteProtectedAsset);
                resp.done(function(data) {
                    $analytics && $analytics.eventTrack('Delete Asset', {  category: 'Configure', label: 'Configure' });
                    self.selectedID = null;
                    PHD.hideLoadingIndicator(deleteProtectedAsset);
                    self.refresh(self.fetchAssets);
                });
            };

            Assets.prototype.activate = function() {
                this.isActive = true;
                if(!this.appliancesInit) {
                    this.initAssets();
                } else {
                    this.refresh(this.updateAssets);
                }
                return this;
            };

            Assets.prototype.deactivate = function() {
                this.isActive = false;
                clearInterval(this.refreshInterval);
                return this;
            };

            var AssetsTab = function(index, $panel) {
                this.index = index;
                this.$panel = $panel;
                this.$assetsArea = this.$panel.children("#copied-assets-list");
                this.$environments = null;
                this.environmentList = {};
                this.activeEnvironment = null;
                this.isActive = false;
                this.isBootstrapped = false;
            };

            AssetsTab.prototype.bootstrap = function(data) {
                this.$environments = this.$assetsArea.find(".environment");
                this.environmentList = new Assets(this.$environments).init();
                $scope.Assets = this.environmentList;
                this.activeEnvironment = this.environmentList; //this.environmentList.activate();
                this.isBootstrapped = true;
            };

            AssetsTab.prototype.init = function() {
                var self = this;
                $(document)
                    .on("assetChange", function(event, dbid) {
                        if ($scope.Assets !== undefined && $scope.Assets.appliancesInit !== undefined) {
                            if(!$scope.Assets.appliancesInit) {
                                $scope.Assets.initAssets();
                            } else {
                                $scope.Assets.refresh($scope.Assets.updateAssets);
                            }
                        }
                    });

                return this;
            };

            AssetsTab.prototype.activate = function() {
                this.isActive = true;
                if(!this.isBootstrapped) {
                    this.bootstrap();
                }
                if(this.activeEnvironment) {
                    this.activeEnvironment.activate();
                }
                return this;
            };

            AssetsTab.prototype.deactivate = function() {
                this.isActive = false;
                if(this.activeEnvironment) {
                    this.activeEnvironment.deactivate();
                }
                return this;
            };
            
            Assets.prototype.setSelectedAssets = function(selectedId){
                var self = this;
                
                $scope.listViewFlag = true;

                this.$selectedAppliance = $scope.el;
                this.selectedID = selectedId;
            };

            $scope.selectProtectedAssetsFromList = function(selectedId){
                if (selectedId !== undefined && selectedId !== null) {
                    var arrLength=($scope.protectedAssetsDataArr).length;

                    for (var i=0; i < arrLength; i++){
                        if ($scope.protectedAssetsDataArr[i].id===selectedId){
                            $scope.selectedAssets = $scope.protectedAssetsDataArr[i];
                            $scope.selectedObj = $scope.selectedAssets;
                            PHD.appliance_sid = $scope.selectedObj.system_id;
                            $("#" + selectedId).css("background-color","#f5f5f5");
                            $scope.selectedID = selectedId;
                        }else{
                            $("#" + $scope.protectedAssetsDataArr[i].id).css("background-color","#fff");
                        }
                    }
                    $scope.Assets.setSelectedAssets(selectedId);
                }
            };

            PHD.CopiedAssetsTab = AssetsTab;
        }

        // Initialize the controller.
        $scope.initCtrl();
    }]);