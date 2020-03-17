var editApplianceApp = angular.module('edit-appliance-module', []);

editApplianceApp.controller('EditApplianceCtrl', ['$scope', '$rootScope', '$http', '$analytics',
    function($scope, $rootScope, $http, $analytics) {

        $scope.totalIncludes  = 7; //The total number of includes you have
        $scope.tabsLoaded = false;
        $scope.$on('$includeContentLoaded', function(event, url) {
            // Only process appliance page once.  Otherwise, it is processed for EVERY included file.
            // We could look for first URL loaded, but in case it changes, instead we use a global flag to load once.
            if (!$scope.tabsLoaded) {
                $scope.tabsLoaded = true;
                processEditApplianceDialog(PHD, window, $rootScope, $scope, $analytics);
            }
        });

        function processEditApplianceDialog(PHD, window, $rootScope, $scope, $analytics) {
            var tabs = [],
                initialTab = 0,
                currentTabIndex = 0,
                getCurrentTabData = {},
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false,
                isTabsActivateAfterConfirm = (typeof(isTabsActivateAfterConfirm) != 'undefined') ? isTabsActivateAfterConfirm : false,
                iscanceltabaway = (typeof(iscanceltabaway) != 'undefined') ? iscanceltabaway : false,
                isMailRecipentAdd = false;
            var slugs = ['general', 'email', 'users', 'datetime', 'license', 'backupcopy', 'advanced'];

            var GENERAL_INDEX = 0, EMAIL_INDEX = 1, USERS_INDEX = 2, DATE_TIME_INDEX = 3, LICENSE_INDEX = 4,
                BACKUP_COPY_INDEX = 5, ADVANCED_INDEX = 6;

            function initForm() {

                if (selectedAppliance.local === false && (selectedAppliance.role === "Non-Managed Replication Source" || selectedAppliance.role === "Managed DPU")) {
                    $("li[aria-controls='config-advanced-backupcopy']").css("display", "none");
                }

                if (selectedAppliance.local === false) {
                    $("li[aria-controls='config-users']").css("display", "none");
                }

                if (isCE) {
                    $("li[aria-controls='config-license-edit']").css("display", "none");
                }
            }

            var EditTab = function (index, panel, slug) {
                this.index = index;
                this.$panel = panel;
                this.$table = this.$panel.find(".active-table");
                this.$buttons = this.$panel.find(".button-bar");

                switch (index) {
                    case GENERAL_INDEX:
                        this.$form = $("#form-add-appliance");
                        break;
                    case EMAIL_INDEX:
                        this.$form = $("#email-edit-form");
                        break;
                    case DATE_TIME_INDEX:
                        this.$form = $("#form-datetime-appliance");
                        break;
                    case ADVANCED_INDEX:
                        this.$form = $("#encryption-edit-form");
                        break;
                    case BACKUP_COPY_INDEX:
                        this.$form = $("#form-advanced-backupcopy");
                        break;
                    case LICENSE_INDEX:
                        this.$form = $("#license-edit-form");
                        break;
                    case USERS_INDEX:
                        this.$form = $("#users-edit-form");
                        break;
                    default:
                        break;
                }
            };

            EditTab.prototype.init = function () {
                var self = this;
                return this;
            };


            EditTab.prototype.activate = function () {
                this.isActive = true;

        $("form").find(".error").removeClass("error");
        $("form").find("input").attr("aria-required",false);
        $("form").find("#dialog-errors").css("display","none");
        $("form").find("#dialog-error-list").empty();
        $("form").find(".summary").addClass("error");


        if (currentTabIndex == GENERAL_INDEX) {
            var respHostname = PHD.Ajax.get("/api/hostname/?sid=" + PHD.appliance_sid);
            var loadGeneralData = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
            respHostname.done(function (data){
                if (data !== undefined) {
                    obj = data.data;
                    getCurrentTabData = obj;
                    if (obj.system_id == PHD.appliance_sid) {
                        $("#id_name").val(obj.name);
                        $("#id_ip").val(selectedAppliance.host);
                        $("#edit_object_id").text(selectedAppliance.id);
                        $("#id_longname").val(obj.long_name);
                        if(selectedAppliance.local){
                            $('#id_name').removeAttr('disabled');
                            $('#id_longname').removeAttr('disabled');
                            $('#id_ip').removeAttr('disabled');
                        }else{
                            $('#id_name').attr('disabled','disabled');
                            $('#id_longname').attr('disabled','disabled');
                            $('#id_ip').attr('disabled','disabled');
                        }

                    }
                }
                PHD.hideLoadingIndicator(loadGeneralData);
            })

        } else if (currentTabIndex == EMAIL_INDEX) {
            var loadEmailData = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
            var resp = PHD.Ajax.get("/api/mail-config/?sid=" + PHD.appliance_sid, loadEmailData);
            resp.done(function (data) {
                data = data.data;
                getCurrentTabData = data;
				backAuthInfo = data.authinfo;
				backUser = data.user;
				backSmtp = data.smtp;
                if (data.smtp !== undefined) {
                    $("#id_email_host").val(data.smtp);
                    $("#id_send_email").prop('checked', true);
                    $("#id_email_host").prop('disabled', false);
                      
                }
                if (data.authinfo !== undefined) {
                    $("#id_server_requires_credentials").prop('checked', data.authinfo);

                            if (data.authinfo == true) {
                                $("#id_email_host_user").prop('disabled', false);
                                $("#id_email_host_password").prop('disabled', false);
                                $("#id_email_host_user").val(data.user);
                            }
                        }
                        var mail = new Array();
                        if (data.schedule !== undefined && data.schedule !== "") {
                            var scheduleRecipients = data.schedule.split(" ");
                            angular.forEach(scheduleRecipients, function (scheduleRecipient, key) {
                                var fetchedRecipient = null;
                                for (var i = 0; i < mail.length; i++) {
                                    if (mail[i].email === scheduleRecipient) {
                                        fetchedRecipient = mail[i];
                                        break;
                                    }
                                }
                                if (fetchedRecipient != null) {
                                    fetchedRecipient.jobs = true;
                                } else {
                                    fetchedRecipient = {
                                        email: scheduleRecipient,
                                        system: false,
                                        jobs: true,
                                        failures: false
                                    };

                                    mail.push(fetchedRecipient);
                                }
                            });
                        }
                        if (data.bp !== undefined && data.bp !== "") {
                            var bpRecipients = data.bp.split(" ");
                            angular.forEach(bpRecipients, function (bpRecipient, key) {
                                var fetchedRecipient = null;
                                for (var i = 0; i < mail.length; i++) {
                                    if (mail[i].email === bpRecipient) {
                                        fetchedRecipient = mail[i];
                                        break;
                                    }
                                }
                                if (fetchedRecipient != null) {
                                    fetchedRecipient.system = true;
                                } else {
                                    fetchedRecipient = {
                                        email: bpRecipient,
                                        system: true,
                                        jobs: false,
                                        failures: false
                                    };
                                    mail.push(fetchedRecipient);
                                }
                            });
                        }
                        if (data.failure !== undefined && data.failure !== "") {
                            var failureRecipients = data.failure.split(" ");
                            angular.forEach(failureRecipients, function (failureRecipient, key) {
                                var fetchedRecipient = null;
                                for (var i = 0; i < mail.length; i++) {
                                    if (mail[i].email === failureRecipient) {
                                        fetchedRecipient = mail[i];
                                        break;
                                    }
                                }
                                if (fetchedRecipient != null) {
                                    fetchedRecipient.failures = true;
                                } else {
                                    fetchedRecipient = {
                                        email: failureRecipient,
                                        system: false,
                                        jobs: false,
                                        failures: true
                                    };
                                    mail.push(fetchedRecipient);
                                }
                            });
                        }

                // Get the recipient list.
                var recipients = $("#email-reporting-table tbody tr");
                // recipients of 1 is the first row or header/okay to go into the
                // "if" again as the add-recipient button won't be clicked.
                // isMailRecipentAdd was being set to true and never cleared.
                // old check
                //if(!isMailRecipentAdd){
                // new test.
                if (recipients.length <= 1){

                    for(var i =0; i<mail.length;i++){

                                var id = "[name='mail[" + i + "].email']";
                                $(id).val(mail[i].email);
                                $("[name='mail[" + i + "].system']").prop('checked', mail[i].system);
                                $("[name='mail[" + i + "].jobs']").prop('checked', mail[i].jobs);
                                $("[name='mail[" + i + "].failures']").prop('checked', mail[i].failures);

                        // $(".btn-add-recipient").click();   
                        if((i+1) < mail.length){
                            $(".btn-add-recipient").click();   
                        }
                    }
                    isMailRecipentAdd = true;
                    PHD.hideLoadingIndicator(loadEmailData);
                }
            })
        }else if (currentTabIndex == DATE_TIME_INDEX) {
            var resp = PHD.Ajax.get("/api/date-time/?sid=" + PHD.appliance_sid);
            
            var timezoneresponse = PHD.Ajax.get("/api/date-time/timezones/");
            var loadDatetimeData = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
            /* Set timezone combo box data. */
            timezoneresponse.done(function (data){
                $.each(data.timezone, function(id,timezone){
                    $("#appliance_timezone").append('<option id="' + id + '" value="' + timezone + '">' + timezone + '</option>');
                })
            })
            
            /* Set appliance date time data */
            resp.done(function (data) {
                if (data !== undefined) {
                    var appdate = data.month + "/" + data.day + "/" + data.year;
                    var hour = timeFormat(data.hour.toString());
                    var min = timeFormat(data.minute.toString());
                    var sec = timeFormat(data.second.toString());
                    var apptime = hour + ":" + min + ":" + sec;
                     getCurrentTabData = data;
                    
                    $("#appliance_date").val(appdate);
                    $("#appliance_time").val(apptime);
                    $("#appliance_timezone").val(data.tz);
                    
                    $("#ntpTable tr").remove();
                    if((data.ntp !== undefined) && (data.ntp.servers.length > 0)){
                         var table = $("#ntpTable")[0];
                         var ntpServerName;
                         
                         for(var i = 0; i < data.ntp.servers.length; i++){
                            if((data.ntp.servers[i] != "") && (typeof(data.ntp.servers[i]) != undefined)){
                                ntpServerName = data.ntp.servers[i];
                            }
                            
                            var rowCount = table.rows.length;
                            var row = table.insertRow(rowCount);
                            var cell1 = row.insertCell(0);
                            cell1.innerHTML= ntpServerName;

                                    var cell2 = row.insertCell(1);
                                    cell2.innerHTML = '<span class="btn-remove-recipient" style="float:right;padding-right:10px;"><i title="Remove" onclick="deleteNtpServer(this)" class="icon-removesign"></i></span>';
                                }

                                $("#id_addNtpServerAddress").val("");
                            }

                    if(data.ntp.enabled){
                        $('#app_ntpserver_radioselection').prop('checked','true');
                        $('#datechangediv .ui-datepicker-trigger').attr('disabled','disabled');
                        $('#appliance_date').attr('disabled','disabled');
                        $('#appliance_time').attr('disabled','disabled');
                        $('#appliance_timezone').attr('disabled','disabled');
                        $('#divAddNtpServer *').removeAttr('disabled');
                        $('#divNtpServerTable').find('*').removeAttr('disabled');
                        $('#ntpTable').find('i').addClass('icon-removesign');
                    }else{
                        $('#app_datetime_radioselection').prop('checked','true');
                        $('#appliance_date').removeAttr('disabled');
                        $('#datechangediv .ui-datepicker-trigger').removeAttr('disabled');
                        $('#appliance_time').removeAttr('disabled');
                        $('#appliance_timezone').removeAttr('disabled');
                        $('#divAddNtpServer *').attr('disabled','disabled');
                        //$('#ntpTable').attr('disabled','disabled');
                        $('#divNtpServerTable').find('*').attr('disabled', 'disabled');
                        $('#ntpTable').find('i').removeClass('icon-removesign');
                    }
                }
                
                PHD.hideLoadingIndicator(loadDatetimeData);
            })
        } else if (currentTabIndex == ADVANCED_INDEX) {
            var resp = PHD.Ajax.get("/api/encryption/support/?sid=" + PHD.appliance_sid);
            var loadAdvanceData = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
            resp.done(function (data) {
                if (data.data !== undefined && data.data[0] !== undefined) {
                    data = data.data[0];
                    if(data.EncryptionSupported == 1){
                        var resp1 = PHD.Ajax.get("/api/encryption/?sid=" + PHD.appliance_sid);
                        var loadAdvanceData1 = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
                        resp1.done(function (data) {
                            if (data.data !== undefined && data.data[0] !== undefined) {
                                data = data.data[0];
                                getCurrentTabData = data;
                                if (data.has_passphrase == true) {
                                    console.log("Has Passphrase");
                                    if(data.state != "off") {
                                        $('#id_enable_encryption').prop('checked', true);
                                        $('#id_current_passphrase').prop('disabled', false);
                                        $("#id_change_passphrase").prop('disabled', false);
                                    }
                                    $("#encryption_passphrase_not_set").hide();
                                    $("#encryption_passphrase_set").show();
                                } else {
                                    $('#id_enable_encryption').prop('checked', false);
                                    $('#id_confirm_passphrase').prop('disabled', true);
                                    $("#id_encryption_passphrase").prop('disabled', true);
                                    $("#encryption_passphrase_not_set").show();
                                    $("#encryption_passphrase_set").hide();
                                }
                            } else {
                                $('#id_enable_encryption').prop('checked', false);
                                $('#id_enable_encryption').prop('disabled', true);
                                $("#encryption_passphrase_not_set").hide();
                                $("#encryption_passphrase_set").hide();
                                PHD.throwError({"result": [{"message": data.result.message}]});
                            }

                            PHD.hideLoadingIndicator(loadAdvanceData1);
                        })
                    }
                    else{
                        $('#id_enable_encryption').prop('checked', false);
                        $('#id_enable_encryption').prop('disabled', true);
                        $("#encryption_passphrase_not_set").hide();
                        $("#encryption_passphrase_set").hide();
                        PHD.throwError({"result": [{"message": gettext("Encryption is not supported for this system.")}]});
                    }
                }
            });
            PHD.hideLoadingIndicator(loadAdvanceData);
        }else if (currentTabIndex == BACKUP_COPY_INDEX) {
            var resp = PHD.Ajax.get("/api/systems/target_configuration/");
            var respGetBackupCopySourceOption = PHD.Ajax.get("/api/replication/config/?sid=" + PHD.appliance_sid);
            var loadBackupCopyData = PHD.showLoadingIndicator("body", true, "Loading Data...");
            resp.done(function (data) {
                data = data.data;
                getCurrentTabData.configuredata = data;
                
                if ((selectedAppliance.status != "suspended") && (selectedAppliance.status != "available")){
                    $('#suspendBackupSelection').attr('disabled','disabled');
                }else{
                    $('#suspendBackupSelection').removeAttr('disabled');
                    $('#suspendBackupSelection').prop('checked', selectedAppliance.status == "suspended");
                }
                
                if($('#suspendBackupSelection').prop("checked") == true){
                    getCurrentTabData.isSuspendBackupSelection = true;
                 }else{
                    getCurrentTabData.isSuspendBackupSelection = false;
                 }
                
                if(data != undefined){
                    data.network = (data.network != "" && data.hasOwnProperty('network'))? data.network : "172.17.3.0";
                    data.mask = (data.mask != "" && data.hasOwnProperty('mask'))? data.mask : "255.255.255.0";
                    data.port = (data.port != 0 && data.hasOwnProperty('port'))?data.port:parseInt(1194);
                    $("#txtSecureNetwork").val(data.network);
                    $("#txtSecureNetmask").val(data.mask);
                    $("#securePortSelection").val(data.port);
                    getCurrentTabData.configuredata = data;
                    
                    if(data.is_configured == true){
                        $('#optimizedBackupcopySelection').prop('checked', true);
                        $('#txtSecureNetwork').removeAttr('disabled');
                        $('#txtSecureNetmask').removeAttr('disabled');
                        $('#securePortSelection').removeAttr('disabled');
                        $('#optimizedBackupcopySelection').attr('disabled','disabled');
                    }else{
                        $('#optimizedBackupcopySelection').prop('checked', false);
                        $('#txtSecureNetwork').attr('disabled','disabled');
                        $('#txtSecureNetmask').attr('disabled','disabled');
                        $('#securePortSelection').attr('disabled','disabled');
                        $('#optimizedBackupcopySelection').removeAttr('disabled');
                    }
                }else{
                    $('#optimizedBackupcopySelection').prop('checked', false);
                    $("#txtSecureNetwork").val("");
                    $("#txtSecureNetmask").val("");
                    $("#securePortSelection").val("");
                    $('#optimizedBackupcopySelection').removeAttr('disabled');
                }
            })
        
           respGetBackupCopySourceOption.done(function (data) {
               data = data.config;
               getCurrentTabData.maxbackupcopies = data;
               
               if((data != undefined) && (data != null)){
                   $('#spinMaxBackupCopies').removeAttr('disabled');
                   if($.isNumeric(data.max_concurrent)){
                       $("#spinMaxBackupCopies").val(data.max_concurrent);
                       if ( parseInt(data.max_concurrent) == 0 && selectedAppliance.local ) {
                           $('#suspendBackupSelection').prop('checked', true);
                       }
                   }else{
                       $("#spinMaxBackupCopies").val('');
                       $('#spinMaxBackupCopies').attr('disabled','disabled');
                   }
                   
                   if(data.queue_scheme != "" && data.hasOwnProperty('queue_scheme')){
                       $("#dropdownQueueScheme").val(parseInt(data.queue_scheme));
                   }
               }else{
                    $("#spinMaxBackupCopies").val('');
                    $('#spinMaxBackupCopies').attr('disabled','disabled');
               }
               
           })
           
           PHD.hideLoadingIndicator(loadBackupCopyData);
            
        } else if (currentTabIndex == LICENSE_INDEX) {
            var resp = PHD.Ajax.get("/api/license/?sid=" + PHD.appliance_sid );
            var loadLicenseData = PHD.showLoadingIndicator("body", true, gettext("Loading Data..."));
            resp.done(function (data) {
                if(data != undefined){
                     getCurrentTabData = data;
                    if(data.mkt_name !== null){
                        $("#license_name").text(data.mkt_name);
                    }
                    else{
                        $("#license_name").text(data.name);
                    }
                    $("#asset_tag").text(data.asset_tag);
                    $("#install_date").text(data.install_date);
                    $("#expires").text(data.expiration_date);
                    $("#feature_description").text(data.feature_string_description);
                    $("#feature_string").text(data.feature_string);
                    $("#license_key").text(data.key);
                }

                PHD.hideLoadingIndicator(loadLicenseData);
            })
        }else {
        }
        
        $("#expiration_date").datepicker('setDate', null);
        $("#license_key_entered").val("");
        $("#feature_string_entered").val("");
    };

            EditTab.prototype.deactivate = function () {
                this.isActive = false;
                // JobsTimer.stop();
            };

            function timeFormat(time) {
                if (time.charAt(1) == '') {
                    time = "0" + time;
                    return time;
                }
                return time;
            }

            function handleTabChange() {
                $(document).trigger("tabchange", ["appliance" + slugs[currentTabIndex]]);
                isrepeat = false;
                iscanceltabaway = false;
            }

            function initTabs() {
                $(".edit-appliance-tab").each(function (index) {
                    tabs[index] = new EditTab(index, $(this), slugs[index]).init();
                });

                tabs[currentTabIndex].activate();
            }

            $('#edit-appliance').on("alertdialogyesclick", function (event, isrepeatflag) {
                isrepeat = isrepeatflag;
                iscanceltabaway = true;
            })

            $(document).on("tabsactivateafterconfirm", function (event, ui) {
                currentTabIndex = ui.newTab.index();
                // Do not set initial_tab_config based on this index, as it is for Edit Appliance.
                //$.cookie("initial_tab_config", currentTabIndex, {expires: 365, path: '/'});
                isTabsActivateAfterConfirm = true;
                $('#edit-appliance').tabs("option", "active", currentTabIndex);
                event.stopImmediatePropagation();
                tabs[ui.oldTab.index()].deactivate();
                tabs[currentTabIndex].activate();
                handleTabChange();
            });

    // Initialize the tabs
      $('#edit-appliance').tabs({
        active: initialTab,
        create: function (event, ui) {
            currentTabIndex = ui.tab.index();
            initTabs();
            handleTabChange();
        },

        beforeActivate: function(event, ui) {
            var uiobj = ui;
            uiobj.currentData = getCurrentTabData;
            
            if(isTabsActivateAfterConfirm === false){
                if((ui.oldTab.index()) != (ui.newTab.index())){
                    isrepeat = false;
                }else{
                    isrepeat = true;
                }

                        if ((currentTabIndex != (ui.newTab.index())) || iscanceltabaway === true) {
                            currentTabIndex = ui.newTab.index();
                            currentTarget = event.target;

                            if (isrepeat == false) {
                                $('#edit-appliance').trigger('beforeactivationtab', uiobj);
                                event.preventDefault();
                                isrepeat = true;
                                iscanceltabaway = false;
                            }
                        }
                    } else {
                        isTabsActivateAfterConfirm = false;
                    }

                },
                load: function (event, ui) {
                    isrepeat = false;
                    iscanceltabaway = false;
                }
            });


            /*
             *   DOM Ready Function
             */
            initForm();

        }
    }]);
