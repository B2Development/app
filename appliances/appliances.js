var noOfPSATools = 0;

angular.module('configAppliances', ['ngDialog', 'angulartics', 'angulartics.google.analytics'])
    .config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            plain: false,
            closeByDocument: true,
            closeByEscape: true,
            appendTo: false,
            preCloseCallback: function (value) {

            }
        });
    }])
    .filter('major_minor_filter', function() {
        return function (text) {
            var version = text;
            if (version !== undefined && version.length >= 3) {
                // handle version 10 and version < 10
                if (version[0] >= '1' && version[1] !== '.') {
                    version =  version.substring(0, 4);
                } else {
                    version = version.substring(0, 3);
                }
            }
            return version;
        }
    })
    .controller('AppliancesCtrl', ['$scope', '$rootScope', '$http', 'ngDialog', 'wizardService', '$analytics', 'gettextCatalog', 'sortsvc',
        function($scope, $rootScope, $http, ngDialog, wizardService, $analytics, gettextCatalog, sortsvc) {

            $scope.initCtrl = function () {
                processAppliances(PHD, window, $analytics);
            };

            var statelessInfo = PHD.Ajax.get("/api/storage/stateless/?sid=" + PHD.appliance_sid);

            statelessInfo.done(function(dataStateless) {
                $scope.isStateless = dataStateless.stateless;
            });

            $scope.listViewFlag =false;
            $scope.tableView = true;
            $scope.getView = function(tabular) {
                var view = tabular || $scope.tableView;
                return (view === true ? "Table" : "List");
            };

            $scope.STORAGE_TAB = 0;
            $scope.TARGETS_TAB = 1;
            $scope.NETWORK_TAB = 2;
            $scope.INTERACTIONS_TAB = 3;
            $scope.ASSETS_TAB = 4;
            $scope.tape_changer=[];
            $scope.myData = [];
            $scope.errorIndex=[];
            $scope.importObject={};
            $scope.checkforValidSlots=true;
            $scope.slotsObj={};
            $scope.FIXED_DETAILS_HEIGHT = 110;      // height in pixels of button bar and tabs above details.
            $scope.FIXED_HEADER_HEIGHT = 32;
            $scope.TABLE_ROW_HEIGHT = 30;
            $scope.toggleView = function() {
                $scope.tableView = !$scope.tableView;

                if($scope.currentDetail == $scope.STORAGE_TAB){
                    $scope.setApplianceStorageTab();
                } else if ($scope.currentDetail == $scope.TARGETS_TAB) {
                    $scope.setApplianceTargetsTab();
                } else if ($scope.currentDetail == $scope.NETWORK_TAB) {
                    $scope.setApplianceNetworkTab();
                } else if ($scope.currentDetail == $scope.INTERACTIONS_TAB) {
                    $scope.setApplianceInteractionsTab();
                }

                if(!$scope.tableView){
                    $scope.selectApplianceFromList($scope.selectedID, false);
                    $("#" + ($scope.selectedID)).css("background-color","#f5f5f5");
                }
            };

        // Target Operations
        $scope.handleMedia = {method: gettext("Erase")};

        function processAppliances(PHD, window, $analytics) {
            var REFRESH_INTERVAL = 60000;
            var STORAGE_TAB = $scope.STORAGE_TAB,
                TARGETS_TAB = $scope.TARGETS_TAB,
                NETWORK_TAB = $scope.NETWORK_TAB,
                INTERACTIONS_TAB = $scope.INTERACTIONS_TAB,
                ASSETS_TAB = $scope.ASSETS_TAB;

            var storageTypeLookup = {
                "backup": gettext("Backup"),
                "archive": gettext("Backup Copy"),
                "sync": gettext("Sync")
            };

            var storageDialogTitle = gettext("Add %(storage_type)s %(usage)s Target");

            function usageLookup(usage) {
                var icon = '<i class="icon-uui-backup' + ' icon-large text-standard" title="' + 'Backup' + '"></i> ';
                if (usage == 'archive') {
                    icon = '<i class="icon-uui-backup-copy icon-large text-standard" title="' + 'Backup Copy' + '"></i> ';
                }
                return icon;
            }

            var storage_icon_map = {};
            storage_icon_map[""] = "harddrive";
            storage_icon_map["internal"] = "harddrive";
            storage_icon_map["stateless"] = "harddrive";
            storage_icon_map["disk"] = "harddrive";
            storage_icon_map["iscsi"] = "iscsi";
            storage_icon_map["fc"] = "fc";
            storage_icon_map["added_internal"] = "harddrive";

            function getStorageType(row) {
                var type = 'attached';
                var icon_name = 'harddrive';
                if (row.type === 'nas') {
                    if (row.properties !== undefined && row.properties != null) {
                        icon_name = type = row.properties.protocol;
                    }
                } else {
                    icon_name = storage_icon_map[row.type];
                    if (row.type !== 'internal' && row.type !== 'added_internal') {
                        type = row.type;
                    }
                }
                return '<i class="icon-uui-' + icon_name + ' icon-large text-standard" title="' + type + '"></i>';
            }

            function getTargetType(row) {
                var targetType = row.type;
                var icon_name;
                switch (targetType) {
                    case "added_internal":
                        icon_name = "harddrive";
                        targetType = "attached";
                        break;
                    case "appliance":
                        icon_name = "unitrends-appliance2";
                        break;
                    case "Unitrends_cloud":
                    case "managed_cloud":
                        icon_name = "unitrends-cloud2";
                        break;
                    case "cloud_storage":
                        icon_name = "cloud";
                        break;
                    case "tape":
                    case "changer":
                        icon_name = "tape";
                        break;
                    default:
                        if (row.archive) {
                            icon_name = "harddrive";
                        } else {
                            // Handle all generations of cloud targets.
                            icon_name = (targetType.indexOf('cloud') !== -1) ? "cloud" : targetType;
                        }
                        break;
                }
                return '<i class="icon-uui-'+icon_name+' icon-large" title="' + targetType + '" style="margin-right:2px;"></i> ' + targetType;
            }

            function getInteractionToolName(row) {
                var toolName = row.tool_name;
                // TODO - change the icon based on the tool
                //var icon_name = "unitrends-appliance2";
                //var icon = '<i class="icon-uui-' + icon_name + ' icon-large text-standard" title="' + toolName + '"style="margin-right:2px;"></i> ' + toolName;
                return toolName;//icon;
            }

            var cellFormatter = {
                name: function(value,row){
                    var appliancename = row.name;
                    var applianceType = row.role;
                    var iconClass = $scope.getApplianceIcon(applianceType);
                    var displayStatus = $scope.getApplianceDisplayStatus(applianceType);
                    
                    return '<span title="' + displayStatus + '">' + '<i class="'+iconClass+' icon-large" title="' +
                        displayStatus + '" style="padding-right: 0.75em;padding-left: 2px;"></i>'  + appliancename + '</span>';
                },
                role: function(value, row) {
                    var value = row.role;
                    var html = title = "";
                    if (typeof value !== 'undefined') {
                        if (value[2]) {
                            title = gettext("Presentation Appliance");
                            html += '<i class="icon-phd-layer-presentation icon-large vba-pres" title="' + title + '"></i>';
                        }
                        if (value[1]) {
                            title = gettext("Management Appliance");
                            html += '<i class="icon-phd-layer-management icon-large vba-mgmt" title="' + title + '"></i>';
                        }
                        if (value[0]) {
                            title = gettext("Engine Appliance");
                            html += '<i class="icon-phd-layer-engine icon-large vba-eng" title="' + title + '"></i>';
                        }
                    }
                    return html;
                },
                total_mb_size: function(value, row) {
                    var used_allocated = "";
                    var percent_used = 0;
                    var state = "storage-";
                    if (row.total_mb_size !== undefined) {
                        var sizeVal = row.total_mb_size;
                        var freeVal = row.total_mb_free;
                        if (sizeVal === 0 || sizeVal === "N/A") {
                            used_allocated = "Not Available";
                            state += "unknown";
                            percent_used = 100;
                        } else {
                            var size = PHD.util.formatMB(sizeVal);
                            var used = PHD.util.formatMB(sizeVal - freeVal);
                            used_allocated = "" + used + " / " + size;
                            percent_used = ((sizeVal - freeVal) * 100.0) / sizeVal;
                            if (percent_used < STORAGE_WARNING_THRESHOLD) state += "ok";
                            if (percent_used >= STORAGE_WARNING_THRESHOLD && percent_used < STORAGE_CRITICAL_THRESHOLD) state += "warn";
                            if (percent_used >= STORAGE_CRITICAL_THRESHOLD) state += "critical";
                        }
                    }
                    return '<div class="progress-bar" title="' + used_allocated + '">' +
                        '<div class="progress-meter ' + state + '" style="width:' + percent_used + '%;"></div></div>';
                },
                type: function (value, row) {
                    var typeIcon;
                    if (row.usage !== undefined) {
                        typeIcon = getStorageType(row);
                    }
                    return typeIcon;
                },
                status: function(value, row) {
                    var displayStatus = row.status;
                    var iconClass = "";
                    var displayTitle = "";
                    var toolTip;
                    if (row.message !== undefined) {
                        // set tooltip to message if present, otherwise leave undefined.
                        toolTip = PHD.util.quoteattr(row.message);
                    }
                    var showAsButton = false;
                    if (displayStatus === 'pending') {
                        iconClass = "exclamationsign";
                        displayTitle = "Pending";
                        toolTip = "Please click to accept or deny this Backup Copy request.";
                        showAsButton = true;
                    } else if (displayStatus === 'accepted') {
                        iconClass = "okcircle";
                        displayTitle = "Accepted";
                    } else if (displayStatus === 'rejected') {
                        iconClass = "forbidden";
                        displayTitle = "Rejected";
                    }else if (displayStatus === 'failed') {
                        iconClass = "erroralt";
                        displayTitle = "Failed";
                    }else if (displayStatus === 'suspended') {
                        iconClass = "exclamationsign";
                        displayTitle = "Suspended";
                    }else if (displayStatus === 'available') {
                        iconClass = "okcircle";
                        if(row.local === true ) {
                            displayTitle = "Available (logged in)";
                        } else {
                            displayTitle = "Available";
                        }

                    }else if (displayStatus === 'not available') {
                        if(row.role === "Non-Managed Replication Source"){
                            iconClass = "bancircle";
                        }else{
                            iconClass = "exclamationsign";
                        }
                        displayTitle = "Not Available";
                    }
                    toolTip = toolTip || displayTitle;
                    var colText = '<span title="' + toolTip + '">' + '<i class="icon-'+iconClass+' icon-large"></i> ' + displayTitle + '</span>';
                    if (showAsButton) {
                        colText = '<button title="' + toolTip + '" class="pending-backup-copy">' +
                                    '<i class="icon-'+iconClass+' icon-large"></i> ' + displayTitle + '</button>';
                    }
                    return colText;
                },
                version: function(value, row) {
                    var icon = title = "";
                    if(row.version_status === "update_available") {
                        title = gettext("An update is available. Click on the gears icon in the toolbar menu, then select Check For Updates.");
                        icon = '<i class="icon-phd-update-needed" title="'+title+'"></i>';
                    } else if (row.version_info === VERSION_UPDATE_IN_PROGRESS) {
                        title = gettext("Update in progress");
                        icon = '<i class="icon-phd-update-in-progress icon-pulse" title="'+title+'"></i>';
                    }
                    return icon + " " + value;
                },
                mb_size: function(value, row) {
                    return PHD.util.formatMB(value);
                },
                mb_free: function(value, row) {
                    return PHD.util.formatMB(value);
                },
                max_size: function(value, row) {
                    if (value != 0) {
                        return PHD.util.formatMB(value * 1024);
                    } else {
                        return value;
                    }
                }
            };

            var storageFormatter = jQuery.extend({}, cellFormatter);
            storageFormatter.status = function (value, row) {
                var displayStatus = "Online";
                var title = displayStatus;
                var iconClass = "okcircle";
                var iconColor = "green";
                if (value === 'pending') {
                    iconClass = "restart icon-spin";
                    displayStatus = "Pending";
                    iconColor = "black";
                } else if (value === "offline") {
                    iconClass = "exclamationsign";
                    displayStatus = "Offline";
                    iconColor = "#e00034";
                } else if (value === 'deleting') {
                    iconClass = "restart icon-spin";
                    displayStatus = "Deleting";
                    iconColor = "black";
                }
                var html = '<span title="' + displayStatus + '">' + '<i class="icon-'+iconClass +
                    ' icon-large" style="color:' + iconColor + ';margin-right:2px;"></i>    ' + displayStatus + '</span>';
                return html;
            };
            storageFormatter.percent_used = function(value, row) {
                var used_allocated = "";
                var percent_used = 0;
                var state = "storage-";
                if (row.mb_size !== undefined) {
                    var sizeVal = row.mb_size;
                    var freeVal = row.mb_free;
                    if (sizeVal === 0 || sizeVal === "N/A" ) {
                        used_allocated = "Not Available";
                        state += "unknown";
                        percent_used = 100;
                    } else {
                        var size = PHD.util.formatMB(sizeVal);
                        var used = PHD.util.formatMB(sizeVal - freeVal);
                        used_allocated = "" + used + " / " + size;
                        percent_used = ((sizeVal - freeVal) * 100.0) / sizeVal;
                        if (percent_used < STORAGE_WARNING_THRESHOLD) state += "ok";
                        if (percent_used >= STORAGE_WARNING_THRESHOLD && used < STORAGE_CRITICAL_THRESHOLD) state += "warn";
                        if (percent_used >= STORAGE_CRITICAL_THRESHOLD) state += "critical";
                    }
                }
                return '<div class="progress-bar" title="' + used_allocated + '">' +
                    '<div class="progress-meter ' + state + '" style="width:' + percent_used + '%;"></div></div>';
            };

            var networkFormatter  = {
                dns: function(value) {
                    var html = "";
                    if(value[0]) {
                        html += '<span class="truncates item-name" title="' + value[0] + '">' + value[0] + '</span>';
                    }
                    if(value[1]) {
                        html += '<span class="truncates item-name" title="' + value[1] + '">' + value[1] + '</span>';
                    }
                    return html;
                },
                searchDns: function(value) {
                    var html = "";
                    if(value[0]) {
                        html += '<span class="truncates item-name" title="' + value[0] + '">' + value[0] + '</span>';
                    }
                    if(value[1]) {
                        html += '<span class="truncates item-name" title="' + value[1] + '">' + value[1] + '</span>';
                    }
                    return html;
                }
            };
            
            var targetsFormatter = {
                name: function (value, row) {
                    var title = row.media_serials !== undefined ? "Serial #:" + row.media_serials : row.name;
                    return '<span class="truncates item-name" title="' + title + '">' + value + '</a></span>';
                },
                status: function(value, row) {
                    var targetStatus = row.status;
                    var displayStatus = "";
                    var title = (typeof(row.message) != "undefined") ? PHD.util.quoteattr(row.message) : "";
                    var iconClass = "";
                    var iconColor = "black";
                    var html = "";
                    if(row.type =='tape' || row.type =='changer'){
                        if(typeof(row.status) != 'undefined' && row.is_available ){
                            iconClass = "okcircle";
                            displayStatus = "Online";
                            iconColor = "green";
                        }else{
                            iconClass = "exclamationsign";
                            displayStatus = "Offline";
                            iconColor = "#e00034";
                        }
                    }
                    else if (targetStatus === 'pending') {
                        iconClass = "warningsign";
                        displayStatus = "Pending";
                        iconColor = "#FF9933";
                    } else if (targetStatus === "online" || targetStatus === "complete" || targetStatus === "busy") {
                        iconClass = "okcircle";
                        displayStatus = "Online";
                        iconColor = "green";
                        if (row.archive) {
                            if (targetStatus === "busy") {
                                title = "copying data...";
                            } else {
                                title = "Ready";
                            }
                        }
                    } else if(targetStatus === "suspended") {
                        iconClass = "exclamationsign";
                        displayStatus = "Suspended";
                        iconColor = "#e00034";
                    } else if(targetStatus === "rejected"){
                        iconClass = "forbidden";
                        displayStatus = "Rejected";
                        iconColor = "#e00034";
                    } else if(targetStatus === "failed"){
                        iconClass = "erroralt";
                        displayStatus = "Failed";
                        iconColor = "#e00034";
                    } else if(targetStatus === "offline" || targetStatus === "ready") {
                        iconClass = "exclamationsign";
                        displayStatus = "Offline";
                        if (row.archive) {
                            if (targetStatus === "offline") {
                                title = "Must be prepared";
                            } else {
                                title = "Ready to mount/bring online";
                            }
                        }
                        iconColor = "#e00034";
                    } else if (targetStatus === 'accepted') {
                        iconClass = "warningsign";
                        displayStatus = "Accepted";
                        iconColor = "#FF9933";
                    }
                    
                    if(typeof(row.created) != "undefined" ){
                        title += '\n\nCreated: ' + row.created;
                    }
                    
                    if((typeof(row.created) != "undefined" ) && (typeof(row.updated) != "undefined" )){
                        title += '\n' + 'Last Updated: ' + row.updated;
                    }else if ((typeof(row.updated) != "undefined" )){
                         title += '\n\nLast Updated: ' + row.updated;
                    }

                    if(targetStatus === "suspended" && typeof(row.suspended) != "undefined" && typeof(row.suspend_toggled) != "undefined") {
                        title += '\n\nSuspended: ' + row.suspend_toggled;
                    }

                    if (row.media_serials !== undefined) {
                        title += "\n\nSerial #:" + row.media_serials;
                    }
                    
                    html = '<span title="' + title + '">' + '<i class="icon-'+iconClass +
                    ' icon-large" style="color:' + iconColor + ';margin-right:2px;"></i>    ' + displayStatus + '</span>';

                    return html;
                },
                version: function(value, row) {
                    var icon = title = "";
                    //if(row.state.version_info === VERSION_NOT_UP_TO_DATE) {
                    if(row.version_status === "update_available") {
                        title = gettext("An update is available. Use the Global tab to apply updates.");
                        icon = '<i class="icon-phd-update-needed" title="'+title+'"></i>';
                        //} else if (row.state.version_info === VERSION_UPDATE_IN_PROGRESS) {
                    } else if (row.version_info === VERSION_UPDATE_IN_PROGRESS) {
                        title = gettext("Update in progress");
                        icon = '<i class="icon-phd-update-in-progress icon-pulse" title="'+title+'"></i>';
                    }
                    return icon + " " + value;
                },
                gb_size: function(value, row) {
                    if (row.is_infinite) {
                        return 'Infinite';
                    }
                    if(value == "N/A") {
                        return value;
                    }
                    return PHD.util.formatGB(value);
                },
                gb_free: function(value, row) {
                    if (row.is_infinite) {
                        return 'Infinite';
                    }
                    if(value == "N/A") {
                        return value;
                    }
                    return PHD.util.formatGB(value);
                },
                percent_used: function (value, row) {
                    var used_allocated = "";
                    var percent_used = 0;
                    var state = "storage-";
                    var max_threshold = row.max_size;
                    var html = "";
                    if (row.gb_size !== undefined) {
                        var sizeVal = row.gb_size;
                        var freeVal = row.gb_free;
                        if (sizeVal === 0 || sizeVal === "N/A") {
                            used_allocated = "Not Available";
                            state += "unknown";
                            percent_used = 100;
                        } else {
                            var size = PHD.util.formatGB(sizeVal);
                            var used = PHD.util.formatGB(sizeVal - freeVal);
                            used_allocated = "" + used + " / " + size;
                            percent_used = ((sizeVal - freeVal) * 100.0) / sizeVal;
                            if (percent_used < STORAGE_WARNING_THRESHOLD) state += "ok";
                            if (percent_used >= STORAGE_WARNING_THRESHOLD && percent_used < STORAGE_CRITICAL_THRESHOLD) state += "warn";
                            if (percent_used >= STORAGE_CRITICAL_THRESHOLD) state += "critical";
                        }
                        html += '<div class="progress-bar" title="' + used_allocated + '">' +
                            '<div class="progress-meter ' + state + '" style="width:' + percent_used + '%;"></div></div>';
                    } else {
                        html += '<div>--</div>';
                    }
                    return html;
                },
                type: function(value, row) {
                    var typeIcon = getTargetType(row);
                    return typeIcon;
                }
            };

            var interactionsFormatter  = {
                tool_name: function(value, row) {
                    var tool = getInteractionToolName(row);
                    return tool;
                }
            };

            var Appliance = function($el) {
                $scope.el = $el;
                this.$el = $el;
                this.dbid = this.$el.data("dbid");
                this.$header = $el.children(".environment-header");
                this.$appliances = $el.children(".environment-appliances");

                this.$buttons = $el.find(".button-bar a");
                $scope.buttons = this.$buttons;
                this.$options = this.$buttons.filter(".btn-environment-options");

                this.appliancesInit = false;

                var applianceTableOptions = {
                    multiselect: false,
                    sortable: true,
                    sortOnHeader: true,
                    sortableCells: [true, true, false, true, true, true, true],
                    sortOnLoad: true,
                    sortingType : "string",
                    cellClasses: ["long-text truncate", null, null, null, null, "numerical", null, null]
                };

                var targetsAndNetworkTableOptions = {
                    multiselect: false,
                    sortable: true,
                    sortOnHeader: true,
                    sortOnLoad: true,
                    sortingType : "string",
                    integerIDs: false
                };

                var bdsandInteractionsTableOptions = {
                    multiselect: false,
                    sortable: true,
                    sortOnHeader: true,
                    sortOnLoad: true,
                    sortingType : "string"
                };

                this.$applianceTable = this.$appliances.find(".appliance-table");
                this.ApplianceTable = PHD.DataTable(this.$applianceTable, applianceTableOptions).registerFormatters(cellFormatter);
                $scope.ApplianceTable = this.ApplianceTable;

                this.appliances = [];
                this.$selectedAppliance = $();
                
                this.selectedID = null;
                $scope.selectedID = null;
                PHD.appliance_sid = this.selectedID;
                $scope.TargetsURL = "/api/backup-copy/targets/?sid=";
                $scope.archiveTargetsURL = "/api/backup-copy/archive_only/?sid=";


                this.$storageTable = this.$el.find(".bds-table");
                this.StorageTable = PHD.DataTable(this.$storageTable, bdsandInteractionsTableOptions).registerFormatters(storageFormatter);
                $scope.StorageTableObj = this.StorageTable;
                
                this.$storageTableList = this.$el.find(".bds-table-list");
                this.StorageTableList = PHD.DataTable(this.$storageTableList, bdsandInteractionsTableOptions).registerFormatters(storageFormatter);
                $scope.StorageTableListObj = this.StorageTableList;

                this.storageData = [];

                this.$targetsTable = this.$el.find(".targets-table");
                this.TargetsTable = PHD.DataTable(this.$targetsTable, targetsAndNetworkTableOptions).registerFormatters(targetsFormatter);
                $scope.TargetsTableObj = this.TargetsTable;

                this.$targetsTableList = this.$el.find(".targets-table-list");
                this.TargetsTableList = PHD.DataTable(this.$targetsTableList, targetsAndNetworkTableOptions).registerFormatters(targetsFormatter);
                $scope.TargetsTableListObj = this.TargetsTableList;

                this.targetsData = [];
                $scope.systemTargetsData = [];
                $scope.archiveTargetsData = [];

                this.$networkTable = this.$el.find(".network-table");
                this.NetworkTable = PHD.DataTable(this.$networkTable, targetsAndNetworkTableOptions).registerFormatters(networkFormatter);
                $scope.NetworkTableObj = this.NetworkTable;
                
                this.$networkTableList = this.$el.find(".network-table-list");
                this.NetworkTableList = PHD.DataTable(this.$networkTableList, targetsAndNetworkTableOptions).registerFormatters(networkFormatter);
                $scope.NetworkTableListObj = this.NetworkTableList;

                this.$interactionsTable = this.$el.find(".interactions-table");
                this.InteractionsTable = PHD.DataTable(this.$interactionsTable, bdsandInteractionsTableOptions).registerFormatters(interactionsFormatter);
                $scope.InteractionsTableObj = this.InteractionsTable;

                this.$interactionsTableList = this.$el.find(".interactions-table-list");
                this.InteractionsTableList = PHD.DataTable(this.$interactionsTableList, bdsandInteractionsTableOptions).registerFormatters(interactionsFormatter);
                $scope.InteractionsTableListObj = this.InteractionsTableList;

                this.currentDetail = STORAGE_TAB;
                $scope.currentDetail = this.currentDetail;

                this.$selectedStorage = $();
                this.selectedStorageID = null;

                this.$selectedTarget = $();
                this.selectedTargetID = null;
                $scope.selectedTarget = null;

                this.$selectedNic = $();
                this.selectedNicID = null;

                this.$selectedTool= $();
                this.selectedToolID = null;
                $scope.selectedConfigID = null;

                this.applianceProcess = null;
                this.detailProcess = null;

                this.timestamp = 0;
                this.refreshInterval = null;
                this.isActive = false;

                this.enableString = gettextCatalog.getString("Enable");
                this.disableString = gettextCatalog.getString("Disable");
            };
           
            Appliance.prototype.init = function() {
                var self = this;

                this.maxDetailsHeight = $(".environment-appliances:visible").height();  // initialize max height of area.
                this.maxDetailsListHeight = this.maxDetailsHeight;

                this.initButtons();

                this.$applianceTable
                    .on("rowselect", function(event, dbid, $el, DataTable) {
                        self.$selectedAppliance = $el;
                        $scope.el = $el;
                        self.selectedID = dbid;
                        PHD.appliance_sid = self.selectedID;
                        $scope.selectedID = self.selectedID;
                        $scope.selectedAppliance = $scope.applianceDataArr !== undefined ?
                            (_.find($scope.applianceDataArr, function(obj) { return obj.id === $scope.selectedID })) : [];
                        self.$selectedStorage = $();
                        self.selectedStorageID = null;
                        self.$selectedNic = $();
                        self.selectedNicID = null;
                        self.$selectedTarget = $();
                        self.selectedTargetID = null;
                        $scope.selectedTarget = null;
                        self.$selectedTool = $();
                        self.selectedToolID = null;
                        $scope.selectedConfigID = null;
                        self.updateButtons();

                        var appliancedatatable = DataTable.data;
                        $rootScope.replicationApplianceId = self.selectedID; //:TODO - throttleChange

                        $("#config-storage").show();
                        $("#tableStorageTab").show()
                        //Network Tab show
                        $("#tableNetworkTab").show();
                        $("#config-network").show();
                        //Interactions Tab show
                        $("#tableInteractionsTab").show();
                        $("#config-interactions").show();

                        if (typeof(appliancedatatable) != "undefined") {
                            for (var i = 0; i < appliancedatatable.length; i++) {
                                if (appliancedatatable[i].id == $rootScope.replicationApplianceId) {
                                    $rootScope.replicationApplianceName = appliancedatatable[i].name;
                                    $scope.replicationApplianceStatus = appliancedatatable[i].status;

                                    if (appliancedatatable[i].role == SYSTEM_ROLE_DISPLAY_NAME_NON_MANAGED_REPLICATION_SOURCE ||
                                        appliancedatatable[i].role == SYSTEM_ROLE_DISPLAY_NAME_PENDING_REPLICATION_SOURCE
                                    ) {
                                        if (!appliancedatatable[i].local) {
                                            //Storage Tab hide
                                            $("#tableStorageTab").hide();
                                            $("#config-storage").hide();
                                            //Network Tab hide
                                            $("#tableNetworkTab").hide();
                                            $("#config-network").hide();
                                            //Interactions Tab hide
                                            $("#tableInteractionsTab").hide();
                                            $("#config-interactions").hide();

                                            $("#tableTargetsTab").trigger('click');//focus on Backup target tab.
                                        } else {
                                            $("#tableStorageTab").trigger('click');//focus on storage tab if row changes and row is local.
                                        }
                                    } else if (appliancedatatable[i].role != SYSTEM_ROLE_DISPLAY_NAME_NON_MANAGED_REPLICATION_SOURCE ||
                                        appliancedatatable[i].role != SYSTEM_ROLE_DISPLAY_NAME_PENDING_REPLICATION_SOURCE
                                    ) {//if select other row then focus will be on default storarage tab.
                                        $("#tableStorageTab").trigger('click');
                                    }
                                }
                            }
                        }

                        if ($(".storagesubtab").closest("li").hasClass("ui-tabs-active ui-state-active")) {
                            this.currentDetail = STORAGE_TAB;
                        } else if ($(".targetssubtab").closest("li").hasClass("ui-tabs-active ui-state-active")) {
                            this.currentDetail = TARGETS_TAB;
                        } else if ($(".networksubtab").closest("li").hasClass("ui-tabs-active ui-state-active")) {
                            this.currentDetail = NETWORK_TAB;
                        } else if ($(".interactionssubtab").closest("li").hasClass("ui-tabs-active ui-state-active")) {
                            this.currentDetail = INTERACTIONS_TAB;
                        } else{
                            this.currentDetail = $scope.currentDetail;
                        }
                        self.refresh(this.updateAppliances, false);
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.$applianceTable.scrollTable({"height": ".environment-appliances"});
                        var sortIP = {
                            'ip': function (a, b) {
                                return sortsvc.ipSortSeparate(a.value, b.value);
                            }
                        };
                        self.$applianceTable.sortTable(sortIP);
                        if(event.type === "loadfinished" && self.appliances.length) {
                            //self.ApplianceTable.selectByID(self.appliances[0].id);
                            self.$applianceTable.sortTable(sortIP);
                        }
                    })
                    //.on("click", "td i.icon-exclamationsign.icon-large", function(event,dbid, $el, DataTable) {
                    // allow the click to be on the button
                    .on("click", "td .pending-backup-copy", function(event,dbid, $el, DataTable) {
                        event.preventDefault();

                        var selectedAppliance = _.find(self.appliances, function(obj) { return obj.id == self.selectedID });
                    
                        if((selectedAppliance.status ) === "pending"){
                            ngDialog.open({
                                template: 'app/configure/appliances/replicationStatusOptionTemplate.html',
                                scope: $scope,
                                data: { appliancename: $rootScope.replicationApplianceName,
                                        selectedTarget: $scope.selectedTarget,
                                        selectedPendingSource: selectedAppliance},
                                overlay:true,
                                modelDialogId:'replication-approval-dailog',
                                ngDialogStyle:'width:40em;'
                            });
                        }
                    });


                this.$storageTable
                    .on("click", ".help-trigger i", function(event) {
                        var $anchor = $(this).parent();

                        $("<div>", {
                            html: $anchor.data("value")
                        }).popover({
                            autoOpen: true,
                            anchor: $anchor,
                            popoverClass: "nowrap",
                            position: {
                                my: "center bottom",
                                at: "center top-5"
                            }
                        });
                    })
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedStorage = $el;
                        self.selectedStorageID = dbid;
                        self.updateBackupButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupButtons();
                        self.$storageTable.sortTable();
                    });

                this.$storageTableList
                    .on("click", ".help-trigger i", function(event) {
                        var $anchor = $(this).parent();

                        $("<div>", {
                            html: $anchor.data("value")
                        }).popover({
                            autoOpen: true,
                            anchor: $anchor,
                            popoverClass: "nowrap",
                            position: {
                                my: "center bottom",
                                at: "center top-5"
                            }
                        });
                    })
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedStorage = $el;
                        self.selectedStorageID = dbid;
                        self.updateBackupButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupButtons();
                        self.$storageTableList.sortTable();
                    });


                this.$targetsTable
                    .on("click", ".help-trigger i", function(event) {
                        var $anchor = $(this).parent();

                        $("<div>", {
                            html: $anchor.data("value")
                        }).popover({
                            autoOpen: true,
                            anchor: $anchor,
                            popoverClass: "nowrap",
                            position: {
                                my: "center bottom",
                                at: "center top-5"
                            }
                        });
                    })
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedTarget = $el;
                        self.selectedTargetID = dbid;
                        $scope.selectedTarget = _.findWhere(self.targetsData, {"id": dbid});
                        self.updateBackupCopyButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupCopyButtons();
                        if (self.$targetsTable.is(":visible")) {
                            // Compute height based on number of targets.
                            // Scroll the list up to a maximum height.
                            if (self.targetsData.length > 0) {
                                var targetsHeight = $scope.FIXED_HEADER_HEIGHT + (self.targetsData.length * $scope.TABLE_ROW_HEIGHT);
                                if (targetsHeight > self.maxDetailsHeight) {
                                    targetsHeight = self.maxDetailsHeight;
                                }
                                self.$targetsTable.scrollTable({"height": targetsHeight});
                            }
                        }
                        self.$targetsTable.sortTable();
                    });

                this.$targetsTableList
                    .on("click", ".help-trigger i", function(event) {
                        var $anchor = $(this).parent();

                        $("<div>", {
                            html: $anchor.data("value")
                        }).popover({
                            autoOpen: true,
                            anchor: $anchor,
                            popoverClass: "nowrap",
                            position: {
                                my: "center bottom",
                                at: "center top-5"
                            }
                        });
                    })
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedTarget = $el;
                        self.selectedTargetID = dbid;
                        $scope.selectedTarget = _.findWhere(self.targetsData, {"id": dbid});
                        self.updateBackupCopyButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupCopyButtons();
                        if (self.$targetsTableList.is(":visible")) {
                            // Compute height based on number of targets.
                            // Scroll the list up to a maximum height.
                            // In list mode, one appliance tab needs to be subtracted.
                            if (self.targetsData.length > 0) {
                                var targetsHeight = $scope.FIXED_HEADER_HEIGHT + (self.targetsData.length * $scope.TABLE_ROW_HEIGHT);
                                if (targetsHeight > self.maxDetailsListHeight) {
                                    targetsHeight = self.maxDetailsListHeight;
                                }
                                self.$targetsTableList.scrollTable({"height": targetsHeight});
                            }
                        }
                        self.$targetsTableList.sortTable();
                    });


                this.$networkTable
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedNic = $el;
                        self.selectedNicID = dbid;
                        self.updateNetworkButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupCopyButtons();
                        self.$networkTable.sortTable();
                    });
                
                this.$networkTableList
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedNic = $el;
                        self.selectedNicID = dbid;
                        self.updateNetworkButtons();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        self.updateBackupCopyButtons();
                        self.$networkTableList.sortTable();
                    });

                this.$interactionsTable
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedTool = $el;
                        self.selectedToolID = dbid;
                        self.getConfigID();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        $scope.selectedConfigID = null;
                        self.selectedToolID = null;
                        self.updateInteractionsButtons();
                        self.$interactionsTable.sortTable();
                    });

                this.$interactionsTableList
                    .on("rowselect", ".clickable", function(event, dbid, $el, DataTable) {
                        self.$selectedTool = $el;
                        self.selectedToolID = dbid;
                        self.getConfigID();
                    })
                    .on("loadfinished updatefinished", function(event, newRows, DataTable) {
                        $scope.selectedConfigID = null;
                        self.selectedToolID = null;
                        self.updateInteractionsButtons();
                        self.$interactionsTableList.sortTable();
                    });

                $(document)
                    .on("bdssave nicsave interactionsave", function(event, applianceID, data) {
                        if(self.selectedID === applianceID)
                            self.fetchDetails(true);
                    })
                    .on("vbaadd", function(event) {
                        self.addVBA();
                    })
                    .on("editappliance", function(event) {
                        self.refresh(self.fetchAppliances, false);
                    });

                this.$appliances.find(".sub-tabs-wrapper").tabs({
                    activate: function(event, ui) {
                        self.currentDetail = ui.newTab.index();
                        $scope.currentDetail = self.currentDetail;
                        console.log('currentDetail is ' + self.currentDetail + ' and isactive = ' + self.isActive);
                        
                        if(self.selectedID && self.isActive) {
                            self.fetchDetails(true);
                        }
                    }
                });

                return this;
            };

            Appliance.prototype.initButtons = function() {
                var self = this;

                this.$el.find(".environment-options-menu").flyout();
                this.$el.find(".vba-storage-menu").flyout();

                this.$el
                    .on("click", ".btn-add-attached", function(event) {
                        event.preventDefault();

                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("Attached Disk"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            selectedStorage = null;
                            $analytics && $analytics.eventTrack('Add Disk', {  category: 'Configure', label: 'Appliances' });

                            var resp = PHD.Ajax.get("/api/storage/1/?sid=" + PHD.appliance_sid);
                            resp.done(function(data){
                                selectedStorage = data.storage;
                                if(data.storage.stateless_type === null && $scope.isStateless){
                                    var resp = PHD.Ajax.get("/api/storage/ir/?sid=" + PHD.appliance_sid);
                                    resp.done(function(datair) {
                                        var ir_GB = datair["ir storage"].allowed;
                                        var d2d_GB;
                                        var url = 'app/configure/storage/attached/attached.html';
                                        PHD.wizard(url, "edit-storage", {
                                            helpArticle: PHD.App.getHelpLink("addbds", true),
                                            title: gettextCatalog.getString("Add Storage"),
                                            width: 1024,
                                            height: 700,
                                            open: function(event, ui) {
                                                $("body")
                                                    .addClass("dialog-open")
                                                    .css("overflow", "auto");
                                                $("#id_name").val(data.storage.name);
                                                $("#id_name").disable();
                                                $("#edit_object_id").text(data.storage.id);
                                                $("#id_type").disable(); // type is not changeable on edit.
                                                $("#id_usage").disable(); // usage is not changeable on edit
                                                if (data.storage.properties !== undefined) {
                                                    $("#id_host").val(data.storage.properties.hostname);
                                                    $("#id_share").val(data.storage.properties.share_name);
                                                    $("#id_username").val(data.storage.properties.username);
                                                    $("#id_port").val(data.storage.properties.port);
                                                }
                                                /*var storage_GB = Math.round(data.storage.mb_size / 1024);
                                                ir_GB = parseInt(ir_GB, 10);
                                                d2d_GB = storage_GB - ir_GB;
                                                var ir_percent = Math.round(ir_GB / storage_GB * 100);
                                                var d2d_percent = 100 - ir_percent;
                                                $("#id_ir_gb").text("(" + ir_GB + " GB)");
                                                $("#id_d2d_gb").text("(" + d2d_GB + " GB)");
                                                $("#id_ir_allocation").val(ir_percent);
                                                $("#id_d2d_allocation").val(d2d_percent);*/
                                            },
                                            beforeClose: function (event, ui) {
                                                if(resetTour){
                                                    refreshPageAndReloadTour();
                                                }
                                            }
                                        });
                                    });
                                }
                                else if(!$(this).data("disabled") && self.selectedID) {

                                    selectedStorage = null;
                                    $analytics && $analytics.eventTrack('Add Disk Storage', {  category: 'Configure', label: 'Storage' });

                                    PHD.wizard('app/configure/storage/attached/attached.html', "add-bds", {
                                        helpArticle: PHD.App.getHelpLink("addbds", true),
                                        title: title,
                                        width: 1024,
                                        height: 700,
                                        open: function(event, ui) {
                                            $("#id_usage").val(bds);
                                            $("#id_type").val(5);
                                            $("#stateless").val($scope.isStateless);
                                        }
                                    });
                                }
                            });
                        }
                    })
                    .on("click", ".btn-add-cifs", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("CIFS"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            selectedStorage = null;

                            $analytics && $analytics.eventTrack('Add CIFS Storage', {  category: 'Configure', label: 'Storage' });

                            var storageType,dimensions,analyticsEvent,stateless = {};

                            console.log($(this).attr('value'));
                            if($(this).attr('value') == 1){
                                storageType = "CIFS-backup";
                                dimensions = 'width:500px; height:425px;';
                                if($scope.isStateless){
                                    stateless.isStateless = true;
                                }
                                else{
                                    stateless.isStateless = false;
                                }
                                analyticsEvent = "Add CIFS";
                            }else if($(this).attr('value') == 0){
                                storageType = "CIFS-archive";
                                dimensions = 'width:500px; height:425px;';
                                analyticsEvent = "Add CIFS Target";
                            }

                            $analytics && $analytics.eventTrack(analyticsEvent, {  category: 'Configure', label: 'Appliances' });

                            ngDialog.open({
                                template: 'app/configure/storage/cifs/cifs.html',
                                modelDialogId: 'cifs-dailog',
                                documentID: DOC_BACKUP_STORAGE,
                                name: storageType,
                                scope: $scope,
                                overlay:true,
                                ngDialogStyle:dimensions,
                                data: stateless,
                                closeByEscape: false,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                        }
                    })
                    .on("click", ".btn-add-nfs", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("NFS"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            $analytics && $analytics.eventTrack('Add NFS Storage', {  category: 'Configure', label: 'Storage' });

                            var storageType,dimensions,analyticsEvent, stateless = {};

                            console.log($(this).attr('value'));
                            if($(this).attr('value') == 1){
                                storageType = "NFS-backup";
                                dimensions = 'width:500px; height:425px;';
                                if($scope.isStateless){
                                    stateless.isStateless = true;
                                }
                                else{
                                    stateless.isStateless = false;
                                }
                                analyticsEvent = "Add NFS";
                            }else if($(this).attr('value') == 0){
                                storageType = "NFS-archive";
                                dimensions = 'width:500px; height:425px;';
                                analyticsEvent = "Add NFS Target";
                            }

                            $analytics && $analytics.eventTrack(analyticsEvent, {  category: 'Configure', label: 'Appliances' });
                            ngDialog.open({
                                template: 'app/configure/storage/nfs/nfs.html',
                                modelDialogId: 'nfs-dailog',
                                documentID: DOC_BACKUP_STORAGE,
                                name: storageType,
                                scope: $scope,
                                overlay:true,
                                data: stateless,
                                ngDialogStyle:dimensions,
                                closeByEscape: false,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                        }
                    })
                    .on("click", ".btn-add-iscsi", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("iSCSI"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            var storageType, analyticsEvent, stateless = {};
                            if($(this).attr('value') == 1){
                                storageType = "iSCSI-backup";
                                analyticsEvent = "Add iSCSI";
                                if($scope.isStateless){
                                    stateless.isStateless = true;
                                }
                                else{
                                    stateless.isStateless = false;
                                }
                            }else if($(this).attr('value') == 0){
                                storageType = "iSCSI-archive";
                                analyticsEvent = "Add iSCSI Target";
                            }

                            $analytics && $analytics.eventTrack(analyticsEvent, {  category: 'Configure', label: 'Appliances' });
                            ngDialog.open({
                                template: 'app/configure/storage/iscsi/iscsi.html',
                                modelDialogId: 'isci-storage-dialog',
                                documentID: DOC_BACKUP_STORAGE,
                                name: storageType,
                                scope: $scope,
                                overlay:true,
                                data: stateless,
                                ngDialogStyle:'width:500px; height:500px;',
                                closeByEscape: false,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                            
                        }
                    })
                    .on("click", ".btn-add-fc", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("FC"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            var analyticsEvent = "Add FC";
                            if (bds == "archive"){
                                analyticsEvent = "Add FC Target";
                            }

                            $analytics && $analytics.eventTrack(analyticsEvent, {  category: 'Configure', label: 'Appliances' });
                            ngDialog.open({
                                template: 'app/configure/storage/fc/fc.html',
                                modelDialogId: 'cifs-dailog',
                                name: 'FC-Archive',
                                scope: $scope,
                                overlay:true,
                                ngDialogStyle:'width:500px; height:460px;',
                                closeByEscape: false,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                        }
                    })
                    .on("click", ".btn-add-ircache", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            //PHD.wizard('/config/bds/ir_cache/attached/' + self.selectedID + "/", "add-bds", {
                            // lmc - build page by loading template and variable value. differentiate types?
                            PHD.wizard('app/configure/storage/attached/ir.html', "add-bds", {
                               title: gettext("Add Instant Recovery Write Space"),
                                helpArticle: PHD.App.getHelpLink("addircache", true),
                                width: 1024,
                                height: 520,
                                open: function(event, ui) {
                                    $("#id_usage").val(6); // TODO - usage for "IR"
                                    $("#id_type").val(5); // added internal disk only.
                                }
                            });
                        }
                    })
                    .on("click", ".btn-add-cloud", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedID) {
                            var bds = $(this).closest(".menu-group").data("bds"),
                                title = interpolate(storageDialogTitle, {
                                    storage_type: gettext("Cloud"),
                                    usage: storageTypeLookup[bds]
                                }, true);

                            selectedStorage = null;

                            $analytics && $analytics.eventTrack('Add Cloud Target', {  category: 'Configure', label: 'Appliances' });

                            // lmc - build page by loading template and variable value. differentiate usage?
                            PHD.wizard('app/configure/storage/cloud/cloud.html', "add-bds", {
                                helpArticle: PHD.App.getHelpLink("addcloud", true),
                                title: title,
                                width: 900,
                                height: 500,
                                open: function(event, ui) {
                                    var dialog = angular.element(document.getElementById("cloudStorageDialog"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function($compile){
                                        $compile(dialog.contents())(scope);
                                        scope.PHD = PHD;
                                        $("#id_usage").val("archive");
                                    });
                                }
                            });
                        }
                    })
                    .on("click", ".btn-edit-storage", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedStorageID) {
                            console.log('selected id = ' + self.selectedStorageID);
                            console.log(self.storageData);
                            console.log($scope.listOfStorages);
                            var storage = _.find(self.storageData, function(obj) { return obj.id == self.selectedStorageID });
                            if (storage !== undefined) {
                                var type = storage.type;
                                var properties = storage.properties;
                                var protocol = properties !== undefined ? properties.protocol : null;
                                console.log('type = ' + type);
                                var spec = getHTMLSpec(type, protocol);
                                var message;

                                var url = 'app/configure/storage/' + spec.htmlFile;

                                selectedStorage = storage;
                                console.log(self.storageData);

                                if (selectedStorage.name == 'Internal' &&
                                    ((selectedStorage.stateless_type == "added_internal" && selectedStorage.usage == 'stateless') ||
                                    (selectedStorage.usage == 'backup'))) {
                                    // Recovery Series are not stateless, allow usage backup on edit.

                                    $analytics && $analytics.eventTrack('Edit Disk', {  category: 'Configure', label: 'Appliances' });
                                    var load = PHD.showLoadingIndicator("body", true, "Loading...");
                                    var resp = PHD.Ajax.get("/api/storage/ir/?sid=" + PHD.appliance_sid);
                                    resp.done(function(data) {
                                        var ir_GB = data["ir storage"].allowed;
                                        var d2d_GB;
                                        PHD.hideLoadingIndicator(load);
                                        PHD.wizard(url, "edit-storage", {
                                            helpArticle: PHD.App.getHelpLink("addbds", true),
                                            title: gettextCatalog.getString("Edit Storage"),
                                            width: spec.width,
                                            height: spec.height,
                                            open: function (event, ui) {
                                                $("body")
                                                    .addClass("dialog-open")
                                                    .css("overflow", "auto");
                                                $("#id_name").val(storage.name);
                                                $("#id_name").disable();
                                                $("#edit_object_id").text(storage.id);
                                                $("#id_type").disable(); // type is not changeable on edit.
                                                $("#id_usage").disable(); // usage is not changeable on edit
                                                if (properties !== undefined) {
                                                    $("#id_host").val(properties.hostname);
                                                    $("#id_share").val(properties.share_name);
                                                    $("#id_username").val(properties.username);
                                                    $("#id_port").val(properties.port);
                                                }
                                                var storage_GB = Math.round(selectedStorage.mb_size / 1024);
                                                ir_GB = parseInt(ir_GB, 10);
                                                d2d_GB = storage_GB - ir_GB;
                                                var ir_percent = Math.round(ir_GB / storage_GB * 100);
                                                var d2d_percent = 100 - ir_percent;
                                                $("#id_ir_gb").text("(" + ir_GB + " GB)");
                                                $("#id_d2d_gb").text("(" + d2d_GB + " GB)");
                                                $("#id_ir_allocation").val(ir_percent);
                                                $("#id_d2d_allocation").val(d2d_percent);
                                            },
                                            beforeClose: function (event, ui) {
                                                if (resetTour) {
                                                    refreshPageAndReloadTour();
                                                }
                                            }
                                        });
                                    });
                                }
                                else if(selectedStorage.stateless_type == "nas" || selectedStorage.type == "nas"){
                                    nasproperty = selectedStorage.properties;
                                    if(nasproperty.protocol == "cifs"){
                                        var style;
                                        if(selectedStorage.name == "Internal" && selectedStorage.type == "internal"){
                                            style = "width:500px; height:485px";
                                        }
                                        else{
                                            style = "width:500px; height:550px";
                                        }
                                        $analytics && $analytics.eventTrack('Edit CIFS', {  category: 'Configure', label: 'Appliances' });
                                        
                                        var respcifs = PHD.Ajax.get("/api/storage/ir/?sid=" + PHD.appliance_sid);
                                        
                                        respcifs.done(function(data) {
                                            var ir_GB = data["ir storage"].allowed;
                                            selectedStorage.irValue = ir_GB;
                                            
                                            ngDialog.open({
                                                template: 'app/configure/storage/cifs/cifs.html',
                                                modelDialogId: 'cifs-dailog-edit',
                                                name: 'CIFS-Edit-Backup',
                                                data: selectedStorage,
                                                scope: $scope,
                                                overlay:true,
                                                ngDialogStyle:style,
                                                closeByEscape: false,
                                                preCloseCallback: function (value) {
                                                    var appliance = self;
                                                    appliance.fetchDetails(true);
                                                }
                                            });
                                        });
                                    }
                                    else{
                                        $analytics && $analytics.eventTrack('Edit NFS', {  category: 'Configure', label: 'Appliances' });
                                        var style;
                                        if(selectedStorage.name == "Internal" && selectedStorage.type == "internal"){
                                            style = "width:500px; height:485px";
                                        }
                                        else{
                                            style = "width:500px; height:550px";
                                        }
                                        
                                        var respnfs = PHD.Ajax.get("/api/storage/ir/?sid=" + PHD.appliance_sid);
                                        
                                        respnfs.done(function(data) {
                                            var ir_GB = data["ir storage"].allowed;
                                            selectedStorage.irValue = ir_GB;
                                            
                                            ngDialog.open({
                                                template: 'app/configure/storage/nfs/nfs.html',
                                                modelDialogId: 'nfs-dailog-edit',
                                                documentID: DOC_BACKUP_STORAGE,
                                                name: 'NFS-Edit-Backup',
                                                data: selectedStorage,
                                                scope: $scope,
                                                overlay:true,
                                                ngDialogStyle:style,
                                                closeByEscape: false,
                                                preCloseCallback: function (value) {
                                                    var appliance = self;
                                                    appliance.fetchDetails(true);
                                                }
                                            });
                                        });
                                    }
                                }
                                else if(selectedStorage.stateless_type == "iscsi" ||selectedStorage.type == "iscsi"){
                                    $analytics && $analytics.eventTrack('Edit iSCSI', {  category: 'Configure', label: 'Appliances' });
                                    
                                    var respiscsi = PHD.Ajax.get("/api/storage/ir/?sid=" + PHD.appliance_sid);
                                    
                                    respiscsi.done(function(data) {
                                        var ir_GB = data["ir storage"].allowed;
                                        selectedStorage.irValue = ir_GB;

                                        ngDialog.open({
                                            template: 'app/configure/storage/iscsi/iscsi.html',
                                            modelDialogId: 'isci-storage-dialog',
                                            documentID: DOC_BACKUP_STORAGE,
                                            name: 'iSCSI-Edit-Backup',
                                            data: selectedStorage,
                                            scope: $scope,
                                            overlay:true,
                                            ngDialogStyle:'width:500px; height:550px;',
                                            closeByEscape: false,
                                            preCloseCallback: function (value) {
                                                var appliance = self;
                                                appliance.fetchDetails(true);
                                            }
                                        });
                                    });
                                }
                                else {
                                    $analytics && $analytics.eventTrack('Edit Cloud', {  category: 'Configure', label: 'Appliances' });
                                    PHD.wizard(url, "edit-storage", {
                                        helpArticle: PHD.App.getHelpLink("addbds", true),
                                        title: gettextCatalog.getString("Edit Storage"),
                                        width: spec.width,
                                        height: spec.height,
                                        open: function(event, ui) {
                                            var dialog = angular.element(document.getElementById("cloudStorageDialog"));
                                            var scope = dialog.scope();
                                            angular.element(document).injector().invoke(function($compile){
                                                $compile(dialog.contents())(scope);
                                                scope.PHD = PHD;
                                                $("body")
                                                    .addClass("dialog-open")
                                                    .css("overflow", "auto");
                                                $("#id_name").val(storage.name);
                                                $("#id_name").disable();
                                                $("#edit_object_id").text(storage.id);
                                                //$("#id_type").disable(); // type is not changeable on edit.
                                                $("#id_usage").disable(); // usage is not changeable on edit
                                                if (properties !== undefined) {
                                                    $("#id_host").val(properties.hostname);
                                                    $("#id_share").val(properties.share_name);
                                                    $("#id_username").val(properties.username);
                                                    $("#id_port").val(properties.port);
                                                }
                                            });
                                        }
                                    });
                                }
                            } else {
                                message = "Error finding this storage, please leave and re-enter the configuration subsystem and retry.";
                                PHD.throwError({"result": [{"message": gettext(message)}]});
                            }
                        }
                    })
                    .on("click", ".btn-edit-target", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedTargetID) {
                            console.log('selected id = ' + self.selectedTargetID);
                            var target = _.find(self.targetsData, function(obj) { return obj.id == self.selectedTargetID });
                            if (target !== undefined) {
                                 var type = target.type;
                                 if(type=="changer"){
                                        for (var i=0; i < self.targetsData.length;i++){
                                            if(self.targetsData[i].name == self.selectedTargetID ){
                                                $scope.serialName=self.targetsData[i].media_serials;
                                                break;
                                            }
                                        }
                                        var url ='/api/archive/media/library/'+self.selectedTargetID;
                                        var loadIndicator = PHD.showLoadingIndicator('body', true, "Fetching changer's current settings.....");
                                        $http({
                                            method: 'get',
                                             url :url
                                        }).success(function(data, status, headers){
                                            var changerUrl="/api/archive/media/settings/"+$scope.selectedTarget.name;
                                             $http({
                                            method: 'get',
                                             url :changerUrl
                                        }).success(function(dataChanger, status, headers){
                                            $scope.slotsObj={};
                                            $scope.checkforValidSlots = true;
                                            $scope.slotsObj.changerSlots =dataChanger.data[1].value;
                                            PHD.hideLoadingIndicator(loadIndicator);
                                            $scope.changerName=self.selectedTargetID;
                                            if(typeof(data.data) !='undefined' && typeof(data.data.slots) !='undefined'){
                                                $scope.editChangerGridOptions.data=data.data.slots;
                                            }
                                            
                                            ngDialog.open({
                                            template: 'app/configure/appliances/editchangerbackup.html',
                                            modelDialogId: 'editChangerDlg',
                                            documentID: DOC_BACKUP_STORAGE,
                                            scope: $scope,
                                            overlay: true,
                                            ngDialogStyle: 'width:500px; height:560px;',
                                            closeByEscape: false
                                            });
                                        }).error(function(response) {
                                            PHD.hideLoadingIndicator(loadIndicator);
                                                 ngDialog.open({
                                                     dialogType: 'ERROR',
                                                     dialogMessage: response.result[0].message,
                                                     overlay:true
                                                 });
                                        });
                                        }).error(function(response) {
                                            PHD.hideLoadingIndicator(loadIndicator);
                                            ngDialog.open({
                                                dialogType: 'ERROR',
                                                dialogMessage: response.result[0].message,
                                                overlay:true
                                            });
                                        });
                                        
                                   }else if(type=="tape"){
                                        $scope.parentchangerChangerArray = [];   
                                        $scope.tapeName=self.selectedTargetID;
                                        var url = "/api/archive/media/settings/"+$scope.selectedTarget.name;
                                        if (url.indexOf('#') > -1) {
                                           url = url.replace('#','%23');
                                        }    
                                        $http({
                                            method: 'GET',
                                            url :url
                                        }).success(function(data, status, headers){
                                            $scope.parentchangerChangerArray.push(data.data[1].value);
                                            $scope.parentChangerModel  = $scope.parentchangerChangerArray[0];
                                            $scope.parentchangerDriver = data.data[2].value;
                                            $scope.unlabelledCheck =(data.data[3].value == 'true')?true:false;
                                            ngDialog.open({
                                                template: 'app/configure/appliances/editTapeDialog.html',
                                                modelDialogId: 'editTapeDlg',
                                                documentID: DOC_BACKUP_STORAGE,
                                                name: 'editTapeDlg',
                                                scope: $scope,
                                                overlay: true,
                                                ngDialogStyle: 'width:550px; height:400px;',
                                                closeByEscape: true
                                            });
                                            
                                            
                                        }).error(function(response) {
                                            PHD.hideLoadingIndicator(loadIndicator);
                                            ngDialog.open({
                                                dialogType: 'ERROR',
                                                dialogMessage: response.result[0].message,
                                                overlay:true
                                            });
                                        });
                                    }else{
                                        var spec = getHTMLSpec(type, type);
                                        var storage_url = "/api/storage/" + self.selectedTargetID + "/?sid=" + self.selectedID;
                                        var resp = PHD.Ajax.get(storage_url);
                                resp.done(function (data) {
                                    if (data.storage !== undefined) {
                                        var target = data.storage;
                                        var properties = target.properties;
                                        var protocol = properties !== undefined ? properties.protocol : null;
                                        var message;

                                        var url = 'app/configure/storage/' + spec.htmlFile;

                                        selectedStorage = target;

                                        if (selectedStorage.type == 'nas' && protocol.indexOf('cloud') === -1){
                                            nasproperty = selectedStorage.properties;
                                            if (nasproperty.protocol == "cifs") {
                                                $analytics && $analytics.eventTrack('Edit CIFS Target', {
                                                    category: 'Configure',
                                                    label: 'Appliances'
                                                });
                                                ngDialog.open({
                                                    template: 'app/configure/storage/cifs/cifs.html',
                                                    modelDialogId: 'cifs-dailog-edit',
                                                    name: 'CIFS-Edit-Archive',
                                                    data: selectedStorage,
                                                    scope: $scope,
                                                    overlay:true,
                                                    ngDialogStyle:'width:500px; height:425px;',
                                                    closeByEscape: false,
                                                    preCloseCallback: function (value) {
                                                        var appliance = self;
                                                        appliance.fetchDetails(true);
                                                    }
                                                });
                                            }
                                            else {
                                                $analytics && $analytics.eventTrack('Edit NFS Target', {
                                                    category: 'Configure',
                                                    label: 'Appliances'
                                                });
                                                ngDialog.open({
                                                    template: 'app/configure/storage/nfs/nfs.html',
                                                    modelDialogId: 'nfs-dailog-edit',
                                                    documentID: DOC_BACKUP_STORAGE,
                                                    name: 'NFS-Edit-Archive',
                                                    data: selectedStorage,
                                                    scope: $scope,
                                                    overlay:true,
                                                    ngDialogStyle:'width:500px; height:425px;',
                                                    closeByEscape: false,
                                                    preCloseCallback: function (value) {
                                                        var appliance = self;
                                                        appliance.fetchDetails(true);
                                                    }
                                                });
                                            }
                                        }
                                        else if (selectedStorage.type == 'iscsi') {
                                            $analytics && $analytics.eventTrack('Edit iSCSI Target', {
                                                category: 'Configure',
                                                label: 'Appliances'
                                            });
                                            ngDialog.open({
                                                template: 'app/configure/storage/iscsi/iscsi.html',
                                                modelDialogId: 'isci-storage-dialog',
                                                documentID: DOC_BACKUP_STORAGE,
                                                name: 'iSCSI-Edit-Archive',
                                                data: selectedStorage,
                                                scope: $scope,
                                                overlay: true,
                                                ngDialogStyle: 'width:500px; height:500px;',
                                                closeByEscape: false,
                                                preCloseCallback: function (value) {
                                                    var appliance = self;
                                                    appliance.fetchDetails(true);
                                                }

                                            });

                                        }
                                        else if (selectedStorage.type == 'fc') {
                                            $analytics && $analytics.eventTrack('Edit FC Target', {
                                                category: 'Configure',
                                                label: 'Appliances'
                                            });
                                            ngDialog.open({
                                                template: 'app/configure/storage/fc/fc.html',
                                                modelDialogId: 'fc-dailog-edit',
                                                documentID: DOC_BACKUP_STORAGE,
                                                name: 'FC-Edit-Archive',
                                                data: selectedStorage,
                                                scope: $scope,
                                                overlay: true,
                                                ngDialogStyle: 'width:500px; height:400px;',
                                                closeByEscape: false,
                                                preCloseCallback: function (value) {
                                                    var appliance = self;
                                                    appliance.fetchDetails(true);
                                                }
                                            });

                                        }
                                        else {
                                            $analytics && $analytics.eventTrack('Edit Cloud Target', {
                                                category: 'Configure',
                                                label: 'Appliances'
                                            });
                                            PHD.wizard(url, "edit-target", {
                                                helpArticle: PHD.App.getHelpLink("addbds", true),
                                                title: gettextCatalog.getString("Edit Backup Copy Target"),
                                                width: spec.width,
                                                height: spec.height,
                                                open: function(event, ui) {
                                                    if (protocol !== null && protocol !== undefined && protocol.indexOf('cloud') !== -1) {
                                                        // The cloud dialog is Angularized.
                                                        var dialog = angular.element(document.getElementById("cloudStorageDialog"));
                                                        var scope = dialog.scope();
                                                        angular.element(document).injector().invoke(function($compile){
                                                            $compile(dialog.contents())(scope);
                                                            scope.PHD = PHD;
                                                            initializeValues();
                                                            var ctrl = angular.element(document.querySelector('[ng-controller=CloudStorageCtrl]'));
                                                            var $cloudScope = ctrl.scope();
                                                            $cloudScope.handleStorageType();
                                                        });
                                                    } else {
                                                        initializeValues();
                                                    }

                                                    function initializeValues() {
                                                        $("body")
                                                            .addClass("dialog-open")
                                                            .css("overflow", "auto");
                                                        $("#id_name").val(target.name).disable();
                                                        $("#edit_object_id").text(target.id);
                                                        //$("#id_type").disable(); // type is not changeable on edit.
                                                        $("#id_usage").disable(); // usage is not changeable on edit
                                                        if (properties !== undefined) {
                                                            $("#id_host").val(properties.hostname);
                                                            $("#id_share").val(properties.share_name);
                                                            $("#id_username").val(properties.username);
                                                            $("#id_port").val(properties.port);
                                                            var max_size = properties.max_size;
                                                            if (max_size !== undefined) {
                                                                $("#id_max_size").val(max_size == 0 ? 2048 : max_size);
                                                            }
                                                            var region = properties.region;
                                                            if (region !== undefined) {
                                                                $("#id_region").val(properties.region);
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                             }
                            } else {
                                message = "Error finding this target, please leave and re-enter the configuration subsystem and retry.";
                                PHD.throwError({"result": [{"message": gettext(message)}]});
                            }
                        }
                    })
                    .on("click", ".btn-onoff-storage", function(event) {
                        if(self.selectedStorageID) {
                            var storage = _.find(self.storageData, function(obj) { return obj.id == self.selectedStorageID });
                            if (storage !== undefined) {
                                if (storage.name === "Internal" && storage.status === 'online') {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("Internal storage cannot be disabled.")}]});
                                } else if (storage.status === 'deleting') {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("Storage being deleted cannot be enabled.")}]});
                                } else {
                                    var dbid = self.selectedStorageID;
                                    var storage = _.findWhere(self.storageData, {"id": dbid});
                                    if (storage) {
                                        var url = '/api/storage/';
                                        var action;
                                        if (storage.status === 'online') {
                                            action = "offline";
                                            url += action + '/' + dbid + '/?sid=' + self.selectedID;
                                        } else if (storage.status === 'offline') {
                                            action = "online";
                                            url += action + '/' + dbid + '/?sid=' + self.selectedID;
                                        }
                                        var appliance = self;
                                        var load = PHD.showLoadingIndicator("body", true, "Bringing storage " + action + '.  Please wait....');
                                        var resp = PHD.Ajax.put(url, null, load);
                                        resp.done(function (data) {
                                            appliance.fetchDetails(true);
                                        });
                                    }
                                }
                            }
                        }
                    })
                    .on("click", ".btn-onoff-target", function(event) {
                        if(self.selectedTargetID) {
                            var target = _.find(self.targetsData, function(obj) { return obj.id == self.selectedTargetID });
                            if (target !== undefined) {
                                if (target.status === 'deleting') {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("Target being deleted cannot be enabled.")}]});
                                } else {
                                    var dbid = self.selectedTargetID;
                                    var target = _.findWhere(self.targetsData, {"id": dbid});
                                    var new_status;
                                    var action;
                                    if (target) {
                                        if (target.archive) {
                                            var url = '/api/archive/media/';
                                            if(target.type=='tape' || target.type=='changer'){
                                                url = url +"settings/"+$scope.selectedTarget.name;
                                                new_status = $scope.selectedTarget.is_available ? "offline" : "online";
                                            }else{
                                                if (target.status === 'online') {
                                                    url += "unmount" + '/' + dbid + '/?sid=' + self.selectedID;
                                                    new_status = "ready";
                                                    action = "offline";
                                                }else if (target.status === 'ready') {
                                                    url += "mount" + '/' + dbid + '/?sid=' + self.selectedID;
                                                    new_status = "online";
                                                    action = "online";
                                                }else if (target.status === 'offline') {
                                                    url += "mount" + '/' + dbid + '/?sid=' + self.selectedID;
                                                    new_status = "online";
                                                    action = "online";
                                                }
                                            }
                                        } else {
                                            url = '/api/storage/';
                                            if (target.status === 'online') {
                                                action = "offline";
                                                url += "offline" + '/' + dbid + '/?sid=' + self.selectedID;
                                            } else if (target.status === 'offline') {
                                                url += "online" + '/' + dbid + '/?sid=' + self.selectedID;
                                                action = "Online";
                                            }
                                        }
                                    }
                                    var appliance = self;
                                    if(target.type=='tape' || target.type=='changer'){
                                        var is_available=($scope.selectedTarget.is_available)?"false":"true";
                                        var messageForLoading='';
                                        var dataparams={
                                                "settings":{
                                                    "is_available":is_available
                                                    }
                                                };
                                                if($scope.selectedTarget.is_available){
                                                    messageForLoading="Bringing target offline.";
                                                }else{
                                                    messageForLoading="Bringing target online.";
                                                }
                                        var loadingIndicator = PHD.showLoadingIndicator('body', true, messageForLoading);
                                        $http({
                                                method: 'put',
                                                url :url,
                                                data: dataparams
                                        }).success(function(data, status, headers){
                                            PHD.hideLoadingIndicator(loadingIndicator);
                                            $scope.selectedTarget.is_available = !$scope.selectedTarget.is_available;
                                            appliance.updateArchiveTarget(target, {status: new_status, is_available: $scope.selectedTarget.is_available});
                                        }).error(function(response) {
                                                PHD.hideLoadingIndicator(loadingIndicator); 
                                                    ngDialog.open({
                                                        dialogType:'retry',
                                                        modelDialogId:'enable-disable-error',
                                                        dialogMessage:response.result[0].message
                                                })
                                        });
                                    }else{
                                        var loadMessage =  action == 'offline' ? "Taking target offline." :
                                                            (target.archive ? "Bringing target online and checking for backup copies." :
                                                                             "Bringing target online.");
                                        loadMessage += "  Please wait....";

                                        var load = PHD.showLoadingIndicator("body", true, loadMessage);
                                        var resp = PHD.Ajax.put(url, null, load);
                                        resp.done(function (data) {
                                            if (target.archive) {
                                                if (action !== 'offline') {
                                                    var result = data.sets;
                                                    var dialogType = "Information";
                                                    var message;
                                                    if (result !== undefined) {
                                                        if(result['messages'] != undefined && Array.isArray(result['messages'])) {
                                                            dialogType = "Warning";
                                                            message = '';
                                                            for(var i=0; i<result['messages'].length;i++){
                                                                message = message +"<br>"+result.messages[i];
                                                            }
                                                        } else if (result['sets_needing_import'] == 0) {
                                                            message = 'Media mounted.  No backup copy information found needing import.';
                                                        } else {
                                                            message = 'Media mounted.  All backup copy information imported successfully.';
                                                        }
                                                        ngDialog.open({
                                                            dialogType: dialogType,
                                                            dialogMessage: message,
                                                            modelDialogId: 'InfoDialog'
                                                        });
                                                    }
                                                }
                                                appliance.updateArchiveTarget(target, {status: new_status});
                                            } else {
                                                appliance.fetchDetails(true);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    })
                    .on("click", ".btn-remove-storage", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedStorageID) {
                            var storage = _.find(self.storageData, function(obj) { return obj.id == self.selectedStorageID });
                            if (storage !== undefined) {
                                if (storage.name === "Internal") {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("Internal storage cannot be deleted.")}]});
                                } else if (storage.status === 'deleting') {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("This storage is already being deleted.")}]});
                                } else {
                                    var dbid = self.selectedStorageID,
                                        confirm = PHD.confirmDialog(
                                            "<p>"+gettextCatalog.getString("Are you sure you want to remove this storage?")+"</p>" +
                                            "<p>"+gettextCatalog.getString("Removing unmounts the storage volume from the appliance. Attached disks remain connected to the appliance virtual machine and can be reused or deleted manually.")+"</p>"+
                                            "<p>"+gettextCatalog.getString("Removing the storage may take some time to complete.")+"</p>",
                                            { title: gettextCatalog.getString("Confirm Storage Removal") }
                                        );

                                    confirm.done(function() {
                                        $analytics && $analytics.eventTrack('Remove Storage', {  category: 'Configure', label: 'Appliances' });
                                        var url = '/api/storage/' + self.selectedStorageID + '/?sid=' + self.selectedID;
                                        var resp = PHD.Ajax.delete(url);
                                        resp.done(function(data) {
                                            self.removeBDS(data, dbid);
                                        });
                                    });
                                }
                            } else {
                                message = "Error finding this storage, please leave and re-enter the configuration subsystem and retry.";
                                PHD.throwError({"result": [{"message": gettext(message)}]});
                            }
                        }
                    })
                    .on("click", ".btn-remove-target", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedTargetID) {
                            var target = _.find(self.targetsData, function(obj) { return obj.id == self.selectedTargetID });
                            if (target !== undefined) {
                                if (target.status === 'deleting') {
                                    PHD.throwError({"result": [{"message": gettextCatalog.getString("This target is already being deleted.")}]});
                                } else {
                                    var dbid = self.selectedTargetID;
                                    var confirm_message = "<p>"+gettextCatalog.getString("Are you sure you want to remove this target?")+"</p>" +
                                        "<p>"+gettextCatalog.getString("Removing a target does not delete backups that have been copied to it.") + "  ";

                                    if (Optimized(target.type)) {
                                        confirm_message += gettextCatalog.getString("If you wish to remove the backups, you must delete its configuration from the target appliance.") + "</p>";
                                    } else {
                                        confirm_message += gettextCatalog.getString("If you wish to remove the backups, you should use the Erase button.") + "</p>";
                                    }

                                    var confirm = PHD.confirmDialog(confirm_message,  { title: gettextCatalog.getString("Confirm Target Removal") });
                                    confirm.done(function() {
                                        $analytics && $analytics.eventTrack('Remove ' + target.type + ' Target', {  category: 'Configure', label: 'Target' });
                                        var delete_url;
                                        /*if (Optimized(target.type)) {
                                            delete_url = '/api/replication/target/' + target.name;
                                        } else {
                                            delete_url = '/api/storage/' + self.selectedTargetID + '/?sid=' + self.selectedID;
                                        }*/
                                        delete_url = '/api/backup-copy/target/' + target.id + '/?sid=' + self.selectedID;
                                        var resp = PHD.Ajax.delete(delete_url);
                                        resp.done(function(data) {
                                            self.removeTarget(data, dbid);
                                        });
                                    });
                                }
                            } else {
                                message = "Error finding this target, please leave and re-enter the configuration subsystem and retry.";
                                PHD.throwError({"result": [{"message": gettext(message)}]});
                            }
                        }
                    })
                    .on("click", ".btn-prepare-target", function(event) {
                        if(self.selectedTargetID) {
                            var dbid = self.selectedTargetID;
                            var target = _.findWhere(self.targetsData, {"id": dbid});
                            if (target !== undefined && !$('.btn-prepare-target').hasClass('disabled')) {
                                var confirm;
                                if (isTypeChanger($scope.selectedTarget.type) || isTypeTape($scope.selectedTarget.type) || ($scope.selectedTarget.is_initialized === false ) )  {
                                    ngDialog.open({
                                        template: 'app/configure/backupcopy/media/prepareMedia.html',
                                        scope: $scope,
                                        data: {target: target, appliance_id: self.selectedID},
                                        overlay: true,
                                        ngDialogStyle: 'width:50em;',
                                        modelDialogId: 'prepare-media-dialog',
                                        documentID: DOC_BACKUP_COPIES,
                                        name: 'prepare-media-dialog',
                                        preCloseCallback: function (value) {
                                            var appliance = self;
                                            if (target.archive) {
                                                //appliance.updateArchiveTarget(target, "online");
                                            } else {
                                                appliance.fetchDetails(true);
                                            }
                                        }
                                    });
                                } else {
                                    ngDialog.open({
                                        template: 'app/configure/backupcopy/media/eraseMedia.html',
                                        scope: $scope,
                                        data: {target: target, appliance_id: self.selectedID},
                                        overlay:true,
                                        ngDialogStyle:'width:50em;',
                                        modelDialogId:'erase-media-dialog',
                                        name: 'erase-media-dialog',
                                        preCloseCallback: function (value) {
                                            var appliance = self;
                                            if (target.archive) {
                                                //appliance.updateArchiveTarget(target, "online");
                                            } else {
                                                appliance.fetchDetails(true);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    })
                    .on("click", ".btn-show-media-sets", function(event) {
                        if(self.selectedTargetID) {
                            $scope.showMediaSetsForTarget(self.selectedTargetID, self.targetsData);
                        }
                    })
                    .on("click", ".btn-show-appliance-sets", function(event) {
                        if(self.selectedTargetID) {
                            $scope.showApplianceSetsForTarget(self.selectedTargetID, self.targetsData);
                        }
                    })
                    .on("click", ".btn-edit-nic", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedNicID) {
                            var selectedNic = _.find(self.networkdata, function(obj) { return obj.name === self.selectedNicID });
                            selectedNic = jQuery.extend({}, selectedNic);
                            $analytics && $analytics.eventTrack('Edit Nic', {  category: 'Configure', label: 'Configure' });
                            PHD.wizard("app/configure/networks/edit.html", "edit-nic", {
                                title: gettextCatalog.getString("Edit Network Adapter") + " " + self.selectedNicID,
                                width: 520,
                                height: 580,
                                open: function(event, ui) {
                                    $("body")
                                        .addClass("dialog-open")
                                        .css("overflow", "auto");
                                    var dialog = angular.element(document.getElementById("nicDialog"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function($compile){
                                        $compile(dialog.contents())(scope);
                                        scope.PHD = PHD;
                                        scope.network = selectedNic;
                                        scope.selectedID = self.selectedID;
                                    });
                                }
                            });
                        }
                    })
                    .on("click", ".btn-refresh-nics", function(event) {
                        event.preventDefault();
                        if(self.selectedID) {
                            self.$selectedNic = $();
                            self.selectedNicID = null;

                            var resp = PHD.Ajax.get('/api/networks/?sid=' + self.selectedID);
                            resp.done(function(data){
                                self.buildNetwork(data);
                            });
                        }
                    })
                    .on("click", ".btn-advanced-hosts", function(event) {
                        event.preventDefault();
                        console.log(PHD.currentMiniWizard);
                        /*
                         * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                         * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                         * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                         * This can be simplified once Edit Appliance is AngularJS.
                         */
                        var saveDialog = PHD.currentDialog;
                        if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                            var url = "/api/hosts/?sid=" + self.selectedID;
                            var load = PHD.showLoadingIndicator("body", true, "Loading...");
                            var resp = PHD.Ajax.get(url, load, handleHostsError);
                            resp.done(function(data) {
                                var HostDialog = PHD.wizard("app/configure/networks/hosts/hosts-file.html", "advanced-hosts",{
                                    title: gettextCatalog.getString("Edit Hosts File"),
                                    helpArticle: PHD.App.getHelpLink("advanced-hosts", true),
                                    width: 800,
                                    height: 560,
                                    open: function(event, ui) {
                                        var dialog = angular.element(document.getElementById("hostFileDialog"));
                                        var scope = dialog.scope();
                                        angular.element(document).injector().invoke(function($compile){
                                            $compile(dialog.contents())(scope);
                                            scope.PHD = PHD;
                                            scope.gridData = data.data;
                                            scope.selectedID = $scope.selectedID;
                                        });
                                    },
                                    beforeClose: function (event, ui) {
                                        setTimeout(function(){
                                            // Clear errors and state.
                                            $("#form-errors").hide();
                                            PHD.currentMiniWizard = null;
                                        }, 0);
                                    }
                                }, false, saveCurrentDialog);
                                PHD.currentMiniWizard = HostDialog;
                            });
                        }

                        function handleHostsError(jqXHR, textStatus, errorThrown) {
                            PHD.currentMiniWizard = null;
                            PHD.ajaxError(jqXHR, textStatus, errorThrown);
                        }

                        function saveCurrentDialog() {
                            PHD.currentDialog = saveDialog;
                        }
                    })
                    .on("click", ".btn-refresh-nics", function(event) {
                        event.preventDefault();
                        if(self.selectedID) {
                            self.$selectedNic = $();
                            self.selectedNicID = null;

                            var resp = PHD.Ajax.get('/api/networks/?sid=' + self.selectedID);
                            resp.done(function(data){
                                self.buildNetwork(data);
                            });
                        }
                    })
                    .on("click", ".btn-advanced-ports", function(event) {
                        event.preventDefault();
                        console.log(PHD.currentMiniWizard);
                        /*
                         * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                         * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                         * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                         * This can be simplified once Edit Appliance is AngularJS.
                         */
                        var saveDialog = PHD.currentDialog;
                        if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                            var url = "/api/ports/";
                            var load = PHD.showLoadingIndicator("body", true, "Loading...");
                            var resp = PHD.Ajax.get(url, load, handlePortsError);
                            resp.done(function(data) {
                                var PortsDialog = PHD.wizard("app/configure/networks/ports/ports-list.html", "advanced-ports",{
                                    title: gettextCatalog.getString("Configure Network Firewall Ports"),
                                    helpArticle: PHD.App.getHelpLink("advanced-ports", true),
                                    width: 800,
                                    height: 620,
                                    open: function(event, ui) {
                                        var dialog = angular.element(document.getElementById("portsListDialog"));
                                        var scope = dialog.scope();
                                        angular.element(document).injector().invoke(function($compile){
                                            $compile(dialog.contents())(scope);
                                            scope.PHD = PHD;
                                            scope.security = data.security;
                                            scope.dataport_count = data.dataport_count;
                                            scope.managerport_count = data.managerport_count;
                                            scope.managerport_start = data.managerport_start;
                                        });
                                    },
                                    beforeClose: function (event, ui) {
                                        setTimeout(function(){
                                            // Clear errors and state.
                                            $("#form-errors").hide();
                                            PHD.currentMiniWizard = null;
                                        }, 0);
                                    }
                                }, false, saveCurrentDialog);
                                PHD.currentMiniWizard = PortsDialog;
                            });
                        }

                        function handlePortsError(jqXHR, textStatus, errorThrown) {
                            PHD.currentMiniWizard = null;
                            PHD.ajaxError(jqXHR, textStatus, errorThrown);
                        }

                        function saveCurrentDialog() {
                            PHD.currentDialog = saveDialog;
                        }
                    })
                    .on("click", ".btn-refresh-targets", function(event) {
                        event.preventDefault();
                        $(".btn-refresh-targets").disable(); //disable button until call returns
                        if(self.selectedID) {
                            var $load = $scope.tableView ? self.$targetsTable : self.$targetsTableList;
                          //  var loadIndicator = PHD.showLoadingIndicator($load, false);
                            var loadIndicator = PHD.showLoadingIndicator('body', true, "Scanning for Backup Copy Media.....");
                            var resp = PHD.Ajax.get($scope.archiveTargetsURL + self.selectedID, loadIndicator);
                            resp.done(function(data){
                                self.updateArchiveTargets(data);
                                $scope.associateTapewithChangerDialog(self.selectedID);
                                PHD.hideLoadingIndicator(loadIndicator);
                            });
                            resp.always(function(data) {
                                $(".btn-refresh-targets").enable(); //call returned, enable button
                            });
                        }
                    })
                    .on("click", ".btn-edit-appliance", function(event) {
                        event.preventDefault();
                        if ($('.btn-edit-appliance').hasClass('disabled')) {
                            // If remove is disabled, return.
                            return this;
                        }
                        $analytics && $analytics.eventTrack('Edit Appliance', {  category: 'Configure', label: 'Configure' });
                        selectedAppliance = _.find(self.appliances, function(obj) { return obj.id == self.selectedID });
                        SELECTED_APPLIANCE = selectedAppliance;
                        localAppliance = _.find(self.appliances, function(obj) { return obj.local == true });
                        targetObject = _.find($scope.systemTargetsData, function (obj) { return Optimized(obj.type)});
                        ngDialogService = ngDialog;
                    
                        if(selectedAppliance.role == "Non-Managed Replication Source"){
                            ngDialog.open({
                                template: 'app/configure/appliances/editNonManagedResourceDialog.html',
                                scope: $scope,
                                data: {appliancename: $rootScope.replicationApplianceName, selectedAppliance: selectedAppliance},
                                overlay:true,
                                ngDialogStyle:'width:50em;',
                                modelDialogId:'edit-non-managed-resource-dailog'
                            })
                            
                        }else{
                            PHD.wizard("app/configure/appliances/edit.html", "edit-vba", {
                                title: gettextCatalog.getString("Edit Appliance"),
                                width: $rootScope.userLanguageCode === 'en' ? 850 : 900,
                                height: "auto",
                                helpArticle: PHD.App.getHelpLink("addvba", true),
                                open: function(event, ui) {
                                    $("body")
                                        .addClass("dialog-open")
                                        .css("overflow", "auto");
                                    var dialog = angular.element(document.getElementById("edit-appliance-dialog"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function($compile){
                                        scope.$apply(function() {
                                            $compile(dialog.contents())(scope);
                                        });
                                        scope.PHD = PHD;
                                        scope.selectedAppliance = self.selectedAppliance;
                                    });
                                },
                                beforeClose: function (event, ui) {
                                   self.refresh(self.updateAppliances, false);
                                },
                                close: function(event,ui){
                                    $("body")
                                        .removeClass("dialog-open")
                                        .css("overflow", "hidden");
                                    $(this).wizard("destroy").remove();
                                }
                            });
                        }
                    })
                    .on("click", ".btn-remove-appliance", function() {
                        if ($('.btn-remove-appliance').hasClass('disabled')) {
                            // If remove is disabled, return.
                            return this;
                        }
                        var isReplicating = $scope.selectedAppliance !== undefined &&
                            $scope.selectedAppliance.role !== undefined &&
                            $scope.selectedAppliance.role.indexOf(SYSTEM_ROLE_DISPLAY_NAME_REPLICATION_SOURCE) !== -1;
                        var replicationWarning = isReplicating ?
                            "<p>"+gettextCatalog.getString("When you remove a source from a target appliance, all of the source's backups on the target are deleted.")+"</p>" :
                            "";
                        var confirm = PHD.confirmDialog(
                            replicationWarning +
                            "<p>"+gettextCatalog.getString("Are you sure you want to remove the appliance?")+"</p>",
                            { title: gettextCatalog.getString("Confirm Appliance Removal") }
                        );

                        confirm.done($.proxy(self.kill, self));
                    })
                    .on("click", ".btn-add-interactions", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedToolID) {
                            var selectedTool = _.findWhere(self.interactionsData, {"id": self.selectedToolID});
                            $analytics && $analytics.eventTrack('Add Interactions Configuration', {  category: 'Configure', label: 'Configure' });
                            ngDialog.open({
                                template: 'app/configure/interactions/add-edit-configuration.html',
                                scope: $scope,
                                overlay:true,
                                id:'addEditPSAConfigDialog',
                                name:'add-edit-config-dialog',
                                ngDialogPostionStyle:'top:70px;',
                                ngDialogStyle: 'width:600px;',
                                closeByDocument: false,
                                closeByEscape: true,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                            $scope.isEditConfig = false;
                            $scope.systemID = self.selectedID;
                            $scope.selectedTool = selectedTool;
                            $scope.selectedToolID = self.selectedToolID;
                        }
                    })
                    .on("click", ".btn-edit-interactions", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedToolID && $scope.selectedConfigID) {
                            var selectedTool = _.findWhere(self.interactionsData, {"id": self.selectedToolID});
                            $analytics && $analytics.eventTrack('Edit Interactions Configuration', {  category: 'Configure', label: 'Configure' });
                            ngDialog.open({
                                template: 'app/configure/interactions/add-edit-configuration.html',
                                scope: $scope,
                                overlay:true,
                                id:'addEditPSAConfigDialog',
                                name:'add-edit-config-dialog',
                                ngDialogPostionStyle:'top:70px;',
                                ngDialogStyle: 'width:600px;',
                                closeByDocument: false,
                                closeByEscape: true,
                                preCloseCallback: function (value) {
                                    var appliance = self;
                                    appliance.fetchDetails(true);
                                }
                            });
                            $scope.isEditConfig = true;
                            $scope.systemID = self.selectedID;
                            $scope.selectedTool = selectedTool;
                            $scope.selectedToolID = self.selectedToolID;
                        }
                    })
                    .on("click", ".btn-remove-interactions", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedToolID && $scope.selectedConfigID) {
                            var selectedTool = _.findWhere(self.interactionsData, {"id": self.selectedToolID});
                            if (selectedTool !== undefined) {
                                var dbid = self.selectedTargetID;
                                var confirm_message = "<p>" + gettextCatalog.getString("Are you sure you want to remove this PSA configuration?") + "</p>";

                                var confirm = PHD.confirmDialog(confirm_message, {title: gettextCatalog.getString("Confirm PSA Configuration Removal")});
                                confirm.done(function () {
                                    $analytics && $analytics.eventTrack('Remove ' + selectedTool.tool_name + ' Configuration', { category: 'Configure', label: 'Configure'});
                                    var delete_url = '/api/psa/config/' + $scope.selectedConfigID + '/?sid=' + self.selectedID;
                                    var resp = PHD.Ajax.delete(delete_url);
                                    resp.done(function (data) {
                                        PHD.Ajax.delete('/api/credentials/' + selectedTool.config.credentials_id + '/?sid=' + self.selectedID)
                                            .done(function (cred_data) {
                                                self.removeInteraction(data, dbid);
                                            });
                                    });
                                });
                            }
                        }
                    })
                    .on("click", ".btn-test-ticket", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled") && self.selectedToolID && $scope.selectedConfigID) {
                            $analytics && $analytics.eventTrack('Send Test Ticket', {  category: 'Configure', label: 'Configure' });
                            var load = PHD.showLoadingIndicator("body", true, "Sending...");
                            PHD.Ajax.put('/api/psa/test_ticket/' + $scope.selectedConfigID + '/?sid=' + self.selectedID, null, load)
                                .done(function(data) {
                                    PHD.hideLoadingIndicator(load);
                                    if (data.error == undefined) {
                                        var msg = "PSA Test Ticket " + data.ticket_id + " has been successfully created.";
                                        ngDialog.open({
                                            dialogType: 'Information',
                                            scope: $scope,
                                            dialogMessage: msg
                                        });
                                    } else {
                                        ngDialog.open({
                                            dialogType: 'Error',
                                            dialogMessage: response.result[0].message
                                        });
                                    }
                                });
                        }
                    })
                    .on("click", ".btn-ticket-history", function(event) {
                        event.preventDefault();
                        if(!$(this).data("disabled")) {
                            $analytics && $analytics.eventTrack('View Ticket History', {  category: 'Configure', label: 'Configure' });
                            var load = PHD.showLoadingIndicator("body", true, "Loading...");
                            PHD.Ajax.get('/api/psa/tickets/?sid=' + self.selectedID  + "&lang=" + $rootScope.userLanguageCode, load)
                                .done(function(data) {
                                    ngDialog.open({
                                        template: 'app/configure/interactions/ticket-history.html',
                                        scope: $scope,
                                        overlay:true,
                                        id:'ticketHistoryDialog',
                                        ngDialogPostionStyle:'top:70px;',
                                        ngDialogStyle: 'width:1000px;',
                                        closeByDocument: false,
                                        closeByEscape: true
                                    });
                                    $scope.gridData = data.data;
                                });
                        }
                    });

                return this;
            };

            Appliance.prototype.setRefreshInterval = function(interval) {
                interval = interval || REFRESH_INTERVAL;
                clearTimeout(this.refreshInterval);
                
                if($(".storagesubtab").closest("li").hasClass("ui-tabs-active ui-state-active")){
                    this.currentDetail = STORAGE_TAB;
                }else if($(".targetssubtab").closest("li").hasClass("ui-tabs-active ui-state-active")){
                    this.currentDetail = TARGETS_TAB;
                }else if($(".networksubtab").closest("li").hasClass("ui-tabs-active ui-state-active")){
                    this.currentDetail = NETWORK_TAB;
                } else if ($(".interactionssubtab").closest("li").hasClass("ui-tabs-active ui-state-active")) {
                    this.currentDetail = INTERACTIONS_TAB;
                } else{
                    this.currentDetail = $scope.currentDetail;
                }
                
                this.refreshInterval = setTimeout($.proxy(this.refresh, this), interval);
                return this;
            };

            $scope.showMediaSetsForTarget = function(selectedTargetID, targetsData) {
                var target = _.find(targetsData, function(obj) { return obj.id === selectedTargetID });
                if (target !== undefined) {
                    if (target.status === 'deleting') {
                        PHD.throwError({"result": [{"message": gettext("Target being deleted cannot be viewed.")}]});
                    } else {
                        ngDialog.open({
                            template: 'app/configure/backupcopy/media/sets-list.html',
                            scope: $scope,
                            name: 'archive-media-sets',
                            overlay:true,
                            data: {target: target, sid: $scope.selectedID},
                            ngDialogStyle:'width:600px;height:400px',
                            modelDialogId:'enable-disable-error'
                        });
                    }
                }
            };
            $scope.showApplianceSetsForTarget = function(selectedTargetID, targetsData) {
                var target = _.find(targetsData, function(obj) { return obj.id === selectedTargetID });
                if (target !== undefined) {
                    if (target.status === 'deleting') {
                        PHD.throwError({"result": [{"message": gettext("Target being deleted cannot be viewed.")}]});
                    } else {
                        ngDialog.open({
                            template: 'app/configure/backupcopy/catalog/sets-list.html',
                            scope: $scope,
                            name: 'archive-catalog-sets',
                            overlay:true,
                            data: {target: target, sid: $scope.selectedID},
                            ngDialogStyle:'width:600px;height:400px',
                            modelDialogId:'enable-disable-error'
                        });
                    }
                }
            };
            $scope.associateTapewithChangerDialog = function(sid){
                var url ='/api/archive/media/configurable/?sid=' + sid;
                $http({
                    method: 'get',
                    url :url
                }).success(function(data, status, headers){
                    console.log(data);
                    $scope.tape_changer=[];
                    $scope.tapeNames=[];
                    $scope.changerNames=[];
                    $scope.tape_name='';
                    $scope.tape_changer=data.data;
                    $scope.tapeDropDownObject=[];
                    $scope.emptyChangerNames = [];
                    for(var i =0 ; i<data.data.length ;i++){
                        var item = data.data[i];
                        if(item.type === 'tape' && item.is_available === false){
                             $scope.tapeNames.push(item.name);
                        }
                        else if (item.type === 'changer' && item.is_available === false){
                            if (item.name !== '') {
                                $scope.changerNames.push(item.name);
                                selectObj={
                                    'name': item.name
                                };
                                $scope.tapeDropDownObject.push(selectObj);
                            } else {
                                $scope.emptyChangerNames.push(item.serial);
                            }
                        }
                    }
                    for (var i=0;i< $scope.tapeDropDownObject.length;i++){
                        $scope.tapeDropDownObject[i].name= $scope.tapeNames[0];
                    }
                    if ($scope.emptyChangerNames.length > 0) {
                        $scope.emptyChangerWarning = "Unnamed changer(s) with detected, serial(s): " + $scope.emptyChangerNames.join(',') + '.';
                    }
                    $scope.descriptionParaTwo = gettextCatalog.getString('Use an option below to associate the changers with a drive.');
                    if ($scope.tapeNames.length > 1 && $scope.changerNames.length > 1){
                        $scope.dialogHeadings = gettextCatalog.getString("Multiple Tape Devices Found");
                        $scope.descriptionParaOne = gettextCatalog.getString('Multiple tape changers and drives were found.') + '  ' +
                                gettextCatalog.getString('You cannot use tape storage until a changer is associated with a drive.');
                         ngDialog.open({
                             template: 'app/configure/appliances/multipletapechangerdialog.html',
                             scope: $scope,
                             overlay:true,
                              ngDialogStyle:'width:76em;',
                             modelDialogId:'multiple-tape-changer-dailog'
                        });
                     }else if($scope.tapeNames.length > 1 && $scope.changerNames.length === 1){
                         $scope.dialogHeadings = gettextCatalog.getString('Changer and Multiple Drives Found');
                         $scope.descriptionParaOne = gettextCatalog.getString('Tape changers and multiple drives were found.') + '  ' +
                             gettextCatalog.getString('You cannot use tape storage until a changer is associated with a drive.');
                          ngDialog.open({
                             template: 'app/configure/appliances/multipletapechangerdialog.html',
                             scope: $scope,
                             overlay:true,
                              ngDialogStyle:'width:76em;',
                             modelDialogId:'multiple-tape-changer-dailog'
                        });
                    }else if($scope.tapeNames.length === 1 && $scope.changerNames.length !== 0){
                        $scope.tape_name=$scope.tapeNames[0];
                        var loadIndicator_changer=PHD.showLoadingIndicator('body', true, "checking for parent changer.....");
                        var parent_changer_name='';
                        var tape_url= '/api/archive/media/settings/'+ $scope.tape_name;
                        if (tape_url.indexOf('#') > -1) {
                         tape_url = tape_url.replace('#','%23');
                        }
                        $scope.parentChangerFlag=false;
                        $http({
                              method: 'get',
                              url :tape_url
                            }).success(function(data, status, headers){
                                    for(var i =0 ; i<data.data.length ;i++){
                                        if(data.data[i].name == 'parent_changer' ){
                                           if (data.data[i].value !=''){
                                            parent_changer_name=data.data[i].value;
                                            $scope.parentChangerFlag=true;
                                            break;
                                           }
                                        } 
                                    }
                            if ($scope.parentChangerFlag) {
                                PHD.hideLoadingIndicator(loadIndicator_changer);
                            } else {
                                PHD.hideLoadingIndicator(loadIndicator_changer);
                                //sab adding this:
                                $scope.tape_name=$scope.tapeNames[0];
                                ngDialog.open({
                                    template: 'app/configure/appliances/tapechangerdialog.html',
                                    scope: $scope,
                                    overlay:true,
                                    ngDialogStyle:'width:68em;',
                                    modelDialogId:'tape-changer-dailog'
                                });
                            }
                        }).error(function(response) {
                                    PHD.hideLoadingIndicator(loadIndicator_changer);
                        });
                        //$scope.associateTapewithChangerDialog();
                    } else if ($scope.emptyChangerNames.length > 0) {
                        ngDialog.open({
                            dialogType:'error',
                            dialogMessage: "Unnamed changer(s) with detected, serial(s): " + $scope.emptyChangerNames.join(',') + '.\n\n' +
                                            "  Please ensure that changers are connected properly to the appliance and rescan."
                        });
                    }
                }).error(function(response) {
                    PHD.hideLoadingIndicator(loadIndicator);
                    ngDialog.open({
                        dialogType:'error',
                        dialogMessage:response.result[0].message
                    });
                });
                               
            };
			 $scope.associateMultipleChanger = function(){
                $scope.errorIndex=[];
                $scope.associateChangerWithDrive(0);
            };
            $scope.associateChangerWithDrive =function(index,loadIndicator){
                var index =  index;
                console.log(index);
                var url ='/api/archive/media/settings/'+$scope.tapeDropDownObject[index].name;
                if (url.indexOf('#') > -1) {
                 url = url.replace('#','%23');
                }
                if (typeof(loadIndicator) =='undefined'){
                    var loadIndicator = PHD.showLoadingIndicator('body', true, "associating tape with changer.....");    
                }

                var restObj={
                    "settings": {
                        "is_available":"true",
                        "parent_changer":$scope.changerNames[index]
                    }
                };
                $http({
                    method: 'put',
                    url :url,
                    data: restObj
                }).success(function(data, status, headers){
                    var url_changer_name ='/api/archive/media/settings/'+$scope.changerNames[index];
                        var dataparams={
                            "settings": {
                                "is_available":"true",
                                "available_slots":"all"
                            }
                        };
                    $http({
                             method: 'put',
                             url :url_changer_name,
                             data: dataparams
                            }).success(function(data, status, headers){
                                if (($scope.changerNames.length -1) > index){
                                     index++;
                                     $scope.associateChangerWithDrive(index,loadIndicator);

                                }else{
                                    PHD.hideLoadingIndicator(loadIndicator);
                                    $scope.checkForError();
                                    //ngDialog.close('tape-changer-dailog');    
                                }
                                
                            }).error(function(response) {
                               $scope.errorIndex.push(index);
                               if (($scope.changerNames.length -1) > index){
                                    index++;
                                    $scope.associateChangerWithDrive(index,loadIndicator);
                               }else{
                                    PHD.hideLoadingIndicator(loadIndicator);
                                    $scope.checkForError();
                                   
                               }
                            });
                }).error(function(response){
                    $scope.errorIndex.push(index);
                    if (($scope.changerNames.length -1) > index){
                         index++;
                        $scope.associateChangerWithDrive(index,loadIndicator);
                    }else{
                        PHD.hideLoadingIndicator(loadIndicator);
                        $scope.checkForError();
                       
                    }
                });
            };
            $scope.checkForError = function(){
                if ( $scope.errorIndex.length == 0){
                    ngDialog.close('tape-changer-dailog');
                }
                else{
                    var changersErrorlist='';
                    for (var i =0 ; i <$scope.errorIndex.length;i++){
                        changersErrorlist =changersErrorlist+$scope.changerNames[$scope.errorIndex];

                    }
                     ngDialog.open({
                        dialogType:'error',
                        dialogMessage:'problem in associating changer'
                    });
                }
            };
            $scope.checkforChanger = function(){
                var changer_name='';
                $scope.chagerFlag=false;
                var changer_name_url ='/api/archive/media/settings/'+$scope.tape_name;
                if (changer_name_url.indexOf('#') > -1) {
                    changer_name_url = changer_name_url.replace('#','%23');
                }
                var loadIndicator = PHD.showLoadingIndicator('body', true, "checking for changer.....");
            $http({
                    method: 'get',
                    url :changer_name_url
                }).success(function(data, status, headers){
                    for(var i =0 ; i<data.data.length ;i++){
                    if(data.data[i].name == 'parent_changer' ){
                       if (data.data[i].value !=''){
                        changer_name=data.data[i].value;
                        $scope.chagerFlag=true;
                       }
                        break;
                    } 
                  }
                if(changer_name ==''){
                    for(var i =0 ; i<$scope.tape_changer.length ;i++){
                        if($scope.tape_changer[i].type == 'changer' ){
                            changer_name =$scope.tape_changer[i].name;
                            break;
                        } 
                    }
                }
                var url ='/api/archive/media/settings/'+changer_name;
                $http({
                    method: 'get',
                    url :url
                }).success(function(data, status, headers){
                    PHD.hideLoadingIndicator(loadIndicator);
                    $scope.changer_changeslots=false; 
                    var restObj={
                                    "settings": {"available_slots":"all"}
                    };
                    for(var i =0 ; i<data.data.length ;i++){
                        if(data.data[i].name =='available_slots' && data.data[i].value=='none'){
                                $scope.changer_changeslots=true;   
                           
                        } else if(data.data[i].name =='is_available'){
                            if(data.data[i].value =="false"){
                                $scope.changer_isavailable=false;   
                            }else{
                                $scope.changer_isavailable=true;                            
                            }
                            
                         }
                    }
                    if($scope.changer_changeslots){
                        $http({
                                     method: 'put',
                                     url :url,
                                     data: restObj
                        }).success(function(data, status, headers){
                                            //call for Tape;
                                            $scope.associateTape(changer_name);
                        }).error(function(response) {
                                ngDialog.open({
                                    dialogType:'error',
                                    dialogMessage:response.result[0].message
                                });
                        });
                    }else{
                        $scope.associateTape(changer_name);
                    }

                }).error(function(response) {
                    PHD.hideLoadingIndicator(loadIndicator);
                    ngDialog.open({
                        dialogType:'error',
                        dialogMessage:response.result[0].message
                    });
                });
                    
                });
            }
            $scope.associateTape = function(changer_name){
                var url ='/api/archive/media/settings/'+$scope.tape_name;
                if (url.indexOf('#') > -1) {
                    url = url.replace('#','%23');
                }
                var loadIndicator = PHD.showLoadingIndicator('body', true, "associating tape with changer.....");
                if (!$scope.chagerFlag){
                    var restObj={
                       "settings": {
                            "parent_changer" : changer_name,
                            "parent_changer_driveno" :"0",
                            "use_unlabelled_tapes":"false"

                       }
                   }
                    $http({
                         method: 'put',
                         url :url,
                         data: restObj
                    }).success(function(data, status, headers){
                        var tapeArguments={
                            "settings": {
                             "is_available":"true"
                            }
                        }
                        $http({
                             method: 'put',
                             url :url,
                             data: tapeArguments
                            }).success(function(data, status, headers){
                                if(!$scope.changer_isavailable){
                                    var url_changer_name ='/api/archive/media/settings/'+changer_name;
                                    var dataparams={
                                        "settings": {
                                            "is_available":"true",
                                            "available_slots":"all"
                                        }
                                    }
                                    $http({
                                     method: 'put',
                                     url :url_changer_name,
                                     data: dataparams
                                    }).success(function(data, status, headers){
                                        PHD.hideLoadingIndicator(loadIndicator);
                                        ngDialog.close('tape-changer-dailog');
                                    }).error(function(response) {
                                        ngDialog.open({
                                            dialogType:'error',
                                            dialogMessage:response.result[0].message
                                        });
                                        PHD.hideLoadingIndicator(loadIndicator);
                                    });
                                }   
                            }).error(function(response) {
                                ngDialog.open({
                                    dialogType:'error',
                                    dialogMessage:response.result[0].message
                                });
                                PHD.hideLoadingIndicator(loadIndicator);
                            });
                        
                    }).error(function(response) {
                        PHD.hideLoadingIndicator(loadIndicator);
                        ngDialog.open({
                             dialogType:'error',
                            dialogMessage:response.result[0].message
                        });
                    });
                }else{
                    var restObj={
                        "settings": {
                            "is_available":"true"

                        }
                    }
                    $http({
                         method: 'put',
                         url :url,
                         data: restObj
                }).success(function(data, status, headers){
                        if(!$scope.changer_isavailable){
                            var url_changer_name ='/api/archive/media/settings/'+changer_name;
                            var dataparams={
                                "settings": {
                                    "is_available":"true",
                                    "available_slots":"all"
                                }
                            }
                            $http({
                             method: 'put',
                             url :url_changer_name,
                             data: dataparams
                            }).success(function(data, status, headers){
                                PHD.hideLoadingIndicator(loadIndicator);
                                ngDialog.close('tape-changer-dailog');
                            }).error(function(response) {
                                ngDialog.open({
                                    dialogType:'error',
                                    dialogMessage:response.result[0].message
                                });
                                PHD.hideLoadingIndicator(loadIndicator);
                            });
                        }
                    }).error(function(response) {
                        PHD.hideLoadingIndicator(loadIndicator);
                        ngDialog.open({
                             dialogType:'error',
                            dialogMessage:response.result[0].message
                        });
                    });
                }
            }
            Appliance.prototype.refresh = function(fn, repeat, updateDetails) {
                var self = this;

                if (!$rootScope.maintenance_mode) {
                    if (this.isActive || $scope.listViewFlag) {
                        fn = fn || this.updateAppliances;
                        updateDetails = !(updateDetails === false);
                        repeat = !(repeat === false);

                        this.applianceProcess = this.fetchAppliances(fn);
                        this.detailProcess = this.fetchDetails(updateDetails);

                        $.when(this.applianceProcess, this.detailProcess).done(function () {
                            self.applianceProcess = null;
                            self.detailProcess = null;
                            if (!self.selectedID && self.appliances.length) self.ApplianceTable.selectByID(self.appliances[0].id);
                            if (repeat) {
                                self.setRefreshInterval();
                            }
                        });
                    }
                } else {
                    console.log("In maintenance mode: Skipping appliance refresh.....")
                }
            };

            Appliance.prototype.fetchAppliances = function(fn) {
                if(!_.isFunction(fn)) {
                    fn = this.buildAppliances;
                }
                //this.ApplianceTable.showLoadingIndicator();

                return PHD.Ajax
                    .get("/api/systems/?timestamp=" + this.timestamp)
                    .done($.proxy(fn, this));
            };

            /*
             * Update the status of the backup copy target object based on the properties of the update object.
             * archiveTargets is filled by the "Scan for Media" button, whereas system Targets gets any current archive media.
             * (Storage targets and traditional archive targets that are "current"/online).
             * Since some archive objects can be returned in the systemTargetsData, check it is archiveTargets is empty.
             */
            Appliance.prototype.updateArchiveTarget = function(target, updateObject) {
                var targetsList = $scope.archiveTargetsData.length > 0 ? $scope.archiveTargetsData : $scope.systemTargetsData;
                for (var i = 0; i < targetsList.length; i++) {
                    var obj = targetsList[i];
                    if (obj.id === target.id) {
                        for (var p in updateObject) {
                            if (updateObject.hasOwnProperty(p)) {
                                targetsList[i][p] = updateObject[p];
                            }
                        }
                        this.targetsData = this.buildCompleteTargetList($scope.systemTargetsData, $scope.archiveTargetsData);
                        this.TargetsTable.load(this.targetsData);
                        this.TargetsTableList.load(this.targetsData);
                        this.updateBackupCopyButtons();
                        break;
                    }
                }
                return true;
            };

            /*
             * Build aggregated list of targets, adding archive targets not found in systems list.
             */
            Appliance.prototype.buildCompleteTargetList = function(systemTargets, archiveTargets) {

                function localUpdate(to, from) {
                    for (var p in from) {
                        if (from.hasOwnProperty(p)) {
                            to[p] = from[p];
                        }
                    }
                }

                var targets = systemTargets;
                for (var i = 0; i < archiveTargets.length; i++) {
                    var found = false;
                    for (var j = 0; j < systemTargets.length; j++) {
                        if (archiveTargets[i].name === systemTargets[j].name) {
                            var archive = archiveTargets[i];
                            localUpdate(systemTargets[j], archiveTargets[i]);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        targets.push(archiveTargets[i]);
                    }
                }
                return targets;
            };

            Appliance.prototype.fetchDetails = function(update) {
                var fn;
                this.selectedID = $scope.selectedID;
                
                update = (update === true);

                if (!this.selectedID) {
                    return $.Deferred().resolve();
                }

                if(this.currentDetail === STORAGE_TAB) {
                    if (update === true) {
                        fn = this.updateBDS;
                    } else {
                        fn = this.buildBDS;
                    }
                    console.log('in detail storage, id is ' + this.selectedID);
                    var storageLoad = PHD.showLoadingIndicator($('#config-storage'), false);
                    var resp = PHD.Ajax.get("/api/storage/?sid=" + this.selectedID + "&usage=backup", storageLoad);

                    resp.done(function(data){
                        $scope.listOfStorages = data.storage;
                    });

                    resp.done($.proxy(fn, this))
                        .always($.proxy(this.hideLoaders, this));
                } else if (this.currentDetail == TARGETS_TAB || $scope.currentDetail == TARGETS_TAB) {
                    if (update === true) {
                        fn = this.updateTargets;
                    } else {
                        fn = this.buildTargets;
                    }
                    console.log('in targets detail, system-id is ' + this.selectedID);
                    var targetsLoad = PHD.showLoadingIndicator($('#config-targets'), false);
                    return PHD.Ajax
                     .get($scope.TargetsURL + this.selectedID, targetsLoad)
                     .done($.proxy(fn, this))
                     .always($.proxy(this.hideLoaders, this));

                } else if(this.currentDetail === NETWORK_TAB) {
                    console.log('in detail network, id is ' + this.selectedID);
                    if(update === true) {
                        //fn = this.updateNetwork; TODO - API does not return sid.
                        fn = this.buildNetwork;
                    } else {
                        fn = this.buildNetwork;
                    }
                    var networksLoad = PHD.showLoadingIndicator($('#config-network'), false);

                    return PHD.Ajax
                        .get("/api/networks/?sid=" + this.selectedID, networksLoad)
                        .done($.proxy(fn, this))
                        .always($.proxy(this.hideLoaders, this));
                    
                } else if (this.currentDetail === INTERACTIONS_TAB) {
                    console.log('In Interactions tab');
                    // fetch the details always as it doesn't depend on the appliance
                    fn = this.buildInteractions;
                    var interactionsLoad = PHD.showLoadingIndicator($('#config-interactions'), false);

                    return PHD.Ajax
                        .get("/api/psa/tools/?sid=" + this.selectedID, interactionsLoad)
                        .done($.proxy(fn, this))
                        .always($.proxy(this.hideLoaders, this));
                }
            };
              
            $scope.applianceDataArr = [];
            $scope.selectedAppliance = [];
            Appliance.prototype.buildAppliances = function(data) {
                if(data) {
                    this.appliances = data.appliance;
                    this.timestamp = data.timestamp;
                    this.ApplianceTable.load(this.appliances);

                    // Subtract the appliance list height and the fixed tabs and table headers;
                    // Only subtract if not already done. otherwise, maxHeight goes negative.
                    var applianceListHeight = $(".appliance-list").height();
                    var toReduce = applianceListHeight + $scope.FIXED_DETAILS_HEIGHT;
                    if (this.maxDetailsHeight > toReduce) {
                        this.maxDetailsHeight -= toReduce;
                        this.maxDetailsListHeight = this.maxDetailsHeight;
                    }

                    $scope.applianceDataArr = data.appliance;
                    $scope.selectedAppliance = $scope.applianceDataArr[0];
                    $("#" + ($scope.applianceDataArr[0].id)).css("background-color","#f5f5f5");
                    //SELECTED_APPLIANCE = $scope.selectedAppliance;
                }
                if(this.applianceProcess) this.applianceProcess.resolve();
            };

            Appliance.prototype.updateAppliances = function(data) {
                if(data) {
                    this.appliances = data.appliance;
                    $scope.applianceDataArr = data.appliance;
                    this.timestamp = data.timestamp;
                    if ($scope.tableView) {
                        this.ApplianceTable.update(this.appliances);
                    }
                    setTimeout(function () {
                        $scope.$apply();
                        if ($scope.selectedID) {
                            $scope.selectApplianceFromList($scope.selectedID, false);
                        }
                    }, 0);
                }
                if(this.applianceProcess) this.applianceProcess.resolve();
            };

            Appliance.prototype.buildBDS = function(data) {
                if (data && data.storage !== undefined) {
                    this.storageData = data.storage;
                    
                    if(this.StorageTable == undefined){
                        this.StorageTable = $scope.StorageTableObj;
                    }

                    if(this.StorageTableList == undefined){
                        this.StorageTableList = $scope.StorageTableListObj;
                    }
                   
                    this.StorageTable.load(this.storageData);
                    this.StorageTableList.load(this.storageData);
                    this.updateBackupButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.updateBDS = function(data) {
                if(data && data.storage != undefined) {
                    this.storageData = data.storage;

                    if(this.StorageTable == undefined){
                        this.StorageTable = $scope.StorageTableObj;
                    }

                    if(this.StorageTableList == undefined){
                         this.StorageTableList = $scope.StorageTableListObj;
                    }

                    this.StorageTable.update(this.storageData, true);
                    this.StorageTableList.update(this.storageData, true);
                    this.updateBackupButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.buildTargets = function(data) {
                this.targetsData = [];
                if (data !== undefined && data.data !== undefined && data.data[0] !== undefined) {
                    var system_targets = data.data[0];
                    var targets = system_targets.targets;
                    if (targets !== undefined && targets.length > 0) {
                        targets.forEach(function(obj, index) {
                            obj.percent_used = obj.gb_size;
                            //obj.hostname = obj.properties.hostname !== undefined ? obj.properties.hostname : "";
                        });
                        this.targetsData = targets;
                    }

                    if(this.TargetsTable == undefined){
                        this.TargetsTable = $scope.TargetsTableObj;
                    }

                    if(this.TargetsTableList == undefined){
                        this.TargetsTableList = $scope.TargetsTableObj;
                    }

                    this.TargetsTable.load(this.targetsData);
                    this.TargetsTableList.load(this.targetsData);
                    this.updateBackupCopyButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.updateArchiveTargets = function(data) {

                this.targetsData = [];
                $scope.archiveTargetsData = [];
                if (data !== undefined && data.data !== undefined && data.data[0] !== undefined) {
                    var system_targets = data.data[0];
                    var targets = system_targets.connected_targets;
                    if (targets !== undefined && targets.length > 0) {
                        targets.forEach(function (obj, index) {
                            obj.percent_used = obj.gb_size;
                        });
                        $scope.archiveTargetsData = targets;
                    }

                    if (this.TargetsTable == undefined) {
                        this.TargetsTable = $scope.TargetsTableObj;
                    }

                    if (this.TargetsTableList == undefined) {
                        this.TargetsTableList = $scope.TargetsTableObj;
                    }

                    if ($scope.systemTargetsData === undefined) {
                        $scope.systemTargetsData = [];
                    }
                    this.targetsData = this.buildCompleteTargetList($scope.systemTargetsData, $scope.archiveTargetsData);
                    for (var i=0; i <this.targetsData.length; i++ ){
                        if(this.targetsData[i].media_label == "N\/A - per tape" ){
                            this.targetsData[i].media_label='See Reports';
                        }
                        else if (this.targetsData[i].media_label == "Scan For Media to Retrieve"){
                            this.targetsData[i].media_label='--';
                        }

                    }
                    this.TargetsTable.load(this.targetsData);
                    this.TargetsTableList.load(this.targetsData);
                    this.updateBackupCopyButtons();
                }
                if (this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.updateTargets = function(data) {
                var media_label = false;
                this.targetsData = [];
                $scope.systemTargetsData = [];
                if (data !== undefined && data.data !== undefined && data.data[0] !== undefined) {
                    var system_targets = data.data[0];
                    var targets = system_targets.targets;
                    if (targets !== undefined && targets.length > 0) {
                        targets.forEach(function(obj, index) {
                            obj.percent_used = obj.gb_size;
                        });
                        $scope.systemTargetsData = targets;
                    }

                    if(this.TargetsTable == undefined){
                        this.TargetsTable = $scope.TargetsTableObj;
                    }

                    if(this.TargetsTableList == undefined){
                        this.TargetsTableList = $scope.TargetsTableObj;
                    }

                    if ($scope.archiveTargetsData === undefined) {
                        $scope.archiveTargetsData = [];
                    }
                    this.targetsData = this.buildCompleteTargetList($scope.systemTargetsData, $scope.archiveTargetsData);
                    for (var i=0; i <this.targetsData.length; i++ ){
                            if (this.targetsData[i].type == "changer" || this.targetsData[i].type == "tape"){
                                media_label=true;
                                break;
                            }
                    }
                    if (media_label){
                        for (var i=0; i <this.targetsData.length; i++ ){
                            if(this.targetsData[i].media_label == "N\/A - per tape" ){
                                this.targetsData[i].media_label='See Reports';
                            }
                            else if (this.targetsData[i].media_label == "Scan For Media to Retrieve"){
                                this.targetsData[i].media_label='--';
                            }
                        }   
                    }
                    this.TargetsTable.load(this.targetsData);
                    this.TargetsTableList.load(this.targetsData);
                    this.updateBackupCopyButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.removeBDS = function(data, dbid) {
                this.StorageTableList.deselect();
                this.StorageTable.deselect();
                this.$selectedStorage = $();
                this.selectedStorageID = null;
                this.fetchDetails(true);
                this.updateBackupButtons();
            };

            Appliance.prototype.removeTarget = function(data, dbid) {
                this.TargetsTableList.deselect();
                this.TargetsTable.deselect();
                this.$selectedTarget = $();
                this.selectedTargetID = null;
                $scope.selectedTarget = null;
                this.fetchDetails(true);
                this.updateBackupCopyButtons();
            };

            Appliance.prototype.removeInteraction = function(data, dbid) {
                this.InteractionsTable.deselect();
                this.InteractionsTableList.deselect();
                this.$selectedTool = $();
                this.selectedToolID = null;
                $scope.selectedConfigID = null;
                this.fetchDetails(true);
                this.updateInteractionsButtons();
            };

            Appliance.prototype.buildNetwork = function(data) {
                //if(data && data.id === this.selectedID) {
                // lmc - know result is of specified system
                if (data) {
                    this.networkdata = data.networks;

                    if(this.NetworkTable == undefined){
                        this.NetworkTable = $scope.NetworkTableObj;
                    }

                    if(this.NetworkTableList == undefined){
                         this.NetworkTableList = $scope.NetworkTableListObj;
                    }
                    
                    this.NetworkTable.load(this.networkdata);
                    this.NetworkTableList.load(this.networkdata);
                    this.updateNetworkButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.updateNetwork = function(data) {
                if(data && data.id === this.selectedID) {
                    this.networkdata = data.networks;

                    if(this.NetworkTable == undefined){
                        this.NetworkTable = $scope.NetworkTableObj;
                    }

                    if(this.NetworkTableList == undefined){
                         this.NetworkTableList = $scope.NetworkTableListObj;
                    }

                    this.NetworkTable.update(this.networkdata, true);
                    this.NetworkTableList.update(this.networkdata, true);
                    this.updateNetworkButtons();
                }
                if(this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.buildInteractions = function(data) {
                this.interactionsData = [];
                if (data !== undefined && data.data !== undefined) {
                    var tools = data.data;
                    if (tools !== undefined && tools.length > 0) {
                        noOfPSATools = tools.length;
                        tools.forEach(function(obj, index) {
                            if (obj.config !== undefined) {
                                obj.company = obj.config.company_id;
                                obj.url = obj.config.url;
                                obj.credentials = obj.config.credentials_name;
                            } else {
                                obj.company = "";
                                obj.url = "";
                                obj.credentials = "";
                            }
                        });
                        this.interactionsData = tools;
                    }

                    if (this.InteractionsTable == undefined){
                        this.InteractionsTable = $scope.InteractionsTableObj;
                    }

                    if (this.InteractionsTableList == undefined){
                        this.InteractionsTableList = $scope.InteractionsTableListObj;
                    }

                    this.InteractionsTable.load(this.interactionsData);
                    this.InteractionsTableList.load(this.interactionsData);
                    this.updateInteractionsButtons();
                }
                if (this.detailProcess) this.detailProcess.resolve();
            };

            Appliance.prototype.isReady = function() {
                return this.isActive && (this.applianceProcess === null || this.applianceProcess.state() === 'resolved') &&
                    (this.detailProcess === null || this.detailProcess.state() === 'resolved');
            };

            Appliance.prototype.hasStorage = function(type) {
                if(type) {
                    if($scope.tableView){
                        return (this.$storageTable.find(".bds-type-" + type).not(".bds-type-replication").length > 0);    
                    }else{
                        return (this.$storageTableList.find(".bds-type-" + type).not(".bds-type-replication").length > 0);    
                    }
                } else {
                    if($scope.tableView){
                        return (this.$storageTable.find(".clickable").not(".bds-type-replication, .bds-type-ir-cache").length > 0);
                    }else{
                        return (this.$storageTableList.find(".clickable").not(".bds-type-replication, .bds-type-ir-cache").length > 0);
                    }
                }
            };

            Appliance.prototype.updateButtons = function() {
                this.updateBackupButtons();
                this.updateBackupCopyButtons();
                this.updateNetworkButtons();
                this.updateInteractionsButtons();

                // if a pending appliance, disable edit and remove buttons.
                var isPending = $scope.selectedAppliance !== undefined &&
                    $scope.selectedAppliance.role !== undefined &&
                    $scope.selectedAppliance.role.indexOf(SYSTEM_ROLE_DISPLAY_NAME_PENDING_REPLICATION_SOURCE) !== -1;
                this.$buttons.filter(".btn-remove-appliance").toggleButton(!isPending);
                this.$buttons.filter(".btn-edit-appliance").toggleButton(!isPending);

                return this;
            };

            Appliance.prototype.updateBackupButtons = function() {
                if(this.$buttons == undefined){
                    this.$buttons = $scope.buttons;
                }

                this.$buttons.filter(".btn-edit-storage").toggleButton(this.selectedID && this.selectedStorageID);
                this.$buttons.filter(".btn-remove-storage").toggleButton(this.selectedID && this.selectedStorageID);
                this.$buttons.filter(".btn-onoff-storage").toggleButton(this.selectedID && this.selectedStorageID);

                if(this.selectedStorageID) {
                    $enableDisable = this.$buttons.filter(".btn-onoff-storage");
                    var dbid = this.selectedStorageID;
                    var storage = _.findWhere(this.storageData, {"id": dbid});
                    if(storage != null && storage.status ==='online') {
                        $enableDisable.html('<i class="icon-off icon-large"></i>' + this.disableString);
                    } else {
                        $enableDisable.html('<i class="icon-restart icon-large"></i>' + this.enableString);
                    }
                    if(storage != null) {
                        this.$buttons.filter(".btn-edit-storage").toggleButton(this.selectedID && this.selectedStorageID && storage.status !== 'deleting');
                        this.$buttons.filter(".btn-remove-storage").toggleButton(this.selectedID && this.selectedStorageID && storage.status !== 'deleting');
                        this.$buttons.filter(".btn-onoff-storage").toggleButton(this.selectedID && this.selectedStorageID && storage.status !== 'deleting');
                    }
                }
                return this;
            };

            Appliance.prototype.updateBackupCopyButtons = function() {
                if(this.$buttons == undefined){
                    this.$buttons = $scope.buttons;
                }

                if((typeof($scope.selectedTarget) != "undefined") && (($scope.selectedTarget) != null)){
                    if (Optimized($scope.selectedTarget.type)) {
                        $scope.handleMedia.method = gettext("Erase");
                        this.$buttons.filter(".btn-edit-target").toggleButton(false);
                        this.$buttons.filter(".btn-import-target").hide();
                        this.$buttons.filter(".btn-remove-target").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-onoff-target").toggleButton(false);
                        this.$buttons.filter(".btn-prepare-target").toggleButton(false);
                        this.$buttons.filter(".btn-show-media-sets").toggleButton(false);
                        this.$buttons.filter(".btn-show-appliance-sets").toggleButton(false);

                    } else if (StandardMedia($scope.selectedTarget)) {
						$scope.handleMedia.method = (isTypeChanger($scope.selectedTarget.type) ||
                                                    isTypeTape($scope.selectedTarget.type ||
                                                    $scope.selectedTarget.is_initialized == false ))  ? gettext("Prepare") : gettext("Erase");
                        this.$buttons.filter(".btn-edit-target").toggleButton(false);
						this.$buttons.filter(".btn-import-target").show();
                        this.$buttons.filter(".btn-remove-target").toggleButton(false);
                        this.$buttons.filter(".btn-onoff-target").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-show-media-sets").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-show-appliance-sets").toggleButton(this.selectedID && this.selectedTargetID);
                        if(isTypeTape($scope.selectedTarget.type)){
					    	  var self_this = this;
							  var url = "/api/archive/media/settings/"+$scope.selectedTarget.name;
                              if (url.indexOf('#') > -1) {
                                url = url.replace('#','%23');
                              }    
                                        $http({
                                            method: 'GET',
                                            url :url
                                         }).success(function(data, status, headers){
										  	if($scope.selectedTarget.is_available == false){
											     self_this.$buttons.filter(".btn-import-target").toggleButton(false);
												 self_this.$buttons.filter(".btn-prepare-target").toggleButton(false);
						     				}
											
											if(data.data){
												if(data.data[1].value != "" && $scope.selectedTarget.is_available == true){
												     self_this.$buttons.filter(".btn-prepare-target").toggleButton(false);
													 self_this.$buttons.filter(".btn-import-target").toggleButton(false);
												}
												if(data.data[1].value == "" && $scope.selectedTarget.is_available == true){
													 self_this.$buttons.filter(".btn-prepare-target").toggleButton(self_this.selectedID && self_this.selectedTargetID);
													 self_this.$buttons.filter(".btn-import-target").toggleButton(self_this.selectedID && self_this.selectedTargetID);
											     }
											}else{
												 if($scope.selectedTarget.is_available == false || $scope.selectedTarget.is_available == undefined){
													 self_this.$buttons.filter(".btn-prepare-target").toggleButton(false);
											         self_this.$buttons.filter(".btn-import-target").toggleButton(false);
						     				     }else{
													 self_this.$buttons.filter(".btn-import-target").toggleButton(self_this.selectedID && self_this.selectedTargetID); 
													 self_this.$buttons.filter(".btn-prepare-target").toggleButton(self_this.selectedID && self_this.selectedTargetID);
												 }
											}
											
										 }).error(function(response) {
											   ngDialog.open({
												dialogType:'error',
												dialogMessage:response.result[0].message
												});
										 });
                        }else{
                              this.$buttons.filter(".btn-prepare-target").toggleButton(this.selectedID && this.selectedTargetID);
							  this.$buttons.filter(".btn-import-target").toggleButton(this.selectedID && this.selectedTargetID);
                        }
                    } else {
                        $scope.handleMedia.method = gettext("Erase");
                        this.$buttons.filter(".btn-edit-target").toggleButton(this.selectedID && this.selectedTargetID);
						this.$buttons.filter(".btn-import-target").hide();
                        this.$buttons.filter(".btn-remove-target").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-onoff-target").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-prepare-target").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-show-media-sets").toggleButton(this.selectedID && this.selectedTargetID);
                        this.$buttons.filter(".btn-show-appliance-sets").toggleButton(this.selectedID && this.selectedTargetID);
                    }
                }else{
                    this.$buttons.filter(".btn-edit-target").toggleButton(this.selectedID && this.selectedTargetID);
					this.$buttons.filter(".btn-import-target").hide();
                    this.$buttons.filter(".btn-remove-target").toggleButton(this.selectedID && this.selectedTargetID);
                    this.$buttons.filter(".btn-onoff-target").toggleButton(this.selectedID && this.selectedTargetID);
                    this.$buttons.filter(".btn-prepare-target").toggleButton(this.selectedID && this.selectedTargetID);
                    this.$buttons.filter(".btn-show-media-sets").toggleButton(this.selectedID && this.selectedTargetID);
                    this.$buttons.filter(".btn-show-appliance-sets").toggleButton(this.selectedID && this.selectedTargetID);
                }

                // check for target status.
                $enableDisable = this.$buttons.filter(".btn-onoff-target");
                if ($scope.selectedTarget !== undefined && $scope.selectedTarget !== null) {
                    if ($scope.selectedTarget.type == 'tape' ||$scope.selectedTarget.type == 'changer' ){
                        if((typeof($scope.selectedTarget.status) != "undefined") && $scope.selectedTarget.is_available ){
                              $enableDisable.html('<i class="icon-off icon-large"></i>' + this.disableString);
                        }else{
                              $enableDisable.html('<i class="icon-restart icon-large"></i>' + this.enableString);
                        }    
                    }
                    
                    else if ($scope.selectedTarget.status === 'online') {
                        $enableDisable.html('<i class="icon-off icon-large"></i>' + this.disableString);
                    } else {
                        $enableDisable.html('<i class="icon-restart icon-large"></i>' + this.enableString);
                    }
                }
                if($scope.selectedTarget != null && typeof($scope.selectedTarget) != "undefined"){
                    if(isTypeChanger($scope.selectedTarget.type)){
                    console.log("*****************************************"); 
                    console.log($scope.selectedTarget.type);
                    this.$buttons.filter(".btn-edit-target").toggleButton($scope.selectedTarget.id && $scope.selectedTarget.target_id);
					this.$buttons.filter(".btn-import-target").show();

                  }    
                }
                if($scope.selectedTarget != null && typeof($scope.selectedTarget) != "undefined"){
                    if(isTypeTape($scope.selectedTarget.type)){
                    console.log("*****************************************"); 
                    console.log($scope.selectedTarget);
                    this.$buttons.filter(".btn-edit-target").toggleButton($scope.selectedTarget.id && $scope.selectedTarget.target_id);
                  }    
                } 
                setTimeout(function () {
                    $scope.$apply();
                }, 250);

                return this;
            };

            Appliance.prototype.updateNetworkButtons = function() {
                if(this.$buttons == undefined){
                    this.$buttons = $scope.buttons;
                }
                this.$buttons.filter(".btn-edit-nic").toggleButton(this.selectedID && this.selectedNicID);
                return this;
            };

            Appliance.prototype.updateInteractionsButtons = function() {
                if(this.$buttons == undefined){
                    this.$buttons = $scope.buttons;
                }
                this.$buttons.filter(".btn-add-interactions").toggleButton(this.selectedToolID && !$scope.selectedConfigID);
                this.$buttons.filter(".btn-edit-interactions").toggleButton(this.selectedToolID && $scope.selectedConfigID);
                this.$buttons.filter(".btn-remove-interactions").toggleButton(this.selectedToolID && $scope.selectedConfigID);
                this.$buttons.filter(".btn-test-ticket").toggleButton(this.selectedToolID && $scope.selectedConfigID);
                return this;
            };

            Appliance.prototype.getConfigID = function() {
                var self = this,
                    resp = PHD.Ajax.get("/api/psa/config/?sid=" + this.selectedID);
                resp.done(function(data) {
                    var config_data = data.data;
                    if (config_data != undefined && config_data.length > 0) {
                        for (var i = 0; i < config_data.length; i++) {
                            if (config_data[i].psa_tool.psa_tool_id == self.selectedToolID) {
                                $scope.selectedConfigID = config_data[i].id;
                            }
                        }
                    }
                    self.updateInteractionsButtons();
                });
            };

            Appliance.prototype.setButtonLock = function(locked) {
                this.$buttons.each(function() {
                    $(this).toggleButton(!locked);
                });
            };

            Appliance.prototype.initAppliances = function(repeat) {
                this.refresh(this.buildAppliances, repeat);
                this.appliancesInit = true;
                return this;
            };

            Appliance.prototype.addVBA = function() {
                this.refresh(this.fetchAppliances, false);
            };

            Appliance.prototype.hideLoaders = function() {
                if(this.currentDetail === STORAGE_TAB) {
                    //this.StorageTable.hideLoadingIndicator();
                } else if(this.currentDetail === NETWORK_TAB) {
                    //this.NetworkTable.hideLoadingIndicator();
                }
            };

            Appliance.prototype.kill = function() {
                var self = this,
                    resp = PHD.Ajax.delete("/api/systems/" + this.selectedID);

                resp.done(function(data) {
                    console.log("in done with DELETE!");
                    //$(document).trigger("systemremove", [self.selectedID]);
                    self.selectedID = null;
                    PHD.appliance_sid = self.selectedID;
                    self.refresh(self.fetchAppliances, false);
                    /*if(data.result[0].code == AJAX_RESULT_SUCCESS) {
                        $(document).trigger("systemremove", [self.dbid]);
                    } else {
                        PHD.throwError(data);
                    }*/
                });
            };

            Appliance.prototype.activate = function() {
                this.isActive = true;
                if(!this.appliancesInit) {
                    this.initAppliances(false);
                } else {
                    this.refresh(this.updateAppliances, true);
                }
                return this;
            };

            Appliance.prototype.deactivate = function() {
                this.isActive = false;
                clearTimeout(this.refreshInterval);
                return this;
            };
            
            var ApplianceTab = function(index, $panel) {
                this.index = index;
                this.$panel = $panel;
                this.$applianceArea = this.$panel.children("#appliances-list");
                this.environmentList = {};
                this.environments = {};
                this.activeEnvironment = null;
                this.isActive = false;
                this.isBootstrapped = false;
            };

            ApplianceTab.prototype.queueSelection = function (selected) {
                var self = this;
                var dbid = selected.id;
                var usage = selected.usage;
                var sid = parseInt(selected.sid);
                if (this.activeEnvironment) {
                    if (this.activeEnvironment.$applianceTable) {
                        this.activeEnvironment.$applianceTable.on("loadfinished", function () {
                            // Select the appliance from the Appliances list.
                            self.activeEnvironment.ApplianceTable.selectByID(sid);
                            if (usage !== 'archive') {
                                // Select the backup storage by integer id.
                                dbid = parseInt(dbid);
                                if (self.activeEnvironment.$storageTable) {
                                    self.activeEnvironment.$storageTable.on("loadfinished", function () {
                                        setTimeout(function(){
                                            self.activeEnvironment.StorageTable.selectByID(dbid);
                                        }, 0);
                                    });
                                }
                            } else {
                                // Switch to tab 1, Backup Copy Targets, selected by string id.
                                $(".appliance-details.sub-tabs-wrapper").tabs("option", "active", 1);
                                if (self.activeEnvironment.$targetsTable) {
                                    self.activeEnvironment.$targetsTable.on("loadfinished", function () {
                                        setTimeout(function(){
                                            self.activeEnvironment.TargetsTable.selectByID(dbid);
                                        }, 0);
                                    });
                                }
                            }
                        });
                    }
                }
            };

            ApplianceTab.prototype.fetchEnvironments = function() {
                this.bootstrap();
            };

            ApplianceTab.prototype.bootstrap = function(data) {

                this.$environments = this.$applianceArea.find(".environment");

                //this.environmentList = this.$environments.map(function() {
               //     return new Appliance($(this)).init();
                //}).get();

                this.environmentList = new Appliance(this.$environments).init();
                this.activeEnvironment = this.environmentList.activate();
                this.isBootstrapped = true;
            };

            ApplianceTab.prototype.init = function() {
                var self = this;
                $(document)
                    .on("systemremove", function(event, dbid) {

                        //self.removeEnvironment(dbid);
                    });

                return this;
            };

            ApplianceTab.prototype.activate = function() {
                this.isActive = true;
                if(!this.isBootstrapped) {
                    this.fetchEnvironments();
                }
                if(this.activeEnvironment) {
                    this.activeEnvironment.activate();
                }
                return this;
            };

            ApplianceTab.prototype.deactivate = function() {
                this.isActive = false;
                if(this.activeEnvironment) {
                    this.activeEnvironment.deactivate();
                }
                return this;
            };

            function Optimized(type) {
                return type == "appliance" || type == "managed_cloud" || type == "Unitrends_cloud";
            }
            function isTypeChanger(type){
                return type == "changer";
            }
            function isTypeTape(type){
                return type == "tape";
            }
            function CloudStorage(type) {
                return type == "cloud" || type == "cloud_storage";
            }

            function StandardMedia(target) {
                return target.archive !== undefined && target.archive == true;
            }
          
            
            function getHTMLSpec(type, protocol) {
                var spec = {};
                spec.width = 1024;
                spec.height = 700;
                spec.htmlFile = 'attached/attached.html';

                if (type == 'internal' || type == 'added_internal' || type == 'added_disk') {
                    ;
                } else if (type == 'ir') {
                    ; // TODO - need to specify IR storage path here.
                    spec.height = 520;
                } else {
                    if (protocol == 'cifs') {
                        spec.htmlFile = 'cifs/cifs.html';
                        spec.width = 500;
                        spec.height = 480;
                    } else if (protocol == 'nfs') {
                        spec.htmlFile = 'nfs/nfs.html';
                        spec.width = 500;
                        spec.height = 480;
                    } else {
                        spec.htmlFile = 'cloud/cloud.html';
                        spec.width = 900;
                        spec.height = 530;
                    }
                }

                return spec;
            }

            Appliance.prototype.refresh_replicationTarget = function(){
                var self = this;
				self.fetchDetails(true);
            };

            Appliance.prototype.setSelectedAppliance = function(selectedId, updateList){
                var self = this;
                var refreshList = updateList || false;
                $scope.listViewFlag = true;
                
                self.ApplianceTable = $scope.ApplianceTable;
                
                self.currentDetail = $scope.currentDetail;
                self.$selectedAppliance = $scope.el;
                if (self.StorageTable !== undefined) {
                    self.StorageTable.deselect()
                }
                if (self.StorageTableList !== undefined) {
                    self.StorageTableList.deselect()
                }
                self.$selectedStorage = $();
                self.selectedStorageID = null;
                self.$selectedNic = $();
                self.selectedNicID = null;
                self.$selectedTarget = $();
                self.selectedTargetID = null;
                self.$selectedTool = $();
                self.selectedToolID = null;
                
                self.selectedID = selectedId;
                PHD.appliance_sid = selectedId;

                if (refreshList) {
                    self.refresh(this.updateAppliances, false);
                }

                var x = this.ApplianceTable.$table[0].rows;
                for (var i = 1; i < x.length; i++) {
                    
                    var rowDetails = x[i];
                    
                    if((parseInt(x[i].dataset.dbid)) == selectedId){
                        if(!($(x[i]).hasClass("current-row"))){
                            $(x[i]).addClass("current-row");
                            $scope.selectedID = selectedId;
                            this.$selectedAppliance = $(x[i]);
                            this.selectedID = selectedId;
                        }
                        
                    }else{
                        if($(x[i]).hasClass("clickable current-row")){
                            $(x[i]).removeClass("current-row");
                        }
                    }
                }
                
                this.ApplianceTable.$table[0].rows = x;
                self.updateButtons();
            };
            
            
            $scope.selectApplianceFromList = function(selectedId, newAppliance){
                var arrLength=($scope.applianceDataArr).length;

                for (var i=0; i < arrLength; i++){
                    if ($scope.applianceDataArr[i].id===selectedId){
                       $scope.selectedAppliance = $scope.applianceDataArr[i];
                       $("#" + selectedId).css("background-color","#f5f5f5");
                       $scope.selectedID = selectedId;
                    }else{
                        $("#" + $scope.applianceDataArr[i].id).css("background-color","#fff");
                    }
                }
                var update = newAppliance || false;
                if (update) {
                    var applianceTab = $scope.getApplianceTab();
                    if (applianceTab) {
                        applianceTab.activeEnvironment.setSelectedAppliance(selectedId, update);
                    }
                }
            };

            $scope.getApplianceTab = function() {
                var returnTab = null;
                if ($scope.$parent.$parent.tabs instanceof Array) {
                    var applianceTab = $scope.$parent.$parent.tabs[0];
                    if (applianceTab.activeEnvironment !== undefined && applianceTab.activeEnvironment.setSelectedAppliance instanceof Function) {
                        returnTab = applianceTab;
                    }
                }
                return returnTab;
            };

            $(".storagesubtab").closest("li").click(function(){
                this.currentDetail = STORAGE_TAB;
                $scope.setApplianceStorageTab();
                var applianceTab = $scope.getApplianceTab();
                if (applianceTab) {
                    applianceTab.activeEnvironment.setSelectedAppliance($scope.selectedID);
                }
            });

            $(".targetssubtab").closest("li").click(function(){
                this.currentDetail = TARGETS_TAB;
                $scope.setApplianceTargetsTab();
                var applianceTab = $scope.getApplianceTab();
                if (applianceTab) {
                    applianceTab.activeEnvironment.setSelectedAppliance($scope.selectedID);
                }
            });

            $(".networksubtab").closest("li").click(function(){
                this.currentDetail = NETWORK_TAB;
                $scope.setApplianceNetworkTab();
                var applianceTab = $scope.getApplianceTab();
                if (applianceTab) {
                    applianceTab.activeEnvironment.setSelectedAppliance($scope.selectedID);
                }
            });

            $(".interactionssubtab").closest("li").click(function(){
                this.currentDetail = INTERACTIONS_TAB;
                $scope.setApplianceInteractionsTab();
                var applianceTab = $scope.getApplianceTab();
                if (applianceTab) {
                    applianceTab.activeEnvironment.setSelectedAppliance($scope.selectedID);
                }
            });

            $scope.setApplianceStorageTab = function(){
                $scope.currentDetail = STORAGE_TAB;
                $(".storagesubtab").closest("li").addClass("ui-tabs-active ui-state-active");
                $(".targetssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".networksubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".interactionssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");

                $("#tableStorageTab").closest("li").attr("aria-selected", true);
                $("#listStorageTab").closest("li").attr("aria-selected", true);
                $("#tableStorageTab").closest("li").attr("aria-expanded", true);
                $("#listStorageTab").closest("li").attr("aria-expanded", true);

                $("#tableTargetsTab").closest("li").attr("aria-selected", false);
                $("#listTargetsTab").closest("li").attr("aria-selected", false);
                $("#tableTargetsTab").closest("li").attr("aria-expanded", false);
                $("#listTargetsTab").closest("li").attr("aria-expanded", false);

                $("#tableNetworkTab").closest("li").attr("aria-selected", false);
                $("#listNetworkTab").closest("li").attr("aria-selected", false);
                $("#tableNetworkTab").closest("li").attr("aria-expanded", false);
                $("#listNetworkTab").closest("li").attr("aria-expanded", false);

                $("#tableInteractionsTab").closest("li").attr("aria-selected", false);
                $("#listInteractionsTab").closest("li").attr("aria-selected", false);
                $("#tableInteractionsTab").closest("li").attr("aria-expanded", false);
                $("#listInteractionsTab").closest("li").attr("aria-expanded", false);

                $(".config-storage").attr("aria-hidden", false);
                $(".config-targets").attr("aria-hidden", true);
                $(".config-network").attr("aria-hidden", true);
                $(".config-interactions").attr("aria-hidden", true);

                $(".config-storage").css("display","block");
                $(".config-targets").css("display","none");
                $(".config-network").css("display","none");
                $(".config-interactions").css("display","none");
            };

            $scope.setApplianceTargetsTab = function(){
                $scope.currentDetail = TARGETS_TAB;
                $(".storagesubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".targetssubtab").closest("li").addClass("ui-tabs-active ui-state-active");
                $(".networksubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".interactionssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");

                $("#tableStorageTab").closest("li").attr("aria-selected", false);
                $("#listStorageTab").closest("li").attr("aria-selected", false);
                $("#tableStorageTab").closest("li").attr("aria-expanded", false);
                $("#listStorageTab").closest("li").attr("aria-expanded", false);

                $("#tableTargetsTab").closest("li").attr("aria-selected", true);
                $("#listTargetsTab").closest("li").attr("aria-selected", true);
                $("#tableTargetsTab").closest("li").attr("aria-expanded", true);
                $("#listTargetsTab").closest("li").attr("aria-expanded", true);

                $("#tableNetworkTab").closest("li").attr("aria-selected", false);
                $("#listNetworkTab").closest("li").attr("aria-selected", false);
                $("#tableNetworkTab").closest("li").attr("aria-expanded", false);
                $("#listNetworkTab").closest("li").attr("aria-expanded", false);

                $("#tableInteractionsTab").closest("li").attr("aria-selected", false);
                $("#listInteractionsTab").closest("li").attr("aria-selected", false);
                $("#tableInteractionsTab").closest("li").attr("aria-expanded", false);
                $("#listInteractionsTab").closest("li").attr("aria-expanded", false);

                $(".config-storage").attr("aria-hidden", true);
                $(".config-targets").attr("aria-hidden", false);
                $(".config-network").attr("aria-hidden", true);
                $(".config-interactions").attr("aria-hidden", true);

                $(".config-storage").css("display","none");
                $(".config-targets").css("display","block");
                $(".config-network").css("display","none");
                $(".config-interactions").css("display","none");
            };

            $scope.setApplianceNetworkTab = function(){
                $scope.currentDetail = NETWORK_TAB;
                $(".storagesubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".targetssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".networksubtab").closest("li").addClass("ui-tabs-active ui-state-active");
                $(".interactionssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");

                $("#tableStorageTab").closest("li").attr("aria-selected", false);
                $("#listStorageTab").closest("li").attr("aria-selected", false);
                $("#tableStorageTab").closest("li").attr("aria-expanded", false);
                $("#listStorageTab").closest("li").attr("aria-expanded", false);

                $("#tableTargetsTab").closest("li").attr("aria-selected", false);
                $("#listTargetsTab").closest("li").attr("aria-selected", false);
                $("#tableTargetsTab").closest("li").attr("aria-expanded", false);
                $("#listTargetsTab").closest("li").attr("aria-expanded", false);

                $("#tableNetworkTab").closest("li").attr("aria-selected", true);
                $("#listNetworkTab").closest("li").attr("aria-selected", true);
                $("#tableNetworkTab").closest("li").attr("aria-expanded", true);
                $("#listNetworkTab").closest("li").attr("aria-expanded", true);

                $("#tableInteractionsTab").closest("li").attr("aria-selected", false);
                $("#listInteractionsTab").closest("li").attr("aria-selected", false);
                $("#tableInteractionsTab").closest("li").attr("aria-expanded", false);
                $("#listInteractionsTab").closest("li").attr("aria-expanded", false);

                $(".config-storage").attr("aria-hidden", true);
                $(".config-targets").attr("aria-hidden", true);
                $(".config-network").attr("aria-hidden", false);
                $(".config-interactions").attr("aria-hidden", true);

                $(".config-storage").css("display","none");
                $(".config-targets").css("display","none");
                $(".config-network").css("display","block");
                $(".config-interactions").css("display","none");
            };

            $scope.setApplianceInteractionsTab = function(){
                $scope.currentDetail = INTERACTIONS_TAB;
                $(".storagesubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".targetssubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".networksubtab").closest("li").removeClass("ui-tabs-active ui-state-active");
                $(".interactionssubtab").closest("li").addClass("ui-tabs-active ui-state-active");

                $("#tableStorageTab").closest("li").attr("aria-selected", false);
                $("#listStorageTab").closest("li").attr("aria-selected", false);
                $("#tableStorageTab").closest("li").attr("aria-expanded", false);
                $("#listStorageTab").closest("li").attr("aria-expanded", false);

                $("#tableTargetsTab").closest("li").attr("aria-selected", false);
                $("#listTargetsTab").closest("li").attr("aria-selected", false);
                $("#tableTargetsTab").closest("li").attr("aria-expanded", false);
                $("#listTargetsTab").closest("li").attr("aria-expanded", false);

                $("#tableNetworkTab").closest("li").attr("aria-selected", false);
                $("#listNetworkTab").closest("li").attr("aria-selected", false);
                $("#tableNetworkTab").closest("li").attr("aria-expanded", false);
                $("#listNetworkTab").closest("li").attr("aria-expanded", false);

                $("#tableInteractionsTab").closest("li").attr("aria-selected", true);
                $("#listInteractionsTab").closest("li").attr("aria-selected", true);
                $("#tableInteractionsTab").closest("li").attr("aria-expanded", true);
                $("#listInteractionsTab").closest("li").attr("aria-expanded", true);

                $(".config-storage").attr("aria-hidden", true);
                $(".config-targets").attr("aria-hidden", true);
                $(".config-network").attr("aria-hidden", true);
                $(".config-interactions").attr("aria-hidden", false);

                $(".config-storage").css("display","none");
                $(".config-targets").css("display","none");
                $(".config-network").css("display","none");
                $(".config-interactions").css("display","block");
            };
            
            /*$scope.replicationPendingApproval = function(){
                ngDialog.open({
                    dialogType:'Information',
                    scope:this,
                    dialogMessage:"Replication pending approval sucessfully"
                })
            };*/

			$scope.refreshReplicationTarget = function(){
				Appliance.prototype.refresh_replicationTarget();
			};

            PHD.ApplianceTab = ApplianceTab;
        }
		/*
		*openReplicationBandwithDailog : opens dailog-box for throttle schedule*
		*/
		$scope.openReplicationBandwithDailog = function(){

            if($scope.replicationApplianceStatus === 'available'){
            
                ngDialog.open({
                    template: 'app/configure/appliances/replicationBandwidthScheduleTemplate.html',
                    scope: $scope,
                    overlay:true,
                    ngDialogStyle:'width:660px;',
                    modelDialogId:'replication-bandwidth-dialog',
                    name: 'replication-bandwidth-dialog',
                    preCloseCallback: function (value) {
                        
                    }
                })
            }else {
                PHD.throwError({"result": [{"message": gettext("Appliance is not available to perform configure bandwidth.")}]});
            }
        }
        /**************************************** Configure replication Target**********************************************/
	
		$scope.addressFormData = {};
		$scope.replicationTargetData = {};
		var dataObject = {};		
		$scope.formName = {}
	    $scope.replicationTargetData.radioBtnSelection = "2";
		$scope.expandText = false;
		
		/*******Function to open the dialog on click of add cloud target Menu*********************/
		$scope.openUnitrendsCloudAddTargetDialog = function(){
			 ngDialog.open({
                            template: 'app/configure/appliances/addUnitrendsCloudTarget.html',
                            scope: $scope,
                            overlay:true,
                            ngDialogStyle:'width:45em;',
                            modelDialogId:'replication-configureCloudTarget-dailog',
                            preCloseCallback: function (value) {
							 $scope.setDefaultValOfUnitrendsCloudDialog();
						  }
            });
			
		}
		
		/*******Function to open the dialog on click of add unitrends apppliance target Menu*********************/
        $scope.openUnitrendsApplianceTargetDialog = function(){
		    ngDialog.open({
                template: 'app/configure/appliances/addUnitrendsAppliance.html',
                scope: $scope,
                overlay:true,
                modelDialogId:'replication-configureTarget-dailog',
                ngDialogStyle:'width:45em; height:34.2em;',
                preCloseCallback: function (value) {
                    $scope.addressFormData.replicationTarget_hostname="";
                    $scope.addressFormData.replicationTarget_IpAddress="";
                    if(!angular.isUndefined($scope.addressFormData.replicationTarget_hostname)){
                      $scope.addressFormData.replicationTarget_hostname.$dirty = false;
                    }
                }
            });
		};
            
        $scope.addAppliance = function() {
            $analytics && $analytics.eventTrack('Add Appliance', {  category: 'Configure', label: 'Appliance' });
            ngDialog.open({
                template: 'app/configure/appliances/add-appliance.html',
                scope: $scope,
                overlay:true,
                modelDialogId:'add-appliance-dialog',
                documentID: DOC_MANAGING_APPLIANCES,
                name: 'add-appliance-dialog',
                ngDialogStyle:'width:600px;height:300px',
                preCloseCallback: function (value) {
                }
            });
        };
		
		 /**********function to set default value of unitrends cloud dialog componets ************/
		$scope.setDefaultValOfUnitrendsCloudDialog = function(){
			
							  $scope.addressFormData.replicationTarget_cloudAdress = "";
							  $scope.addressFormData.replicationTarget_IPAddress = "";
							  $scope.addressFormData.replicationTarget_port = "";
							  $scope.addressFormData.replicationTarget_activationCode = "";
							  $scope.expandText = false;
							
							  if(!angular.isUndefined($scope.formName.addressForm.replicationTarget_cloudAdress)){
                                  $scope.formName.addressForm.replicationTarget_cloudAdress.$dirty = false;
                              }
							  if(!angular.isUndefined($scope.formName.addressForm.replicationTarget_IPAddress)){
                                  $scope.formName.addressForm.replicationTarget_IPAddress.$dirty = false;
                              }
							  if(!angular.isUndefined($scope.formName.addressForm.replicationTarget_port)){
                                  $scope.formName.addressForm.replicationTarget_port.$dirty = false;
                              }
							  if(!angular.isUndefined($scope.formName.addressForm.replicationTarget_activationCode)){
                                  $scope.formName.addressForm.replicationTarget_activationCode.$dirty = false;
                              } 		
			
		}
		
		/**********function to show popover on clcik of unitrends cloud dialog help icon************/
		$scope.showPopover = function(){
		  var form1 = angular.element("#unitrendsCloudForm");
			console.log(form1)
	   	   form1.find(".definition").popover({
				appendTo: form1
			});

		}

		/***********function for toggle unitrends cloud account text**************/
		$scope.expandAcctText = function(){
			$scope.expandText = !$scope.expandText;
			if($scope.expandText){
				$("#acctTextId").removeClass("reportExpand");
				$("#acctTextId").addClass("reportExpanded");
			}else{
			    $("#acctTextId").removeClass("reportExpanded");
				$("#acctTextId").addClass("reportExpand");
			}
			
		}
		
		/***********function to post unitrends cloud target**************/

        $scope.addUnitrendsCloundTarget = function(){
            var targetName ={};
            var params = {};

            if ($scope.formName.addressForm.replicationTarget_cloudAdress.$invalid){
                return;

            }

            targetName.auth_code = $scope.addressFormData.replicationTarget_cloudAdress;
            targetName.type = "Unitrends_cloud";
            var saveUnitrendsCloudloader = PHD.showLoadingIndicator('body', true, "Sending backup copy request to target.....");
            params.sid = $rootScope.replicationApplianceId;
            var url = "/api/replication/target";
            $http({
                method: 'post',
                url :url,
                data: JSON.stringify( targetName)
            }).success(function(data, status, headers){
                PHD.hideLoadingIndicator(saveUnitrendsCloudloader);
                $scope.refreshReplicationTarget();	// TODO:for refresh back appliance data table.
                $scope.addReplicationTargetNotification();
                $analytics && $analytics.eventTrack('Add Unitrends Cloud Target', {  category: 'Configure', label: 'Backup Copy' });
            }).error(function(response) {
                PHD.hideLoadingIndicator(saveUnitrendsCloudloader);
                var message = response.result[0].message;
                $analytics && $analytics.eventTrack('Failure: ' + message, {  category: 'Configure', label: 'Backup Copy' });
                ngDialog.open({
                    dialogType:'retry',
                    scope: $scope,
                    modelDialogId:'replication-dailog',
                    dialogMessage: message
                })
            });
        };

        
         /***********Start: Function to post unitrends appliance target v.9.0.0 **************/

         $scope.addUnitrendsApplianceAsReplicationTarget = function(){
             var url = "/api/replication/target";
             var params = {};
             var strHostName="";

             if ($scope.formName.addressForm.replicationTarget_hostname.$invalid) {
                 return;
             }

             var applianceAdressDataObj ={};
             applianceAdressDataObj.type = "appliance";
             applianceAdressDataObj.target = $scope.addressFormData.replicationTarget_hostname;
             applianceAdressDataObj.ip = $scope.addressFormData.replicationTarget_IpAddress;
             if($scope.addressFormData.replicationTarget_username != null && $scope.addressFormData.replicationTarget_username != undefined ){
                applianceAdressDataObj.target_username = $scope.addressFormData.replicationTarget_username;
                applianceAdressDataObj.target_password = $scope.addressFormData.replicationTarget_password;
             }
             applianceAdressDataObj.insecure = 0;
             strHostName = $scope.addressFormData.replicationTarget_hostname;
             var load = PHD.showLoadingIndicator('body', true, "Sending backup copy request to target.....");
             var url = "/api/replication/target";
             $http({
                 method:'post',
                 url:url,
                 data:JSON.stringify(applianceAdressDataObj),
                 params:""
             }).success(function(data, status, headers){
                 $scope.refreshReplicationTarget();	// TODO:for refresh back appliance data table.
                 $scope.addReplicationApplianceTargetNotification();
                 $analytics && $analytics.eventTrack('Add Unitrends Appliance Target', {  category: 'Configure', label: 'Appliances' });
                 isApplianceNotSelected = true;
                 PHD.hideLoadingIndicator(load);
             }).error(function(response) {
                 PHD.hideLoadingIndicator(load);
                 if(response.result[0].error_code == 12505){
                     ngDialog.open({
                         template: 'app/configure/appliances/add-appliance-backup-warning-dialog.html',
                         scope: $scope,
                         overlay:true,
                         modelDialogId:'add-appliance-backup-warning-dialog',
                         ngDialogStyle:'width:515px;height:320px;top:30px;',
                         data: {appliancename: strHostName}
                     });
                 }else{
                     var message = response.result[0].message;
                     $analytics && $analytics.eventTrack('Failure: ' + message, {  category: 'Configure', label: 'Backup Copy' });
                     ngDialog.open({
                         dialogType:'ERROR',
                         modelDialogId:'replication-dailog',
                         scope: $scope,
                         dialogMessage: message,
                         preCloseCallback: function (value) {
                             $scope.addressFormData.replicationTarget_hostname="";
                             $scope.addressFormData.replicationTarget_IpAddress="";
                             $scope.addressFormData.replicationTarget_username=undefined;
                             $scope.addressFormData.replicationTarget_password=undefined;
                             if(!angular.isUndefined($scope.addressFormData.replicationTarget_hostname)){
                                 $scope.addressFormData.replicationTarget_hostname.$dirty = false;
                             }
                         }
                     });
                 }
             });
         };

        $scope.onInsecureOptionContinueClick = function(){
            var url = "/api/replication/target";
            var params = {};

            if ($scope.formName.addressForm.replicationTarget_hostname.$invalid) {
                return;
            }

            var applianceAdressDataObj ={};

            applianceAdressDataObj.type = "appliance";
            applianceAdressDataObj.target = $scope.addressFormData.replicationTarget_hostname;
            applianceAdressDataObj.ip = $scope.addressFormData.replicationTarget_IpAddress;
            applianceAdressDataObj.insecure = 1;
            
            var addApplianceload = PHD.showLoadingIndicator('body', true, "Add Unitrends Appliance Target...");

            $http({
                method:'post',
                url:url,
                data:JSON.stringify(applianceAdressDataObj),
                params:""
            }).success(function(data, status, headers){
                $scope.refreshReplicationTarget();	// TODO:for refresh back appliance data table.
                $scope.addReplicationApplianceTargetNotification();
                $analytics && $analytics.eventTrack('Add Unitrends Appliance Target', {  category: 'Configure', label: 'Appliances' });
                isApplianceNotSelected = true;
                PHD.hideLoadingIndicator(addApplianceload);  
            }).error(function(response) {
                PHD.hideLoadingIndicator(addApplianceload);  
                var message = response.result[0].message;
                $analytics && $analytics.eventTrack('Failure: ' + message, {  category: 'Configure', label: 'Backup Copy' });
                ngDialog.open({
                    dialogType:'ERROR',
                    scope: $scope,
                    modelDialogId:'replication-dailog',
                    dialogMessage: message,
                    preCloseCallback: function (value) {
                        $scope.addressFormData.replicationTarget_hostname="";
                        $scope.addressFormData.replicationTarget_IpAddress="";
                        if(!angular.isUndefined($scope.addressFormData.replicationTarget_hostname)){
                            $scope.addressFormData.replicationTarget_hostname.$dirty = false;
                        }
                    }
                });
            })
        };
        
        /***********End: Function to post unitrends appliance target v.9.0.0 **************/

		 
		 /***********function to post unitrends appliance target**************/
		 $scope.nextWizard = function($event){
                   var url = "";
			       $scope.applianceGridData = [ ];
			  	   var params = {};
			 
                   if(wizardTitle == "Configure Target Type"){
					   if($scope.replicationTargetData.radioBtnSelection  == 2){
							$http({
								  method:'get',
								  url:"/api/systems/"
							}).success(function(data, status, headers){

								for(var i=0; i<data.appliance.length;i++){
									if(data.appliance[i].id != $rootScope.replicationApplianceId){
										$scope.applianceGridData.push(data.appliance[i]);
									}
								}
								if($scope.applianceGridData.length == 0) $('#saveWizardBtn').attr('disabled','disabled');
								 $rootScope.$broadcast("nextBtnClick"); 
							}).error(function() { 
								 window.PHD.throwError({"result": [{"message": gettext(response.result[0].message)}]});
							});
                       	   
					     }else{
							  $('#saveWizardBtn').removeAttr('disabled');
							  $rootScope.$broadcast("nextBtnClick"); 	
						 }
                  }
			      if(wizardTitle == "Configure Target"){
					  
                       if ($scope.formName.addressForm.replicationTarget_hostname.$invalid && isApplianceNotSelected) {
					              return;
                        }

                        var applianceAdressDataObj ={};
                      
                        applianceAdressDataObj.type = "appliance";
                        applianceAdressDataObj.insecure = 1;

                        //if($scope.replicationTargetData.radioBtnSelection  == 3){
                             applianceAdressDataObj.target = $scope.addressFormData.replicationTarget_hostname;
                             applianceAdressDataObj.ip = $scope.addressFormData.replicationTarget_IpAddress;
                             if($scope.addressFormData.replicationTarget_isSecure)
                                {
                                    applianceAdressDataObj.insecure = 0;
                                }
                        /*}else{
							
                             applianceAdressDataObj.ip = $scope.selectedIDs.toString();
                        }*/		
					  	
                        
					    url =  "/api/replication/target/";
					    params.sid = $rootScope.replicationApplianceId;
					  
                        dataObject = {
                                        method:'post',
                                        url:url,
                                        wizardFormData:applianceAdressDataObj,
                                        params:""
                                    };
                        wizardService.nextWizard(dataObject);
					    isApplianceNotSelected = true;
			     }
		}

	/*** for appliance Grid***/
		$scope.mySelections = [];
		var isApplianceNotSelected = true;
		$scope.applianceGridData =[];
		$scope.replicationGridOptions = {   data: 'applianceGridData',
											selectedItems: $scope.mySelections,
											columnDefs:[{field: '',width: '10%',cellTemplate: '<div class="ngSelectionCell"><input tabindex="-1" class="ngSelectionCheckbox"                                                            													 type="checkbox" ng-checked="row.selected" /> </div>'},
													   {field:'name',displayName:'Name',width:'30%'},
													   {field:'host',displayName:'IP Adress',width:'30%'},
													   {field:'total_mb_free',displayName:'Avilable Storage',width:'30%'}],
											   afterSelectionChange:function(){
												$scope.selectedIDs = [];
												angular.forEach($scope.mySelections, function ( item ) {
													$scope.selectedIDs.push( item.name )
												});
                                                console.log("selected::::::"+$scope.selectedIDs);
												if($scope.selectedIDs.length>0){
												  isApplianceNotSelected = false;
												}
											}			   
										};
	
	
		/*** for radio button***/
		$scope.selectionChange = function(radioBtnSelection){
			 $scope.replicationTargetData.radioBtnSelection = radioBtnSelection;
		}
		/*** nested function on success of wizard backend save call***/
		$rootScope.$on('nestedFunction', function (event){
			 $scope.refreshReplicationTarget();	// TODO:for refresh back appliance data table.
		});
		
		$scope.addReplicationTargetNotification = function(){
                ngDialog.open({
                    dialogType:'Information',
                    scope: $scope,
                    dialogMessage: gettextCatalog.getString("Unitrends Cloud has been added as a Backup Copy Target. To view the status of this target, select the Backup Copy Targets tab on the Configure page.")
                })
         };
        
         $scope.addReplicationApplianceTargetNotification = function(){
                ngDialog.open({
                    dialogType:'Information',
                    scope: $scope,
                    dialogMessage: gettextCatalog.getString("Unitrends Appliance has been added as a Backup Copy Target. To view the status of this target, select the Backup Copy Targets tab on the Configure page.")
                })
         };
            
        /**** START : Function for List view appliance role tooltip text ****/
        $scope.listViewApplianceRoleTooltipText = function(){
            var applianceType = $scope.selectedAppliance !== null && $scope.selectedAppliance !== undefined ? $scope.selectedAppliance.role : "";
            return $scope.getApplianceDisplayStatus(applianceType);
        };

        $scope.listApplianceIcon = function() {
            var applianceType = $scope.selectedAppliance !== null && $scope.selectedAppliance !== undefined ? $scope.selectedAppliance.role : "";
            return $scope.getApplianceIcon(applianceType);
        };

        $scope.getApplianceDisplayStatus = function(applianceType) {
            var displayStatus = "";
            switch(applianceType){
                case "Replication Source":
                    displayStatus = "Backup Copy: backup copy source";
                    break;
                case "Non-Managed Replication Source":
                    displayStatus = "Backup Copy: Non-managed backup copy source";
                    break;
                case "Pending Replication Source":
                    displayStatus = "Backup Copy: Pending backup copy source";
                    break;
                case "Target":
                    displayStatus = "Backup Copy: Target Appliance";
                    break;
                case "Backup System":
                    displayStatus = "Backup Appliance";
                    break;
                case "Manager":
                    displayStatus = "Backup Appliance: Manages other appliances";
                    break;
                case "Managed DPU":
                    displayStatus = "Backup Appliance: Managed";
                    break;
            }
            return displayStatus;
        };

        $scope.getApplianceIcon = function(applianceType) {
            var iconClass = "";
            switch(applianceType){
                case "Replication Source":
                case "Non-Managed Replication Source":
                case "Pending Replication Source":
                    iconClass = "icon-uui-unitrends-backup-copy-source2";
                    break;
                case "Target":
                    iconClass = "icon-uui-backup-copy";
                    break;
                case "Backup System":
                case "Manager":
                case "Managed DPU":
                default:
                    iconClass = "icon-uui-unitrends-appliance2";
                    break;
            }
            return iconClass;
        };
        /**** END : Function for List view appliance role tooltip text ****/
         /**** END : Function for List view appliance role tooltip text ****/
        $scope.editChangerGridOptions = {
            enableSorting: true,
            enableColumnMenus:false,
            columnDefs: [
              {
                  field: 'index',
                  headerCellFilter: "translate",
                  displayName: gettext('Slot')
              },
              {
                  field: 'status',
                  headerCellFilter: "translate",
                  displayName: gettext('Status'),
                  cellTemplate: '<div style=\'line-height: inherit;\' ng-class="row.entity.status ==\'Empty\' ?\'icon-removesign icon-large redcolor\':\'icon-oksign icon-large greencolor\'" ></div>'
              },
              {
                  field: 'barcode',
                  headerCellFilter: "translate",
                  displayName: gettext('Barcode')
              }
            ]
        };
        $scope.refreshGrid =function(){
            var url ='/api/archive/media/library/'+$scope.changerName;
            var loadIndicator = PHD.showLoadingIndicator('body', true, "Fethcing changer's current settings.....");
            $http({
                method: 'get',
                 url :url
            }).success(function(data, status, headers){
                PHD.hideLoadingIndicator(loadIndicator);
                $scope.editChangerGridOptions.data=data.data.slots;
            }).error(function(response) {
                PHD.hideLoadingIndicator(loadIndicator);
            });
        };
        $scope.closeThisDialog = function(){
            ngDialog.close('editChangerDlg'); 
        };
        $scope.closeEditTapeDialog = function(){
            ngDialog.close('editTapeDlg'); 
        };
        $scope.saveTapeSettings = function(){
            var changerUrl = "/api/archive/media/settings/"+$scope.parentChangerModel;
            var tapeArguments={"settings":{"is_available":"false"}};
            var loadIndicator = PHD.showLoadingIndicator('body', true, "Saving Tape settings.....");

            $http({
                 method: 'put',
                 url :changerUrl,
                 data: tapeArguments
            }).success(function(data, status, headers){
                    var restObj={
                        "settings":{
                              "parent_changer":$scope.parentChangerModel,
                              "parent_changer_driveno":$scope.parentchangerDriver,
                              "use_unlabelled_tapes":$scope.unlabelledCheck.toString()   
                        }
                    };  
                    var url= "/api/archive/media/settings/"+$scope.tapeName;
                    if (url.indexOf('#') > -1) {
                        url = url.replace('#','%23');
                    }
                    $http({
                         method: 'put',
                         url :url,
                         data: restObj
                    }).success(function(data, status, headers){
                            var tapeArgumentsReset={"settings":{"is_available":"true"}};
                            $http({
                                 method: 'put',
                                 url :changerUrl,
                                 data: tapeArgumentsReset
                            }).success(function(data, status, headers){
                                 PHD.hideLoadingIndicator(loadIndicator);
                                 ngDialog.close('editTapeDlg'); 
                            }).error(function(response) {
                                PHD.hideLoadingIndicator(loadIndicator); 
                                ngDialog.open({
                                dialogType:'retry',
                                modelDialogId:'edit-tape-error',
                                dialogMessage:response.result[0].message
                                });
                            });
                    }).error(function(response) {
                         PHD.hideLoadingIndicator(loadIndicator); 
                        ngDialog.open({
                                dialogType:'retry',
                                modelDialogId:'edit-tape-error',
                                dialogMessage:response.result[0].message
                        })
                    });
            }).error(function(response) {
                 PHD.hideLoadingIndicator(loadIndicator); 
                ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'edit-tape-error',
                        dialogMessage:response.result[0].message
                })
            });
            
        };
        
        $scope.showTooltipForEditTape = function(){
         var form1 = angular.element("#editTapeDialogForm");
            console.log(form1);
            form1.find(".definition").popover({
                appendTo: form1
            });     
                
        };
        $scope.$on('ngDialog.opened', function(event, obj) {
            if (obj.name === 'editTapeDlg') {
                $scope.showTooltipForEditTape();
            }
        });
		$scope.openImportDialog = function(){
            $scope.slotNumberError = false;
            $scope.importObject={};
            var url='/api/archive/media/settings/'+$scope.selectedTarget.name;
            var loadingIndicator = PHD.showLoadingIndicator('body', true, "Checking for Changer settings.....");
            $http({
                method: 'get',
                url :url
           }).success(function(data, status, headers){
                 PHD.hideLoadingIndicator(loadingIndicator);
                if(data.data[0].value == "true"){
                    ngDialog.open({
                    template: 'app/configure/appliances/changer-import.html',
                    scope: $scope,
                    overlay:true,
                    modelDialogId:'changer-import-dailog',
                    ngDialogStyle:'width:40em;'
                    });
                }else{
                    ngDialog.open({
                    dialogType:'Information',
                    dialogMessage:"Changer needs to be associated first"
                    });
                }
            }).error(function(response){
                PHD.hideLoadingIndicator(loadingIndicator);
                var message = response.result[0].message;
                ngDialog.open({
                    dialogType:'retry',
                    scope: $scope,
                    modelDialogId:'changer-settings-dailog',
                    dialogMessage: message
                });
            })
           
            
       };
       $scope.importChanger = function(){
            if(  typeof($scope.importObject.slotNumber) == 'undefined'|| $scope.importObject.slotNumber ==''){
                $scope.slotNumberError = true;
                return
            }
            $scope.slotNumberError = false;
            var dataImportParams={
                name:$scope.selectedTarget.name,
                slots:$scope.importObject.slotNumber,
                force:(typeof($scope.importObject.forceImport) !='undefined')?$scope.importObject.forceImport:false
            };
            var url = "/api/archive/catalog/?sid="+PHD.appliance_sid;
            console.log(url);
            console.log(dataImportParams);
            var loadingIndicator = PHD.showLoadingIndicator('body', true, "Impoting Changer.....");
          $http({
                method: 'post',
                url :url,
                data: dataImportParams
            }).success(function(data, status, headers){
                  PHD.hideLoadingIndicator(loadingIndicator);
                  ngDialog.close('changer-import-dailog');
            }).error(function(response){
                PHD.hideLoadingIndicator(loadingIndicator);
                var message = response.result[0].message;
                ngDialog.open({
                    dialogType:'retry',
                    scope: $scope,
                    modelDialogId:'changer-dailog',
                    dialogMessage: message
                });
            })
        };
       $scope.closeImportChangerDialog = function(){
        ngDialog.close('changer-import-dailog');
        
       };
       $scope.saveSlotsSettings = function(){
        var url = "/api/archive/media/settings/"+$scope.selectedTarget.name;
        var dataparams={
            "settings": {
                "available_slots":$scope.slotsObj.changerSlots
            }
        };
        var loadingIndicator = PHD.showLoadingIndicator('body', true, "updating slots of Changer");
            $http({
                 method: 'put',
                 url :url,
                 data: dataparams
            }).success(function(data, status, headers){
                 PHD.hideLoadingIndicator(loadingIndicator);
                 ngDialog.close('editChangerDlg') ;
            }).error(function(response){
                PHD.hideLoadingIndicator(loadingIndicator); 
                        ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'edit-tape-error',
                        dialogMessage:response.result[0].message
                });
            })
       };
       $scope.testForValidEntry = function(){
        $scope.checkforValidSlots = true;
        if( typeof($scope.slotsObj.changerSlots) =='undefined' ||$scope.slotsObj.changerSlots==''){
           $scope.checkforValidSlots = true;
        }else{
            var test_string = $scope.slotsObj.changerSlots.toLowerCase();
            if(test_string == 'all'){
                $scope.checkforValidSlots = false;
            }else if (!isNaN($scope.slotsObj.changerSlots)){
                    if(parseInt($scope.slotsObj.changerSlots) > $scope.editChangerGridOptions.data.length){
                        $scope.checkforValidSlots = true;
                    }else{
                        $scope.checkforValidSlots = false;
                    }    
            }else if($scope.slotsObj.changerSlots.indexOf("-") > -1){
                var test_range_string= $scope.slotsObj.changerSlots.split("-");
                if (test_range_string.length > 2){
                    $scope.checkforValidSlots = true;
                }else{
                    if(test_range_string[0] >$scope.editChangerGridOptions.data.length || test_range_string[1] >$scope.editChangerGridOptions.data.length ){
                        $scope.checkforValidSlots = true;
                    }else{
                        $scope.checkforValidSlots = false ;
                    }
                }
            }else if($scope.slotsObj.changerSlots.indexOf(",") > -1){
                 var comma_flag = false;
                 var test_comma_string= $scope.slotsObj.changerSlots.split(",");
                 for ( var i =0 ; i <test_comma_string.length ;i++){
                    if(test_comma_string[i] >$scope.editChangerGridOptions.data.length){
                        comma_flag = true;
                        break;
                    }
                 }
                 $scope.checkforValidSlots=comma_flag;
            }
        }
    }
       $scope.showTooltipForChangeTape = function(){
        var form1 = angular.element("#changereditdialog");
            console.log(form1)
            form1.find(".definition").popover({
                appendTo: form1
            });
       }

        $scope.showTooltipForForce = function () {
            var form1 = angular.element("#changer-import-dialog");
            console.log(form1)
            form1.find(".definition").popover({
                appendTo: form1
            });
        }
    }]);