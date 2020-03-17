angular.module('backupCopyMedia', ['ngDialog', 'angulartics', 'angulartics.google.analytics'])
.service('mediaService', ['$analytics', 'ngDialog', '$rootScope', function($analytics, ngDialog, $rootScope) {

    this.prepareTarget = function(target, sid, user_label, load,slotnumber) {
        $analytics && $analytics.eventTrack('Prepare Target', {  category: 'Configure', label: 'Target' });
        var url = '/api/archive/media/prepare/';
        var obj = {};
        var now = new Date();
        var label = (user_label == null || user_label == "") ? "tgt_" + now.getDate() + "_" + now.getHours() : user_label;
        obj.label = label;
        if(typeof(slotnumber) != 'undefined'){
            obj.slots=slotnumber;
        }
        if (target) {
            url += target.name + '/?sid=' + sid;
            if (target.archive) {
                obj.mount = true;
            }
        }
        obj = JSON.stringify(obj);
        return PHD.Ajax.put(url, obj, load, this.handleMediaError);
    };

    this.getSets = function(target, sid, load) {
        $analytics && $analytics.eventTrack('Get Media Sets', {  category: 'Configure', label: 'Target' });
        var url = '/api/archive/media/sets/';
        if (target) {
            url += target.name + '/?sid=' + sid + "&lang=" + $rootScope.userLanguageCode;
        }
        return PHD.Ajax.get(url, null, this.handleMediaError);
    };

    this.importSets = function(target, sid, load, slotnumber, force) {
        $analytics && $analytics.eventTrack('Import Sets', {  category: 'Configure', label: 'Target' });
        var url = '/api/archive/catalog/';
        var obj = {};
        obj.name = target.name;
        if (slotnumber !== undefined) {
            obj.slots = slotnumber;
        }
        if (force !== undefined) {
            obj.force = force;
        }
        if (target) {
            url += target.name + '/?sid=' + sid;
        }
        obj = JSON.stringify(obj);
        return PHD.Ajax.post(url, obj, load, this.handleMediaError);
    };

    this.handleMediaError = function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.status === 500) {
            var data = jqXHR.responseJSON;
            var error = data;
            if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                error = data.result[0].message;
                console.log("The error is:" + error);
            }
            var scope = $rootScope.$new();
            ngDialog.open({
                dialogType:'Error',
                modelDialogId:'ErrorDialog',
                dialogMessage: error,
                scope:scope,
                onConfirmOkButtonClick:'onConfirmError()'
            });
            scope.onConfirmError = function () {
                ngDialog.close('ErrorDialog');
            };
        } else {
            PHD.ajaxError(jqXHR, textStatus, errorThrown);
        }
    };

    this.validateForm = function(form) {
        var MAX_LABEL = 12;
        var NAME_REGEX = /^[a-zA-Z0-9\_]+$/;
        form.validate({
            errorLabelContainer: "#dialog-error-list",
            errorContainer: "#dialog-errors",
            showErrors: function(errorMap, errorList) {
                $("#dialog-errors").find(".summary")
                    .html(gettext("Correct the following errors:"));
                this.defaultShowErrors();
            },
            rules: {
                label: {
                    maxlength: MAX_LABEL,
                    pattern: NAME_REGEX
                },
                slotnumber:{
                    required: true
                }
            },
            messages: {
                label: {
                    pattern: "alphanumeric characters or underscores only"
                },
                slotnumber:{
                    required: "slots are required"
                }
            }
        });
    };

    this.showHelp = function(form) {
        if (form !== null) {
            form.find(".definition").popover({
                appendTo: form
            });
        }
    };

}])
.controller('eraseMediaCtrl', ['$scope', '$rootScope', '$http','ngDialog', 'mediaService', function($scope, $rootScope, $http, ngDialog, mediaService) {

    $scope.target = $scope.ngDialogData.target;
    $scope.sid = $scope.ngDialogData.appliance_id;
    $scope.showSets = false;
    $scope.form = null;
    $scope.media_label = null;

    $scope.confirmErase = function(){
        if ($scope.form && $scope.form.valid()) {
            $scope.showSets = false;
            var load = PHD.showLoadingIndicator('body', true, "Erasing Target...");
            var resp = mediaService.prepareTarget($scope.target, $scope.sid, $scope.media_label, load);
            resp.done(function (data) {
                $scope.closeThisDialog();
            });
        }
    };

    $scope.getSets = function() {
        console.log($scope.target, $scope.sid);
        var resp = mediaService.getSets($scope.target, $scope.sid, null);
        resp.done(function (data) {
            var sets = data.sets;
            $scope.setCount = 0;
            if (sets !== undefined && sets.length > 0) {
                $scope.setCount = sets.length;
                $scope.firstSet = sets[0];
                $scope.lastSet = sets[sets.length - 1];
                $scope.dateRangeString = $scope.setCount > 0 ? ", ranging from " + $scope.firstSet.date + " to " + $scope.lastSet.date + "." : ".";
            }
            $scope.showSets = true;
            setTimeout(function () {
                $scope.$apply();
            }, 250);
        });
    };

    $scope.showLabelToolTip = function() {
        var form = $scope.form;
        mediaService.showHelp(form);
    };

    $scope.init = function(dlg) {
        if (dlg.name == 'erase-media-dialog') {
            $scope.form = angular.element("#confirm-erase-form");
            mediaService.validateForm($scope.form);
            $scope.showLabelToolTip();
        }
    };

    $scope.$on('ngDialog.opened', function(event, obj) { $scope.init(obj) });

}])
.controller('prepareMediaCtrl', ['$scope', '$rootScope', '$http','ngDialog', 'mediaService', function($scope, $rootScope, $http, ngDialog, mediaService) {

    $scope.target = $scope.ngDialogData.target;
    $scope.sid = $scope.ngDialogData.appliance_id;
    $scope.form = null;
    $scope.media_label = null;
    $scope.obj={};
    $scope.obj.slot_number = null;
    $scope.confirmPrepare = function(){
        if ($scope.form && $scope.form.valid()) {
            console.log($scope.target, $scope.sid);
            var load = PHD.showLoadingIndicator('body', true, "Preparing Target...");
            var resp='';
            if($scope.target.type=='changer'){
                resp = mediaService.prepareTarget($scope.target, $scope.sid, $scope.media_label, load,$scope.obj.slot_number);
            }else{
                resp = mediaService.prepareTarget($scope.target, $scope.sid, $scope.media_label, load);
            }
            resp.done(function (data) {
                $scope.closeThisDialog();
            });
        }
    };

    $scope.showLabelToolTip = function() {
        var form = $scope.form;
        mediaService.showHelp(form);
    };

    $scope.init = function(dlg) {
        if (dlg.name == 'prepare-media-dialog') {
            $scope.form = angular.element("#confirm-prepare-form");
            mediaService.validateForm($scope.form);
            $scope.showLabelToolTip();
        }
    };

    $scope.$on('ngDialog.opened', function(event, obj) { $scope.init(obj) });

}])
.filter('import_icon_filter', function() {
    return function (value) {
        return value === false ? 'icon-okcircle' : 'icon-bancircle';
    }
})
.controller('mediaSetsCtrl', ['$scope', '$rootScope', '$http', '$timeout','ngDialog', 'mediaService', 'uiGridConstants', 'gettextCatalog',
    function($scope, $rootScope, $http, $timeout, ngDialog, mediaService, uiGridConstants, gettextCatalog) {

    // Used to unbind the watched event on dialog close.
    var unbindHandler = null;

    $scope.target = $scope.ngDialogData.target;
    $scope.sid = $scope.ngDialogData.sid;
    $scope.showSets = true;

    $scope.setsGridData = {
        multiSelect: false,
        selectionRowHeaderWidth: 35,
        rowHeight: 30,
        enableFullRowSelection : true,
        gridMenuShowHideColumns:false,
        enableColumnMenus:false,
        enableHorizontalScrollbar: 0,
        //rowTemplate: settingsTemplate,
        data: []
    };

    var importTemplate = '<div class="ui-grid-cell-contents" style="text-align:center"><i class="{{ row.entity.needs_import | import_icon_filter }} icon-large"></i></div>';

    $scope.setsGridData.columnDefs = [
        {
            field: "description",
            displayName: gettext("Description"),
            headerCellFilter: 'translate',
            cellTooltip: true,
            sortable : true,
            type : "string"
        },
        {
            field: "date",
            displayName: gettext("Date"),
            headerCellFilter: 'translate',
            sortable: true,
            sort: {
                direction: uiGridConstants.DESC,
                priority: 0
            },
            type: "string"
        },
        {
            field: "needs_import",
            displayName: gettext("Imported?"),
            headerCellFilter: 'translate',
            sortable : true,
            type : "string",
            cellTemplate: importTemplate,
            width: '120'
        }
    ];

    $scope.loadSets = function() {
        console.log($scope.target, $scope.sid);
        var resp = mediaService.getSets($scope.target, $scope.sid, null);
        resp.done(function (data) {
            $scope.sets = data.sets;
            $scope.setCount = $scope.sets.length;
            $scope.showSets = $scope.setCount > 0;
            $timeout(function () {
                $scope.setsGridData.data = $scope.sets;
            });
        });
    };

    $scope.importMediaSets = function() {
        console.log($scope.target, $scope.sid);
        if ($scope.target !== undefined && $scope.target.type !== 'changer') {
            var load = PHD.showLoadingIndicator('body', true, gettext("Importing Sets.."));
            var resp = mediaService.importSets($scope.target, $scope.sid, load);
            resp.done(function (data) {
                var message = "unknown error importing sets";
                if (data.messages instanceof Array) {
                    message = data.messages.join('\n');

                    var startedMessage = gettextCatalog.getString("For sets that were not previously imported, the import process has started.") + "  " +
                        gettextCatalog.getString("The time required to import all detailed file information depends on the number and size of copies") + " " +
                        gettextCatalog.getString("as well as the number of files in each backup."); // + "  " +
                    //gettext("To view import status, re-scan and hover over the target to see the media activity.");

                    message = startedMessage + "\n\nMessages:\n\n" + message;
                } else {
                    message = gettext("Unknown error importing sets.  Please ensure media is mounted and re-try.");
                }

                $scope.outputTitle = "Import Results";
                $scope.outputData = message;
                $scope.onConfirmOkButtonClick = $scope.onConfirmOutput;
                ngDialog.open({
                    template: 'app/common/command-output.html',
                    modelDialogId:'data-output-dialog',
                    dialogMessage:message,
                    scope:$scope,
                    ngDialogStyle: 'width:650px; height:475px;',
                    onConfirmOkButtonClick: 'onConfirmOutput()'
                });

            });
        } else {
            // Use standard changer import dialog, which prompts for slots and force option.
            if ($scope.$parent.$parent.openImportDialog instanceof Function) {
                $scope.$parent.$parent.openImportDialog();
                $scope.closeSetsDialog();
            } else {
                var message = gettextCatalog.getString("Select changer and click Import to continue.");
                ngDialog.open({
                    dialogType: 'ERROR',
                    dialogMessage: message,
                    overlay:true
                });
                $scope.closeSetsDialog();
            }
        }
    };

    $scope.onConfirmOutput = function () {
        ngDialog.close('data-output-dialog');
    };

    $scope.init = function(dlg) {
        if (dlg.name === 'archive-media-sets') {
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