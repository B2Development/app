var app = angular.module( 'uiApp', [
		'ngRoute',
		'ngCookies',
        'ngIdle',
        'ngSpectrum',
		'LocalStorageModule',
		'login',
		'ChartAngular',
		'configure', 'configAppliances', 'configAssets', 'configCopiedAssets', 'configNetworkedAppliances',
		'config-storage-module',
		'jobs',
		'reports',
        'help',
	    'options',
		'protect',
		'recover',
		'quickStartWizard',
        'optimizerWizard',
		'mgo-angular-wizard',
		'recover',
        'dynamicdashboardapp',
		'archiveSummaryWidgetModule',
		'backupSummaryWidgetModule',
		'activeJobWidgetModule',
		'topForumPostsWidgetModule',
        "storageWidgetModule",
		"alertWidgetModule",
		'dailyFeedWidgetModule',
		'ngSanitize',
        'nsPopover',
        'angulartics',
        'angulartics.google.analytics',
        'tour-module',
		'retention',
        'longTermRetention',
        'replicationThrottleScheduleModule',
        'backupCopyOptionDialogModule',
        'cifsStorage',
        'nfsStorage',
        'iscsiStorage',
        'fcStorage',
        'credentials',
        'asset_service',
        'cisco_ucs_service',
        'add_server',
        'add_cisco_ucs',
        'edit_server',
 		'ngJsTree',
 	    'fileBrowserDialogApp',
        'manage-appliance',
        'treeGrid',
		'backupCopyWidgetWidgetModule',
        'RecoverTileModule',
        'windowRecoveryModule',
        'imageLevelInstantRecoveryModule',
        'replicasModule',
        'editNonManagedResourceApplianceModule',
        'backupCopyStorageWidgetModule',
	    'recoveryModule',
        'fileLevelRecoveryModule',
        'backupJobModule',
        'inventory',
        'searchFLRModule',
        'backupCopyTargetModule',
        'multipleErrorsController',
        'backupCopyMedia',
        'updates',
        'hypervisor_ctrl',
		'addEditNasModule',
        'advanced-toolbox',
        'active-directory-module',
        'os-password-module',
        'iscsi-chap-module',
        'replica-config-module',
        'advanced-settings-module',
        'advanced-hosts-module',
        'advanced-ports-module',
        'network-module',
        'interactions-module',
        'advanced-snmp-module',
        'groups-module',
        'backup-details-module',
        'license-resource-module',
        'screen-resolution',
        'editFromSource',
        'flrBrowseModule',
        'globalVMSettingsModule',
        'custom_calendar',
        'job-calendar',
        'date_range',
        'backup-copy-configuration',
        'roles-access-module',
        'networked-appliances-module',
        'networked-appliance-customers-module',
        'networked-appliance-options-module',
        'distributed-reports-module',
        'angular-flippy',
        'san-direct-module',
        'cookie-manager',
        'certifyBackupJobModule',
        'failoverJobModule',
        'serviceProfiles',
        'angular-tour',
        'rdrWidgetModule',
        'globalVMSettingsModule',
        'reconfigureIpDcaModule',
        'certifyJobDetailsModule',
        'treeGridJobProgress',
        'sla-policy-module',
        'retention-period',
        'report-details-module',
        'user-preferences',
        'gettext',
        'language-selection',
        'backup-copy-job-module',
        'edit-appliance-module',
        'edit-useraccount-module',
        'backup-status-module',
        'release-notes',
        'strings-module',
        'sort-module',
        'manage-backups-module'
]);

app.factory('Page', ['cookiesvc','$rootScope', function(cookiesvc,$rootScope){
    var title = 'Unitrends UI';
    return {
        title: function() {
           if($rootScope.user.eulaWizardFlag){
                return "Unitrends End User License Agreement";
            }else if($rootScope.user.showSetupWizFlag){
                return "Unitrends QuickSetup Wizard";
            }else{
                return location.host + ' - ' + title;
            }
        },
        setTitle: function(newTitle, update_cookies) {
            if (update_cookies === undefined || update_cookies === true) {
                cookiesvc.put('Page', newTitle);
            }
            title = newTitle;
        }
    };
}]);

/*
modal dialog for alert
*/
app.directive('alertDialog', function () {
    return {
        restrict: 'E',
        scope: {
            show: '='
        },
        replace: true, // Replace with the template below
        transclude: true, // we want to insert custom content inside the directive
        link: function (scope, element, attrs) {
            scope.dialogStyle = {};
            if (attrs.width)
                scope.dialogStyle.width = attrs.width;
            if (attrs.height)
                scope.dialogStyle.height = attrs.height;
            scope.hideModal = function () {
                scope.show = false;
            };
        },
        template: "<div class='ng-modal' ng-show='show'><div class='ng-alertmodeldialog-dialog' ng-style='dialogStyle'><div class='ng-alertmodeldialog-dialog-content' ng-transclude></div></div></div>"
    };
});
app.factory('dataToBeShared', function(){
    return { objectList:undefined };
});


/*
 * Items controlled at the global level.
 */
app.controller('GlobalCtrl', ['$scope', '$rootScope', '$window', '$location', '$http', 'Page', 'Idle', 'ngDialog', 'Title', '$timeout',
        'cookiesvc', 'stringsvc', 'localStorageService',
		function($scope, $rootScope, $window, $location, $http, Page, Idle, ngDialog, Title, $timeout, cookiesvc, stringsvc, localStorageService) {
	
	$scope.Page = Page;
	
	/*open and close dailog*/
	$scope.modalShown = false;
    document.onkeydown = function (event) {
        /*
        if (!event) {  This will happen in IE 
            event = window.event;
        }*/
        var keyCode = event.keyCode;
        if (keyCode == 8 &&
            ((event.target || event.srcElement).tagName != "TEXTAREA") && 
            ((event.target || event.srcElement).tagName != "INPUT")) { 
            
            if (navigator.userAgent.toLowerCase().indexOf("msie") == -1) {
                ngDialog.close();
                if (typeof(window.PHD.currentDialog) !='undefined' && typeof(window.PHD.currentDialog.wizard) !='undefined'){

                    try{
                        window.PHD.currentDialog.wizard("close");
                    }
                        catch(err) {

                    }
                    
                } 
                ngDialog.close();
                return true;
                //event.stopPropagation();
            } else {
                //alert("prevented");
                event.returnValue = false;
            }
            
            return false;
        }
    };
    $scope.toggleModal = function() {
        if($scope.modalShown == true)
        {
            $('.ng-alertmodeldialog-dialog').css("display","none");
            $scope.modalShown = !$scope.modalShown;
            $timeout(function() {
                $scope.$apply(function() {
                    $("#id-alerts-menu").removeClass("open");
                    $("#id-alerts-menu").blur();
                });
            }, 0);
        }
        else
        { $('.ng-alertmodeldialog-dialog').css("display","block");
            $scope.modalShown = !$scope.modalShown;
        }
    };

    $rootScope.checkRole = function(roleName, subsystem) {
        var disabled = false;
        if (roleName !== undefined) {
            switch (subsystem) {
                case 'configure':
                    disabled = roleName == 'backup_operator' || roleName == 'restore_operator' || roleName == 'operator';
                    break;
                case 'backup':
                    disabled = roleName == 'restore_operator';
                    break;
                case 'recover':
                    disabled = roleName == 'backup_operator';
                    break;
            }
        }
        return disabled;
    };

    $rootScope.checkAndUpdateVersion = function() {
        var loadedVersion = cookiesvc.get('uiVersion', true) !== 'undefined' ? cookiesvc.get('uiVersion') : undefined;
        var uiVersionisNewer = false;
        if (loadedVersion !== undefined) {
            if ($rootScope.uiVersion !== undefined) {
                // compare to see if uiVersion is newer than loadedVersion
                if (stringsvc.compareVersions($rootScope.uiVersion, loadedVersion)) {
                    uiVersionisNewer = true;
                    console.log("uiVersion is newer:" + $rootScope.uiVersion + "; cookie version: " + loadedVersion);
                }
            }
        }
        cookiesvc.put('uiVersion', $rootScope.uiVersion);
        return uiVersionisNewer;
    };

	// user name should be passed from login
	$rootScope.backupTimer=10000;
    $rootScope.maintenance_mode = false;
    $rootScope.saveTimers = [];
    $rootScope.saveJobTimer = 0;
    $rootScope.saveJobTimer = 0;

    $rootScope.local = {};
    $rootScope.local.id = localID;
    $rootScope.local.name = localName;

    // Default job history to max of 250 records
    // This could be persisted if desired, but the concern is that the more jobs the more chance to overload the DataTable.
    $rootScope.jobHistoryLimit = 250;
    $rootScope.jobHistoryLimitHit = "";

    // Default audit history to max of 250 records
    $rootScope.systemJobHistoryLimit = 250;
    $rootScope.systemJobHistoryLimitHit = "";

    //default replica max recovery points
    $rootScope.maxRecoveryPoints = maxRecoveryPoints;

    // default alert icon
    $rootScope.ransomwareAlert = false;

    // Version information loaded from index.php (rpm -q)
    $rootScope.uiVersion = appVersion;

            // See if the user is logged in.
    var $cookie = {};
    $cookie.username = cookiesvc.get("username");
    $cookie.uid = cookiesvc.get("uid");
    $cookie.password = cookiesvc.get("password");
    $cookie.token = cookiesvc.get("token");
    $cookie.superuser = cookiesvc.get("superuser");
    $cookie.administrator = cookiesvc.get("administrator");
    $cookie.monitor = cookiesvc.get('monitor', true) !== 'undefined' ? cookiesvc.get("monitor") : undefined;
    $cookie.role_name = cookiesvc.get('role_name', true) !== 'undefined' ? cookiesvc.get("role_name") : undefined;
    $cookie.role_scope = cookiesvc.get('role_scope', true) !== 'undefined' ? cookiesvc.get("role_scope") : undefined;
    $cookie.role_recover_options = cookiesvc.get('role_recover_options', true) !== 'undefined' ? cookiesvc.get("role_recover_options") : undefined;

    if ($cookie.token !== undefined && $cookie.username !== undefined) {
        $scope.user = {};
        $scope.user.loggedIn = true;
        $scope.user.name = $cookie.username;
        $scope.user.id = $cookie.uid;
        $scope.user.token = $cookie.token;
        $scope.user.superuser = $cookie.superuser;
        $scope.user.administrator = $cookie.administrator;
        $scope.user.monitor = $cookie.monitor;
        $scope.user.role_name = $cookie.role_name;
        $scope.user.role_scope = $cookie.role_scope;
        $scope.user.role_recover_options = $cookie.role_recover_options;

        // Based on role, disable major subsystems.
        $rootScope.backupDisabled = $rootScope.checkRole($scope.user.role_name, 'backup');
        $rootScope.configureDisabled = $rootScope.checkRole($scope.user.role_name, 'configure');
        $rootScope.recoverDisabled = $rootScope.checkRole($scope.user.role_name, 'recover');
        $http.defaults.headers.common['AuthToken'] = $scope.user.token;
        var persistedFilters = localStorageService.get('catalogFilters');
        if (persistedFilters !== null && persistedFilters !== undefined) {
            $rootScope.catalogFilters = persistedFilters;
        }
    } else {
        $scope.user = {};
        $scope.user.name = '';
        $scope.user.id = '';
        $scope.user.loggedIn = false;
        $scope.user.token = '';
        $scope.user.superuser = false;
        $scope.user.administrator = false;
        $scope.user.monitor = false;
        $scope.user.role_name = undefined;
        $scope.user.role_scope = undefined;
    }

	// set preferences for user, refresh rates, get user id.
	// track whether or not they have seen the tour (tour_activated)
	// track whether or not the eula is accepted (sula_accepted)
	// track the timezone: (timezone = 'US/Eastern')
	// track username, first and last name, email, active_user
	// is_superuser, is_staff?
	// date_user_created
	// tz string for timezone (tz='-0400')
	
	$rootScope.user = $scope.user;
    global_user = $rootScope.user;

    // Platform-specifics
    $rootScope.isCE = isCE === 1;                // Unitrends Free
    $rootScope.isGoogle = isGoogle === 1;        // Unitrends Free Google Edition
    $rootScope.isVirtual = isVirtual === 1;      // A virtual appliance (UEB, Unitrends Free, Unitrends Free Google Edition)
    $rootScope.isTarget = isTarget === 1;        // Is this appliance a target?
    $rootScope.isKumo = isKumo === 1;
    $rootScope.isUEB = $rootScope.isVirtual && !($rootScope.isCE || $rootScope.isGoogle || $rootScope.isKumo);    // UEB
    $rootScope.isXenUEB = isXenUEB === 1;        // XenUEB?// Is this the gateway appliance?
    $rootScope.isRecoverySeries = !$rootScope.isVirtual && !$rootScope.isKumo;    // Recovery Series Hardware Appliance, Kumo can also be hardware
    $rootScope.isNetworkManager = (showLooselyCoupled === 1) && !$rootScope.isCE && !$rootScope.isKumo;  // The appliance can be the recipient of monitoring data and manage others over a network
    $rootScope.showSLAPolicies = showSLAPolicies === 1;  // Show SLA Policies
    $rootScope.showArchiving = showArchiving === 1;  // show archiving/cold backup copy or not
    $rootScope.showRetention = showRetention === 1;  // show retention settings or not
    $rootScope.showInstantRecovery = !$rootScope.isKumo;
    $rootScope.assetTag = assetTag;                 // appliance Asset Tag
    $rootScope.identity = identity;                 //Identity of appliance
    $rootScope.featureString = featureString;       //featurestring of appliance
    $rootScope.isRDRSupported = rdrSupported === 1;  //Check if RDR is supported on the system
    $rootScope.userLanguageCode = defaultLanguage;  // default langauge for front page.
    $rootScope.isHypervReplicasSupported = hypervReplicasSupported === 1;
    $rootScope.isVMwareReplicasSupported = vmWareReplicasSupported === 1;
    $rootScope.showAHV = showAHV === 1;   // AHV Nutanix
    $rootScope.showBlock = showBlock === 1; // image-level backups supported

    // Some preferences are global.
    $rootScope.globalPreference = {};
    $rootScope.globalPreference.showSetupWizard = showWizard;
    $rootScope.globalPreference.showEULA = showEULA;
    $rootScope.globalPreference.showTour = showTour;

    /*
     * Set rootScope variable to track view of backup catalog filter (defaults to "show").
     */
    $rootScope.showCatalogFilter = true;

	$scope.user.logout = function() {

        var userout = {};
        userout.cookie = $scope.user.token;
        /*
         * Turn off the idle timer, if set
         */
        Idle.unwatch();

        $http.post('/api/logout', userout)
            .success(function(data, status, headers) {
                $scope.logoutUser();
            })
            .error(function(data, status, headers) {
                // Tap into PHD.throwError function here.
                // No need to display this.  There is nothing a user can do.  Log to the console and if logins fail, the user will see the errors.
                //window.PHD.throwError(data);
                if (data != undefined && data.result != undefined && data.result[0] != undefined && data.result[0].message != undefined) {
                    console.log("user.logout: error, message = " + data.result[0].message);
                }
                $scope.logoutUser();
            })
	};

    $(document).on("session-expired", function(event) {
        $scope.user.logout();
    });

    $scope.logoutUser = function() {
        // Send an event on logout.
        var e = $.Event('logout');
        $(document).trigger(e);

        // remove cookies if present.
        cookiesvc.remove('username');
        cookiesvc.remove('password');
        cookiesvc.remove('uid');
        cookiesvc.remove('superuser');
        cookiesvc.remove('administrator');
        cookiesvc.remove('monitor');
        cookiesvc.remove('remember_me');
        cookiesvc.put('autologin', false);

        $scope.user.loggedIn = false;
        $rootScope.user.loggedIn = false;
        $rootScope.user.token = '';
        cookiesvc.remove('token');

        // force reload on logout to clean up Timers.
        $window.location.href = "#";
        $window.location.reload();
    };
	
	$scope.credentials = {
		username: '',
		password: ''
	};

	$rootScope.setIfDefined = function(obj, widget, variable, value) {
		if (typeof value !== 'undefined') {
            rate = value * 1000;
			obj[variable] = rate;
            $(document).trigger("userpreferencesave." + widget, [variable, rate]);
		}
	};
	
	$scope.bodyIsReady = function() {
		// Send an event to the jQuery listeners on login.

	};

    /*
     * Idle timeout handling.  Set the timer on login, based on CMC Timeout value.  Turn on the timer with "watch()".
     * On logout, turn off the timer with "unwatch()".
     *  When Idle Start is reached, issue a warning.
     *  When Idle timeout is reached, log out
     *  If the user clicks or moves the mouse in the app (IdleEnd), remove the warning dialog.
     */
    $scope.$on('IdleStart', function() {

        ngDialog.open({
            dialogType:'warning',
            dialogMessage: "This session will soon timeout due to inactivity unless you click 'OK' or move your mouse in this window.",
            modelDialogId: 'idle-timeout-dialog',
            scope: $scope,
            onConfirmOkButtonClick:'onConfirmIdle()'
        });
    });

    $scope.onConfirmIdle = function() {
        $timeout(function() {
            Title.value(Page.title());
        }, 0);
        ngDialog.close('idle-timeout-dialog');
    };

    $scope.$on('IdleEnd', function() {
        $scope.onConfirmIdle();
    });

    $scope.$on('IdleTimeout', function() {
        $scope.onConfirmIdle();
        $scope.user.logout();
    });

    //
    // Provides a common validation function for nested dialogs.  The caller must provide the below <div> in the $form
    //
    //  <div id="nested-dialog-errors"><p class="summary error"></p><ul id="nested-dialog-error-list" class="errorlist"></ul></div>
    //
    $rootScope.validateNestedDialog = function($form, options) {
        var wrapper = "#nested-dialog-error-list";
        var errors = "#nested-dialog-errors";
        var dialogDefaults = {
            errorLabelContainer: wrapper,
            errorContainer: errors,
            showErrors: function (errorMap, errorList) {
                $(errors).find(".summary")
                    .html(gettext("Correct the following errors:"));
                this.defaultShowErrors();
            }
        };
        options = jQuery.extend(options, dialogDefaults);
        return $form.validate(options);
    };
}]);

/*
 * Items controlled at the global level.
 */
app.controller('AppCtrl', ['getPreferencesFactory', 'getClientFactory', 'getStorageFactory', '$scope', '$rootScope',
        '$location', 'cookiesvc', '$route', '$http', '$timeout', 'Page', 'ngDialog', 'Idle', 'localStorageService',
	function(getPreferencesFactory, getClientFactory, getStorageFactory, $scope, $rootScope,
             $location, cookiesvc, $route, $http, $timeout, Page, ngDialog, Idle, localStorageService) {

	 /*Event to handle preferences*/
	   $scope.$on("update-userPrefrence", function(event, widgetName,refreshKey) {
	 			var dataObj ={};
				var url = '/api/preferences/' + $rootScope.user.name + '/';
				var dropdownKey="#id_"+widgetName.toLowerCase()+"Refresh";
                var my_dropid= "id_"+widgetName.toLowerCase()+'Refresh';
                var dropdown_id= "[id='"+my_dropid+"']";
				dataObj[refreshKey]=$(dropdown_id).val();
		 		$http({
					   url: url, 
					   data: JSON.stringify(dataObj),
					   method: 'PUT'
					}).success(function(data, status, headers){
					//	console.log("success");
						console.log(data);
					}).error(function(response){
						console.log(response);
					}); 
	});
	
	/*
	Initializing the variable at rootScopeLevel to implement Timer and save userPreference for refresh rate
    * 1) Stores function need to be called to refresh data.
	* 2) Stores time period after refresh function need to be called
	* 3) Stores ID return by setInterval function
	* 4) Stores ID of refresh Icon
	* 5) Stores controller of Widgets
	* 6) Stores widget specific refreshKey for saving userPreference
	*/

    $rootScope.listOfFunction=[
        "$rootScope.getBackupRefereshData",
        "$rootScope.getActiveJobData",
        "$rootScope.getStorageData",
        "$rootScope.getAlertsRefereshData",
        "$rootScope.getTopForumPosts",
        "$rootScope.getDailyFeed",
        "$rootScope.getBackupCopyRefereshData",
        "$rootScope.getRecoverRefereshData",
        "$rootScope.getBackupCopyStorageRefereshData",
        "$rootScope.getBackupCopyTargetRefereshData",
        "$rootScope.getNetworkedApplianceData",
        "$rootScope.getRecoveryAssuranceData"
    ];
    $rootScope.listOfTimer=[0,0,0,0,0,0,0,0,0,0,0,0];
    $rootScope.listOfWidgetName=[
        "Backup",
        "Active Job",
        "Storage","" +
        "Alerts",
        "Post",
        "Daily Feed",
        "Backup Copy",
        "Recover Summary",
        "Backup Copy Storage",
        "Backup Copy Target",
        "Distributed Status",
        "Recovery Assurance"
    ];
    $rootScope.listOfTimerFunction=[
        "Backup",
        "Active Job",
        "Storage",
        "Alerts",
        "Post",
        "Daily Feed",
        "Backup Copy",
        "Recover Summary",
        "Backup Copy Storage",
        "Backup Copy Target",
        "Distributed Status",
        "Recovery Assurance"
    ];
    $rootScope.listOfID=[
        "[id='IDBACKUP SUMMARY']",
        "[id='IDACTIVE JOBS']",
        "[id='IDSTORAGE']",
        "[id='IDAlerts']",
        "[id='IDCOMMUNITY']",
        "[id='IDDAILY FEED']",
        "[id='IDBACKUP COPY SUMMARY - UNITRENDS']",
        "[id='IDRECOVER SUMMARY']",
        "[id='IDBACKUP COPY SUMMARY-COLD STORAGE']",
        "[id='IDBACKUP COPY - TARGET']",
        "[id='IDDISTRIBUTED STATUS']",
        "[id='IDRECOVERY ASSURANCE']"
    ];
    $rootScope.listOfController=[
        "[ng-controller=BackupWidgetContorller]",
        "[ng-controller=ActiveJobsDashCtrl]",
        "[ng-controller=storageWidgetCtrl]",
        "[ng-controller=AlertWidgetContorller]",
        "[ng-controller=TopForumPostsWidgetCtrl]",
        "[ng-controller=DailyFeedWidgetController]",
        "[ng-controller=backupCopyWidgetContorller]",
        "[ng-controller=RecoverTileContorller]",
        "[ng-controller=backupCopyWidgetStorageContorller]",
        "[ng-controller=backupCopyTargetWidgetContorller]",
        "[ng-controller=networkedAppliancesCtrl]",
        "[ng-controller=rdrWidgetController]"
    ];
    $rootScope.listOfRefreshKey=[
        "dash_backup_refresh",
        "dash_active_job_refresh",
        "dash_storage_refresh",
        "dash_alert_refresh",
        "dash_forum_posts_refresh",
        "dash_daily_feed_refresh",
        "dash_replication_refresh",
        "dash_restore_refresh",
        "dash_replication_refresh",
        "dash_replication_refresh",
        "dash_distributed_status_refresh", // just a placeholder - functionality will be added later
        "dash_recovery_assurance_refresh"
    ];

    /* Timer for refresh of Jobs Page */
    $rootScope.JobsTimer = PHD.Timer({
        namespace: "jobspage",
        interval: 0,
        refreshControl: null
    });

    /* Timer for refresh of Protect Page */
    $rootScope.ProtectTimer = PHD.Timer({
        namespace: "protectpage",
        interval: 0,
        refreshControl: null
    });

    /* Timer for refresh of Protect Page */
    $rootScope.RecoverTimer = PHD.Timer({
        namespace: "recoverpage",
        interval: 0,
        refreshControl: null
    });

    $rootScope.disableTimers = function() {
        if (!$rootScope.maintenance_mode) {
            var nTimers = $rootScope.listOfTimer.length;
            $rootScope.saveTimers = $rootScope.listOfTimer;
            for (var i = 0; i < nTimers; i++) {
                $rootScope.listOfTimer[i] = 0;
                clearInterval($rootScope.listOfTimerFunction[i]);
            }
            $rootScope.saveJobTimer = $rootScope.JobsTimer.getInterval();
            $rootScope.saveProtectTimer = $rootScope.ProtectTimer.getInterval();
            $rootScope.saveRecoverTimer = $rootScope.RecoverTimer.getInterval();
            $rootScope.JobsTimer.setInterval(0);
            $rootScope.ProtectTimer.setInterval(0);
            $rootScope.RecoverTimer.setInterval(0);
            $rootScope.maintenance_mode = true;
        }
    };

    $rootScope.enableTimers = function() {
        var nSavedTimers = $rootScope.saveTimers.length;
        var nTimers = $rootScope.listOfTimer.length;
        $rootScope.listOfTimer = $rootScope.saveTimers;
        for (var i = 0; i < nTimers && i < nSavedTimers; i++) {
            $rootScope.listOfTimer[i] = 300 * 1000;
            $rootScope.listOfTimerFunction[i] = setInterval(eval($rootScope.listOfFunction[i]), $rootScope.listOfTimer[i]);
        }
        if ($rootScope.saveJobTimer !== undefined) {
            $rootScope.JobsTimer.setInterval($rootScope.saveJobTimer);
        }
        if ($rootScope.saveProtectTimer !== undefined) {
            $rootScope.ProtectTimer.setInterval($rootScope.saveProtectTimer);
        }
        if ($rootScope.saveRecoverTimer !== undefined) {
            $rootScope.RecoverTimer.setInterval($rootScope.saveRecoverTimer);
        }
        $rootScope.maintenance_mode = false;
    };
	
	/* function to hide/show manual refresh control for widget 
	 * and also refresh widget based on time selected by user
	 * Parameters : refresh_rate and Widget Name
    */
        $rootScope.manualRefreshControl  = function(refresh_rate,widgetName){
            var index = $rootScope.listOfWidgetName.indexOf(widgetName);
            var my_id =$rootScope.listOfID[index];
            var dropDownID='#id_' +widgetName.toLowerCase() +'Refresh';
            var my_dropid= "id_"+widgetName.toLowerCase()+'Refresh';
            var dropdown_id= "[id='"+my_dropid+"']";
           
            /*check for refresh rate , if it is zero we need to show manual refresh icon
             else we need to call function for updating Widget data using setInterval method,
             whereas on change of user Preference we need to clear previous timer Function
             */
            $(dropdown_id).val(refresh_rate); // set the value of dropDown with selected value
            if (refresh_rate == 0){
                $rootScope.listOfTimer[index]=refresh_rate;
                clearInterval($rootScope.listOfTimerFunction[index]);
                if(my_id === "[id='IDCOMMUNITY']" ||
                    my_id === "[id='IDDAILY FEED']" || 
                    my_id === "[id='IDACTIVE JOBS']" || 
                    my_id === "[id='IDSTORAGE']" ||
                    my_id === "[id='IDDISTRIBUTED APPLIANCE STATUS']" ||
                    my_id === "[id='IDRECOVERY ASSURANCE']"){
                    $(my_id).css("display","inline-block");
                }
            } else {
                $(my_id).css("display","none");
                clearInterval($rootScope.listOfTimerFunction[index]);
                refresh_rate = refresh_rate * 1000;
                $rootScope.listOfTimer[index]=refresh_rate;
                $rootScope.listOfTimerFunction[index] = setInterval(eval($rootScope.listOfFunction[index]), $rootScope.listOfTimer[index]);
            }
        };

    /* show or hide user selectable refresh */
    $rootScope.userPreferencesOptionsHidden = function(widgetName) {
        return  widgetName === 'Backup' || widgetName === 'Recover Summary' ||
            widgetName === 'Backup Copy' || widgetName === 'Backup Copy Target'|| widgetName === 'Backup Copy Storage' ||
            widgetName === 'Distributed Status' || widgetName === 'Daily Feed';
    };

    /*cancel setting User Preference*/
    $rootScope.userPreferenceParentCancel = function (refresh_rate, widgetName) {
        var my_dropid= "id_"+widgetName.toLowerCase()+'Refresh';
        var dropdown_id= "[id='"+my_dropid+"']";
        $(dropdown_id).val(refresh_rate); // set the value of dropDown with the original value.
    };

	/*save User Preference*/
	$rootScope.userPreferenceParentSave = function (widgetName) {
        var index = $rootScope.listOfWidgetName.indexOf(widgetName);
        var dropDownID='#id_' +widgetName.toLowerCase() +'Refresh';
        var my_dropid= "id_"+widgetName.toLowerCase()+'Refresh';
        var dropdown_id= "[id='"+my_dropid+"']";
        var refresh_rate= parseInt($(dropdown_id).val());
        var scope = $($rootScope.listOfController[index]).scope();
        scope.toggleModal();
        $rootScope.manualRefreshControl(refresh_rate,widgetName);
        $scope.$broadcast("update-userPrefrence", widgetName,$rootScope.listOfRefreshKey[index]);
	};

	$scope.Page = Page;

        if(mktString !== ""){
            $scope.licenseType = mktString;
        }
        else{
            if(licenseClass === "PHY"){
                var line = licenseType;
                var Appliance,lineArray;
                if (strstr(line, "Unitrends DPU") && !( strstr(line, "VM-Hyper-V") ) && !( strstr(line, "VM-VMware") )) {
                    lineArray = split(" ", $line);
                    Appliance = lineArray[2];
                } else if (strstr(line, "Unitrends Recovery")) {
                    lineArray = split(" ", $line);
                    Appliance = lineArray[1];
                } else if (strstr(line, "Unitrends Small Form Factor")) {
                    lineArray = split(" ", $line);
                    Appliance = "SFF";
                } else if (strstr(line, "VM-Hyper-V")) {
                    Appliance = "Unitrends Backup (Hyper-V)";
                } else if (strstr(line, "VM-VMware")) {
                    Appliance = "Unitrends Backup (VMware)";
                }
                else{
                    Appliance = licenseType;
                }
                $scope.licenseType = Appliance;
            }
            else{
                var description = "";
                switch (licenseClass) {
                    case "UNREG":
                        description = "Unregistered";
                        break;
                    case "FREE":
                    case "CE":
                        description = "Free Edition";
                        break;
                    case "NFR":
                        description = "Not For Resale";
                        break;
                    case "TRIAL":
                        description = "Trial Edition";
                        break;
                    case "ENTRB":
                        //$description = "Enterprise Edition (per TB)";
                        description = "Enterprise Edition";
                        break;
                    case "ENTRR":
                        //$description = "Enterprise Edition (per Resource)";
                        description = "Enterprise Edition";
                        break;
                    case "PHY":
                        description = "Enterprise Edition with Physical Unit";
                        break;
                    default:
                        description = "No Description";
                        break;
                }
                $scope.licenseType = description;
            }
        }

        function strstr(input, string, bool) {  //Equivalent to strstr function in PHP
            var pos = 0;
            input += '';
            pos = input.indexOf(string);       //Index of "string" where it is found in "input"
            if (pos == -1) {
                return false;
            } else {
                if (bool) {
                    return input.substr(0, pos);    //if bool = true send substring from start of "input" to first occurrence of "string".
                } else {
                    return input.slice(pos);    //If bool = false return substring from "pos" to the end of "input"
                }
            }
        }

    // lmc - TODO - commenting out until timers cleaned up, as this causes multiple instances.
	//$route.reload();
	
	// Initialize navigation to expanded.
	// lmc - TODO load from user preferences.
	cookiesvc.put('nav', 'nav-expanded');
	var navExpanded = {
			cookieNav: 'nav-expanded',
			arrowNav: 'icon-arrowleft',
			navTitle: 'Collapse Left Navigation'
	};
	var navCollapsed = {
			cookieNav: 'nav-collapsed',
			arrowNav: 'icon-arrowright',
			navTitle: 'Expand Left Navigation'
	};

	// set default view, overridden by user preference.
	$scope.navbar = navExpanded;

	$scope.showSelected = function(selectedItem) {
	    var currentLocation = $location.path().substring(1) || 'dynamic-dashboard';
	    return (currentLocation.indexOf(selectedItem) !== -1) ? 'selected' : '';
	};
	
	/*
	 * Send an event to the rest of the system when a subsystem is selected.
	  */
	$scope.selectNav = function(selectedItem) {
		var e = $.Event('uinav.' + selectedItem);
		$(document).trigger(e);
	};
	
	/*
	 * Collapse or exapand the menu/navigation on the left-hand-side.
	  */
	$scope.toggleNav = function() {
		if ($scope.navbar.cookieNav == 'nav-expanded') {
			$scope.navbar = navCollapsed;
		} else if ($scope.cookieNav = 'nav-collapsed') {
			$scope.navbar = navExpanded;
		}
        cookiesvc.put('nav', $scope.navbar.cookieNav);
	};


    // Login the user, passing in credentials, autologin, or from the cookie store (if remember_me).
    $rootScope.loginUser = function(username, password, auto, remember) {
        var redirectToDash = false;
        var autologin = auto || false;
        var remember_me = remember || false;

        if (username === undefined || password === undefined) {
            if (remember_me) {
                $scope.credentials.username = cookiesvc.get("username");
                $scope.credentials.password = cookiesvc.get("password");
            } else {
                return;
            }
        }  else {
            $scope.credentials.username = username;
            $scope.credentials.password = password;
        }

        var load;
        if (!autologin) {
            $loginButton = $("#login-button");
            load = window.PHD.showLoadingIndicator($loginButton, false);
        }

        $http.post('/api/login', $scope.credentials)
            .success(function(data, status, headers) {

                $rootScope.user.name = $scope.credentials.username;
                $rootScope.user.id = data.id;
                $rootScope.user.superuser = data.superuser;
                $rootScope.user.administrator = data.administrator;
                $rootScope.user.monitor = data.monitor;
                $rootScope.user.ad_user = data.ad_user;
                cookiesvc.put('uid', data.id);
                cookiesvc.put('superuser', data.superuser);
                cookiesvc.put('administrator', data.administrator);
                cookiesvc.put('monitor', data.monitor);
                cookiesvc.put('username', $scope.credentials.username);

                // Role information for role-based access.
                cookiesvc.put('role_name', data.role_name);
                $rootScope.user.role_name = data.role_name;
                cookiesvc.put('role_scope', data.role_scope);
                $rootScope.user.role_scope = data.role_scope;
                cookiesvc.put('role_recover_options', data.role_recover_options);
                $rootScope.user.role_recover_options = data.role_recover_options;

                // Based on role, disable major subsystems.
                $rootScope.backupDisabled = $rootScope.checkRole($rootScope.user.role_name, 'backup');
                $rootScope.configureDisabled = $rootScope.checkRole($rootScope.user.role_name, 'configure');
                $rootScope.recoverDisabled = $rootScope.checkRole($rootScope.user.role_name, 'recover');

                //$rootScope.user.loggedIn = true;  // set loggin flag

                // See if we should remember or clear the credentials.
                if (remember_me) {
                    cookiesvc.put('password', $scope.credentials.password);
                    cookiesvc.put('remember_me', true);
                } else {
                    cookiesvc.remove('password');
                    cookiesvc.remove('remember_me');
                }

                var showUIUpdate = $rootScope.checkAndUpdateVersion();

                // set the default headers for the $http service.
                $http.defaults.headers.common['AuthToken'] = data.auth_token;
                cookiesvc.put('token', data.auth_token);

                // get this user's preferences
                getPreferencesFactory.async($scope,$rootScope,cookiesvc).then(function(result) {
                    var data = result.data.data[0];

                    //For QuickStartWizard Flag
                    $rootScope.user.loggedIn = true;  // set loggin flag
                    // clear the logged in status on the login page
                    if (!autologin) {
                        window.PHD.hideLoadingIndicator(load);
                    }

                    $rootScope.passwd = $scope.credentials.password; // setting current password to root variable for quick start wizard.

                    $scope.setPreferences(result, false);

                    // On login, check screen resolution vs the supported minimum and display message if low and the user has not suppressed it.
                    var MIN_SUPPORTED_WIDTH = 1280;
                    var MIN_SUPPORTED_HEIGHT = 1024;
                    var height = screen.height;
                    var width = screen.width;
                    // Whether or not to show the low-resolution warning, through preferences.
                    var show_resolution_warning = (data.show_resolution_warning !== undefined) ? data.show_resolution_warning === 'true' : true;
                    if (show_resolution_warning &&
                        width !== undefined && height !== undefined && (width < MIN_SUPPORTED_WIDTH || height < MIN_SUPPORTED_HEIGHT)) {
                        ngDialog.open({
                            template: 'app/resolution/resolution-warning.html',
                            scope: $scope,
                            data: {width: width, height: height },
                            overlay:true,
                            modelDialogId: 'resolution-warning-dialog',
                            ngDialogStyle:'width:600px; height:200px;',
                            closeByDocument: false,
                            closeByEscape: true
                        });
                    }

                    var show_release_notes = false;

                    if (data.show_eula === "true" || data.show_setup_wizard === "true"){
                        show_release_notes = false;
                    } else {
                        show_release_notes = (data.show_release_notes !== undefined) ? data.show_release_notes === 'true' : true;
                    }

                    if (show_release_notes) {
                        var version = PHD.Ajax.get("/api/systems/details");
                        version.done(function(data) {
                            $scope.version = data.appliance.version;
                        });
                        $timeout(function() {
                            // add a slight delay in case the screen resolution dialog is open (ngDialog needs this).
                            // increase height if French as features and warnings in the dialog are more verbose.
                            var dialogHeight = $rootScope.userLanguageCode === 'fr' ? '350px' : '325px';
                            ngDialog.open({
                                template: 'app/release-notes/release-notes.html',
                                scope: $scope,
                                overlay:true,
                                modelDialogId: 'release-notes-dialog',
                                ngDialogStyle:'width:670px; height:' + dialogHeight,
                                closeByDocument: false,
                                closeByEscape: true
                            });
                        }, 500);
                    } else if (showUIUpdate) {
                        $timeout(function() {
                            // add a slight delay in case the screen resolution dialog is open (ngDialog needs this).
                            ngDialog.open({
                                template: 'app/configure/updates/ui_update_detected.html',
                                scope: $scope,
                                overlay: true,
                                modelDialogId: 'update-detected-dialog',
                                ngDialogStyle: 'width:600px; height:200px;',
                                closeByDocument: false,
                                closeByEscape: true
                            });
                        }, 500);
                    }
                });

                // get tour settings on login.
                getClientFactory.async($scope,$rootScope).then(function(result) {
                    $scope.tourClients = result.data.data.length;
                    // There must be assets to create a job.
                    $rootScope.tourBackupDisabled = !($scope.tourClients >=1);
                });

                getStorageFactory.async($scope, $rootScope).then(function(result){
                    var storage = result.data.storage;
                    // Stateless storage must be configured before adding assets.
                    $rootScope.tourHostDisabled = (storage.usage == "stateless" && storage.stateless_type === null);
                });

                // Send an event to the jQuery listeners on login.
                var e = $.Event('login');
                e.name = $scope.user.name;
                e.token = data.auth_token;
                e.version = '9.0';
                // Not great practice, but this is timing between Angular and Ajax calls.
                // We must set rootScope first so that global_user will be set in PHD ajax calls.
                $rootScope.user.token = e.token;
                $(document).trigger(e);

            })
            .error(function(data, status, headers) {
                if (!autologin) {
                    // Remove the loading indicator and tap into PHD.throwError function here.
                    window.PHD.hideLoadingIndicator(load);
                    window.PHD.throwError(data);
                }
            })
    };

    $scope.setPreferences = function(result, isRefresh) {
        var data = result.data.data[0];
        var isRefresh = isRefresh || false;

        // For the setup wizard, check the user preference, and override with the global flag if set.
        var flag = data.show_setup_wizard;
        if (flag === "false" || $rootScope.globalPreference.showSetupWizard === false){
            $rootScope.user.showSetupWizFlag = false;
            $rootScope.globalPreference.showSetupWizard = false;
            $rootScope.showMoveDatabase = true;
            if (!isRefresh) {
                // if a refresh, don't need the extra reload.
                var apppage = angular.element(document.getElementById("app"));
                var injector = apppage.injector();
                var route = injector.get('$route');
                route.reload();
            }
        }else{
            $rootScope.user.showSetupWizFlag = true;
            $rootScope.user.showMoveDatabase = false;
        }
        // For the EULA, check the user preference, and override with the global flag if set.
        var eulaFlag = data.show_eula;
        $rootScope.eulaFlag = eulaFlag;
        if (eulaFlag === "false" || $rootScope.globalPreference.showEULA === false){
            $rootScope.user.eulaWizardFlag = false;
        }else{
            $rootScope.user.eulaWizardFlag = true;
        }

        // For Tour Flag
        var tourFlag = data.show_help_overlay;
        if (tourFlag === "false" || $rootScope.globalPreference.showTour === false) {
            $rootScope.user.showTour = false;
        } else {
            $rootScope.user.showTour = true;
        }
        //Set current tour step
        $rootScope.user.tourStep = 1;

        if($rootScope.user.showSetupWizFlag){
            $rootScope.loadDateTimeWizardData();
        }

        // update the language to be used based on user preference.
        $rootScope.userLanguageCode = (data.language !== undefined) ? data.language : 'en';
        $rootScope.$broadcast("update-language", $rootScope.userLanguageCode);

        $rootScope.setIfDefined($scope.Preferences, "backupwidget", "dash_backup_refresh", data.dash_backup_refresh);
        $rootScope.setIfDefined($scope.Preferences, "alertswidget", "dash_alert_refresh", data.dash_alert_refresh);
        $rootScope.setIfDefined($scope.Preferences, "replicationwidget", "dash_replication_refresh", data.dash_replication_refresh);
        $rootScope.setIfDefined($scope.Preferences, "recoverwidget", "dash_restore_refresh", data.dash_restore_refresh);
        $rootScope.setIfDefined($scope.Preferences, "activejobswidget", "dash_active_job_refresh", data.dash_active_job_refresh);
        $rootScope.setIfDefined($scope.Preferences, "storagewidget", "dash_storage_refresh", data.dash_storage_refresh);
        $rootScope.setIfDefined($scope.Preferences, "jobspage", "page_jobs_refresh", data.page_jobs_refresh);
        $rootScope.setIfDefined($scope.Preferences, "recoveryassurancewidget", "dash_recovery_assurance_refresh", data.dash_recovery_assurance_refresh);

        var FIVE_MINUTES = 5 * 60 * 1000;

        refreshRates.dash_backup_refresh = $scope.Preferences.dash_backup_refresh;
        refreshRates.dash_replication_refresh = $scope.Preferences.dash_replication_refresh;
        refreshRates.dash_restore_refresh = $scope.Preferences.dash_restore_refresh;
        refreshRates.dash_active_job_refresh = $scope.Preferences.dash_active_job_refresh;
        refreshRates.dash_alert_refresh = $scope.Preferences.dash_alert_refresh;
        refreshRates.dash_storage_refresh = $scope.Preferences.dash_storage_refresh;
        refreshRates.page_jobs_refresh = $scope.Preferences.page_jobs_refresh;
        refreshRates.dash_recovery_assurance_refresh = $scope.Preferences.dash_recovery_assurance_refresh;
        $rootScope.listOfTimer[0] = data.dash_backup_refresh !== undefined ? data.dash_backup_refresh * 1000 : refreshRates.dash_backup_refresh;
        $rootScope.listOfTimer[1] = data.dash_active_job_refresh !== undefined ? data.dash_active_job_refresh * 1000 : refreshRates.dash_active_job_refresh;
        $rootScope.listOfTimer[2] = data.dash_storage_refresh !== undefined ? data.dash_storage_refresh * 1000 : refreshRates.dash_storage_refresh;
        $rootScope.listOfTimer[3] = data.dash_alert_refresh !== undefined ? data.dash_alert_refresh * 1000 : refreshRates.dash_alert_refresh;
        $rootScope.listOfTimer[4] = data.dash_forum_posts_refresh !== undefined ? data.dash_forum_posts_refresh * 1000 : FIVE_MINUTES;
        $rootScope.listOfTimer[5] = data.dash_daily_feed_refresh !== undefined ? data.dash_daily_feed_refresh * 1000 : FIVE_MINUTES;
        $rootScope.listOfTimer[6] = data.dash_replication_refresh !== undefined ? data.dash_replication_refresh * 1000 : refreshRates.dash_replication_refresh;
        $rootScope.listOfTimer[7] = data.dash_restore_refresh !== undefined ? data.dash_restore_refresh * 1000 : refreshRates.dash_restore_refresh;
        $rootScope.listOfTimer[8] = data.dash_replication_refresh !== undefined ? data.dash_replication_refresh * 1000 : refreshRates.dash_replication_refresh;
        $rootScope.listOfTimer[9] = data.dash_replication_refresh !== undefined ? data.dash_replication_refresh * 1000 : refreshRates.dash_replication_refresh;
        $rootScope.listOfTimer[10] = data.dash_replication_refresh !== undefined ? data.dash_replication_refresh * 1000 : refreshRates.dash_replication_refresh; // needs to be worked on for distributed status widget
        $rootScope.listOfTimer[11] = data.dash_recovery_assurance_refresh !== undefined ? data.dash_recovery_assurance_refresh * 1000 : refreshRates.dash_recovery_assurance_refresh;
        if (isRefresh) {
            for (var i = 0; i <= 8; i++) {
                var widgetName = $rootScope.listOfWidgetName[i];
                $rootScope.manualRefreshControl($rootScope.listOfTimer[i]/1000,widgetName);
            }
        }
        var jobsRefresh = data.page_jobs_refresh !== undefined ? data.page_jobs_refresh : refreshRates.page_jobs_refresh;
        $rootScope.JobsTimer.setInterval(jobsRefresh * 1000);
        var protectRefresh = data.page_protect_refresh !== undefined ? data.page_protect_refresh : refreshRates.page_jobs_refresh;
        $rootScope.ProtectTimer.setInterval(protectRefresh * 1000);
        var restoreRefresh = data.page_restore_refresh !== undefined ? data.page_restore_refresh : refreshRates.page_restore_refresh;
        $rootScope.RecoverTimer.setInterval(restoreRefresh * 1000);

        if($rootScope.user.showSetupWizFlag == false) {
            // remember subsystem the user was in last.
            if (cookiesvc.get('Page') !== undefined) {
                var Page = cookiesvc.get('Page');
                var lower_Page = Page.toLowerCase();
                // Redirect if not the dashboard.
                if (lower_Page != "dashboard") {
                    var re = /reports\/\d+\/\d+\/\d+$/;
                    // And, redirect if not a direct -report URL from dashboard.
                    if (!location.href.match(re)) {
                        re = /configure\/[a]?\d+\/[a-z]+\/\d+$/;
                        if (!location.href.match(re)) {
                            // And, redirect if not a direct -configure URL from dashboard.
                            location.href = "#/" + lower_Page;
                        }
                    }
                }
            }
        } else {
            $scope.disableTimers();
        }

        /*
         * If the idle timer is set in master.ini, use it.  Otherwise, turn off the timer.
         */
        var logoutTimer = data.timeout;
        if (($rootScope.user.showSetupWizFlag == false) && logoutTimer !== undefined && parseInt(logoutTimer) > 0) {
            Idle.setIdle(parseInt(logoutTimer) * 60);
            Idle.setTimeout(30);    // An additional 30 seconds once the warning is displayed 'til logout.
            Idle.watch();
        } else {
            Idle.unwatch();
        }

        // initialize nav groups based on preferences.
        $rootScope.showNavGroups = data['ShowGroups'] == "true";

        // Initialize user theme.
        $rootScope.userApplicationTheme = (data.application_theme !== undefined) ? data.application_theme : 'theme-blue';

        // If there are no filters defined, create the default one for 1 day of backups.
        var defaultCatalogFilters = [{
            'name': 'Today',
            'is_default': true,
            'options': {
                'range': 0,
                'appliance': $rootScope.local.name,
                'types': [
                    'backup',
                    'imported'
                ]
            }
        }];
        $rootScope.catalogFilters = (data.catalog_filter !== undefined) ? JSON.parse(data.catalog_filter) : defaultCatalogFilters;
        localStorageService.set('catalogFilters', $rootScope.catalogFilters);

        /* Triggering Event once user has logged-in
         * $rootScope.$broadcast is used as there is no parent-child relation
         * between login and alert module
         */
        $timeout(function() {
            $rootScope.$broadcast("logged-in");
        }, 1000);
    };

    $scope.editUserAccount = function() {
        var scope = $scope;
        var username = scope.user.name;
        var user_privilege = scope.user.administrator ? "administrator" : scope.user.monitor ? "monitor" : scope.user.superuser ? "superuser" : "manage";
        var user_role = scope.user.role_name !== undefined ? scope.user.role_name : "none";

        ngDialog.open({
            template: 'app/configure/users/edit.html',
            scope: $scope,
            data: {username: username, user_privilege: user_privilege, user_role: user_role, user_id:scope.user.id },
            overlay:true,
            modelDialogId: 'user-account-dialog',
            name: 'user-account-dialog',
            ngDialogStyle:'width:460px; height:420px;',
            closeByDocument: false,
            closeByEscape: true
        });
    };

    angular.element(document).ready(function() {
        if ($rootScope.user.loggedIn) {
            // get this user's preferences
            var getPreferences = function() {
                getPreferencesFactory.async($scope,$rootScope,cookiesvc).then(function(result) {
                    $scope.setPreferences(result, true)
                });
            };
            getPreferences();

            // get tour settings on refresh.
            getClientFactory.async($scope,$rootScope).then(function(result) {
                $scope.tourClients = result.data.data.length;
                // There must be assets to create a job.
                $rootScope.tourBackupDisabled = !($scope.tourClients >=1);
            });

            getStorageFactory.async($scope, $rootScope).then(function(result){
                var storage = result.data.storage;
                // Stateless storage must be configured before adding assets.
                $rootScope.tourHostDisabled = (storage.usage == "stateless" && storage.stateless_type === null);
            });
        } else {
            var autologin = cookiesvc.get('autologin');
            if (autologin == undefined || $rootScope.globalPreference.showSetupWizard) {
                $http.get("app/login/autologin.json").success(function (data) {
                    autologin = data.autologin;
                    cookiesvc.put('autologin', autologin);
                    if (autologin) {
                      $rootScope.loginUser(DEFAULT_USER, DEFAULT_PW, true, false);
                    }
                });
            } else if (autologin) {

                $rootScope.loginUser(DEFAULT_USER, DEFAULT_PW, true, false);
            } else {
                var remember_me = cookiesvc.get('remember_me');
                if (remember_me) {
                  $rootScope.loginUser(undefined, undefined, false, true);
                }
            }
        }
    });
}]);

app.config(function($routeProvider, $analyticsProvider) {
	$routeProvider.when('/', {
        templateUrl: "app/dynamic-dashboard/dynamicDashboard.html",
        controller: 'DynamicDashboardController'
	})
	.when('/protect', {
		templateUrl: "app/protect/protect.html",
		controller: 'ProtectCtrl',
        resolve: {
		    factory: roleRoutingHandler
        }
	})
	.when('/recover', {
		templateUrl: "app/recover/recover.html",
		controller: 'RecoverCtrl',
        resolve: {
            factory: roleRoutingHandler
        }
	})
	.when('/jobs', {
		templateUrl: "app/jobs/jobs.html",
		controller: 'JobsCtrl'
	})
	.when('/reports', {
		templateUrl: "app/reports/reports.html",
		controller: 'ReportsCtrl'
	})
	.when('/configure', {
		templateUrl: "app/configure/configure.html",
		controller: 'ConfigCtrl',
        resolve: {
            factory: roleRoutingHandler
        }
	})
	.when('/reports/:id/:days/:sid', {
		templateUrl: "app/reports/reports.html",
		controller: 'ReportsCtrl'
	})
    .when('/configure/:id/:usage/:sid', {
        templateUrl: "app/configure/configure.html",
        controller: 'ConfigCtrl',
        resolve: {
            factory: roleRoutingHandler
        }
    })
	.otherwise({ redirectTo: '/' });
});

/*
 * Checks the incoming route to see if it should be allowed or not.
 * Returns true if so and false if not (and redirects to main page).
 */
var roleRoutingHandler = function($rootScope, $location) {
    var locationPath = $location.path();
    var ret = true;
    if (($rootScope.configureDisabled && (locationPath.indexOf('/configure') !== -1)) ||
        ($rootScope.backupDisabled && (locationPath.indexOf('/protect') !== -1)) ||
        ($rootScope.recoverDisabled && (locationPath.indexOf('/recover') !== -1))) {
        $location.path('/');
        ret = false;
    }
    return ret;
};

/*
 * Configure the local storage, setting the prefix based on the port.
 * If a non-standard port, add it to the prefix so the values will not be shared between different sessions.
 */
app.config(function (localStorageServiceProvider) {
    localStorageServiceProvider.setDefaultToCookie(false);
});

app.run(function(localStorageService, $location) {
    function createPrefix(key) {
        var port = parseInt($location.port());
        if (port !== 80 && port !== 443) {
            // If not a standard port, add it to the key.
            key = String(port) + '.' + key;
        }
        return key;
    }
    localStorageService
        .setPrefix(createPrefix('satori.'))
});

app.factory('getPreferencesFactory', function($http) {
    return {
        async: function($scope, $rootScope, cookiesvc) {
            var DEFAULT_REFRESH = 5000;
            $scope.Preferences = {};
            pref = $scope.Preferences;
            pref.dash_backup_refresh = DEFAULT_REFRESH;
            pref.dash_replication_refresh = DEFAULT_REFRESH;
            pref.dash_restore_refresh = DEFAULT_REFRESH;
            pref.dash_active_job_refresh = DEFAULT_REFRESH;
            pref.dash_alert_refresh = DEFAULT_REFRESH;
            pref.dash_storage_refresh = DEFAULT_REFRESH;
            pref.page_protect_refresh = DEFAULT_REFRESH;
            pref.page_restore_refresh = DEFAULT_REFRESH;
            pref.page_jobs_refresh = DEFAULT_REFRESH;
            pref.dash_recovery_assurance_refresh = DEFAULT_REFRESH;

            $url = '/api/preferences/' + $scope.user.name + '/';
            var promise = $http({
                method: 'GET',
                url: $url
            }).success(function(data, status, headers) {
                // per the JSON returned, get the first array element.

            }).error(function(data, status, headers) {
                if ($rootScope.user.showSetupWizFlag || $rootScope.globalPreference.showSetupWizard) {
                    // If in Quick Setup - retry once for an expired token unless autologin is off.
                    var autologin =  cookiesvc.get('autologin');
                    if (autologin !== false) {
                        // Retry only once; prevents an endless loop in case of another error.
                        cookiesvc.put('autologin', false);
                        $rootScope.loginUser(DEFAULT_USER, DEFAULT_PW, true, false);
                    } else {
                        window.PHD.throwError(data);
                    }
                } else {
                    window.PHD.throwError(data);                   
                }
            });
            return promise;
        }
    };
});

app.factory('getClientFactory', function($http) {
    return {
        async: function($scope, $rootScope) {
            $scope.tourClients = 0;
            $url = '/api/clients/';
            var promise = $http({
                method: 'GET',
                url: $url
            }).success(function (data, status, headers) {

            }).error(function (data, status, headers) {

            });
            return promise;
        }
    };
});

app.factory('getStorageFactory', function($http) {
    return {
        async: function($scope, $rootScope) {
            $url = '/api/storage/1/?sid=1';
            var promise = $http({
                method: 'GET',
                url: $url
            }).success(function (data, status, headers) {

            }).error(function (data, status, headers) {

            });
            return promise;
        }
    };
});

app.directive('ngElementReady', [function() {
	return {
		priority: -1000,
		restrict: "A",
		link: function(scope, element, attributes) {
			scope.$eval(attributes.ngElementReady);
		}
	}
}]);
