//dialog.config-advancedBackupCopyEdit.js
editApplianceApp.controller('BackupCopyApplianceCtrl', ['$scope', '$rootScope', '$http', '$analytics', 'gettextCatalog',
    function($scope, $rootScope, $http, $analytics, gettextCatalog) {

    $scope.backupCopyWarningTooltip = gettextCatalog.getString("<b>Caution:</b> If you are configuring a cross-vault") + '<br>' +
                                    gettextCatalog.getString("(two appliances sending backup copies between each other)") + '<br>' +
                                    gettextCatalog.getString("secure network is required for one appliance only.") + '<br>' +
                                    gettextCatalog.getString("If configured for both appliances, the secure network <b>MUST</b> be different on each.");

        function processBackupCopyTab(PHD, window, $rootScope, $scope, $analytics) {

            var $form = $("#advanced-backupcopy-edit-form"),
                BackupCopyEditForm,
                loadindicator,
                isMakeTargetSuccess = false,
                isBackupCopySource = false,
                portOption = {"min": 1, "max": 9999, "step": 1},
                maxBackupCopies = {"min": 0, "max": 6, "step": 1},
                NETWORK_IP_REGEXP = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){3}([0])$/,
                MASK_IP_REGEXP = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/,
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false;

            var show_replication_config = false;
            var show_openvpn_config = true;
            var initialMaxConcurrentValue = -1;

            var $btnRestart = $(".btn-restart-replication");

            function initForm() {
                $form.find(".definition").popover({
                    appendTo: $form
                });

                $btnRestart.on("click", function (event) {
                    confirmCopyRestart(event);
                });

                console.log("Selected appliance is " + JSON.stringify(selectedAppliance));
                if (selectedAppliance.local == false) {
                    $(".advanced-backupcopy-settings-openvpn").hide();
                    show_openvpn_config = false;
                    if (selectedAppliance.role == "Replication Source") {
                        // shows in specialized dialog for non-managed.
                        $(".advanced-backupcopy-settings-config").show();
                        show_replication_config = true;
                        $("#suspend-resume-copies").show();
                    }
                } else {
                    // local - show openvpn settings if not CE
                    if (!isCE) {
                        $(".advanced-backupcopy-settings-openvpn").show();
                    } else {
                        $(".advanced-backupcopy-settings-openvpn").hide();
                    }
                    // Do show settings and config for local if a replicating source.
                    show_replication_config = true;
                    $(".advanced-backupcopy-settings-config").show();
                    $("#suspend-resume-copies").show();
                }

                if ((selectedAppliance.status != "suspended") && (selectedAppliance.status != "available")) {
                    $('#suspendBackupSelection').attr('disabled', 'disabled');
                } else {
                    $('#suspendBackupSelection').removeAttr('disabled');
                    $('#suspendBackupSelection').prop('checked', selectedAppliance.status == "suspended");
                }

                isMakeTargetSuccess = false;
                isBackupCopySource = false;
                $("#securePortSelection").spinner(portOption).val(1194);
                $("#spinMaxBackupCopies").spinner(maxBackupCopies);

                if (show_replication_config) {
                    var configURL = "/api/replication/config/?sid=" + selectedAppliance.id;
                    ;
                    var resp = PHD.Ajax.get(configURL, null);
                    resp.done(function (data) {
                        console.log("success loading conifg, data = " + JSON.stringify(data));
                        initialMaxConcurrentValue = parseInt(data.config.max_concurrent);
                        $("#spinMaxBackupCopies").val(initialMaxConcurrentValue);
                        $("#dropdownQueueScheme").val(parseInt(data.config.queue_scheme));
                        if (initialMaxConcurrentValue == 0 && selectedAppliance.local) {
                            $('#suspendBackupSelection').prop('checked', true);
                        }
                    });
                }

                BackupCopyEditForm = PHD.FormController($form, {})
                    .validate({
                        errorLabelContainer: ".advanced-backupcopy-dialog-error-list",
                        errorContainer: ".advanced-backupcopy-dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $(".advanced-backupcopy-dialog-errors").find(".summary")
                                .html(gettext("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            secure_network: {
                                required: function (element) {
                                    return $("#optimizedBackupcopySelection").prop("checked");
                                },
                                pattern: NETWORK_IP_REGEXP
                            },
                            secure_netmask: {
                                pattern: MASK_IP_REGEXP
                            },
                            concurrent_backup_copies: {
                                checkConcurrentCopies: true
                            }
                        },
                        messages: {
                            secure_network: {
                                required: gettext("Secure network is required"),
                                pattern: gettext("Secure network is not a valid address")
                            },
                            secure_netmask: {
                                pattern: gettext("Secure netmask is not a valid address")
                            },
                            concurrent_backup_copies: {
                                checkConcurrentCopies: gettext("Number of concurrent copies must be between 0 and 6")
                            }
                        }
                    })
                    .on("formcancel", function (event) {
                        PHD.hideLoadingIndicator(loadindicator);
                        PHD.currentDialog.wizard("close");
                    })
                    .on("formsubmit", function (event, data) {
                        PHD.hideLoadingIndicator(loadindicator);
                        PHD.currentDialog.wizard("close");
                        if (typeof data.result !== 'undefined' && data.result[0].code != AJAX_RESULT_SUCCESS) {
                            PHD.throwNotice(data);
                        }
                    });

                function concurrentCopyCheck() {
                    $.validator.addMethod("checkConcurrentCopies", function (myVal) {
                        if (!$('#spinMaxBackupCopies').prop("disabled")) {
                            if (myVal > 6 || myVal < 0) {
                                return false;
                            } else {
                                return true;
                            }
                        } else {
                            return true;
                        }
                    }, "Number of concurrent copies needs to be between 0 and 6");
                }

                // Add validator to check concurrent copies.
                concurrentCopyCheck();

                // EncryptionForm.submit = function(){
                $("#btnSave").click(function () {
                    var self = this;
                    var backupCopyData = {};
                    var backupCopySourceData = {};
                    var isMakeTargetSuccess = false;
                    var isBackupCopySource = false;

                    if ($form.valid()) {
                        if (show_openvpn_config && $('#optimizedBackupcopySelection').prop("checked") == true) {
                            backupCopyData.network = $('#txtSecureNetwork').val();

                            if (($('#txtSecureNetmask').val()) != '') {
                                backupCopyData.mask = $('#txtSecureNetmask').val();
                            }

                            if (($('#securePortSelection').val()) != '') {
                                backupCopyData.port = $('#securePortSelection').val();
                            }

                            // Make a target if not already one.
                            backupCopyData = JSON.stringify(backupCopyData);
                            var makeTargetUrl = "/api/systems/make_target";

                            loadindicator = PHD.showLoadingIndicator("body", true, "Saving Backup Copy Configure Data...");

                            PHD.Ajax
                                .post(makeTargetUrl, backupCopyData, loadindicator)
                                .done(function (data) {
                                    isMakeTargetSuccess = true;

                                    if (isMakeTargetSuccess == true && isBackupCopySource == true) {
                                        PHD.hideLoadingIndicator(loadindicator);
                                        PHD.currentDialog.wizard("close");
                                    }

                                    if (typeof data.result !== 'undefined' && data.result[0].code != AJAX_RESULT_SUCCESS) {
                                        PHD.hideLoadingIndicator(loadindicator);
                                        PHD.throwNotice(data);
                                    }
                                });
                        } else {
                            isMakeTargetSuccess = true;
                        }

                        // update max concurrent and queue scheme.
                        if (show_replication_config) {

                            if ((($('#spinMaxBackupCopies').val()) != '') && ($('#spinMaxBackupCopies').prop("disabled") != 'disabled')) {
                                backupCopySourceData.max_concurrent = parseInt($('#spinMaxBackupCopies').val());
                            }
                            backupCopySourceData.queue_value = parseInt($("#dropdownQueueScheme").val());
                            backupCopySourceData = JSON.stringify(backupCopySourceData);
                            var sid = selectedAppliance.id;
                            var BackupCopySourceUrl = "/api/replication/config/?sid=" + sid;

                            PHD.Ajax
                                .put(BackupCopySourceUrl, backupCopySourceData, loadindicator)
                                .done(function (data) {
                                    isBackupCopySource = true;

                                    if (isMakeTargetSuccess == true && isBackupCopySource == true) {
                                        PHD.hideLoadingIndicator(loadindicator);
                                        PHD.currentDialog.wizard("close");
                                    }

                                    if (typeof data.result !== 'undefined' && data.result[0].code != AJAX_RESULT_SUCCESS) {
                                        PHD.hideLoadingIndicator(loadindicator);
                                        PHD.throwNotice(data);
                                    }
                                })
                        } else {
                            isBackupCopySource = true;
                        }
                    }

                    suspendOrResume(initialMaxConcurrentValue);
                });

                $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                    var BACKUP_COPY_INDEX = 5;
                    if (ui.oldTab.index() === BACKUP_COPY_INDEX) {
                        var currentData = jQuery.extend(true, {}, ui.currentData);
                        var editedDataObject = jQuery.extend(true, {}, currentData);

                        if (editedDataObject.configuredata === undefined) {
                            editedDataObject.configuredata = {};
                        }

                        if ($('#optimizedBackupcopySelection').prop("checked") == true) {
                            editedDataObject.configuredata.is_configured = true;
                        } else {
                            editedDataObject.configuredata.is_configured = false;
                        }

                        if ($('#suspendBackupSelection').prop("checked") == true) {
                            editedDataObject.isSuspendBackupSelection = true;
                        } else {
                            editedDataObject.isSuspendBackupSelection = false;
                        }

                        editedDataObject.configuredata.network = $('#txtSecureNetwork').val();
                        editedDataObject.configuredata.mask = $('#txtSecureNetmask').val();
                        editedDataObject.configuredata.port = parseInt($('#securePortSelection').val());
                        if (editedDataObject.maxbackupcopies !== undefined) {
                            editedDataObject.maxbackupcopies.max_concurrent = $('#spinMaxBackupCopies').val();
                            editedDataObject.maxbackupcopies.queue_scheme = $('#dropdownQueueScheme').val();
                        }

                        var iscompare = compareTwoObjects(currentData, editedDataObject);

                        if (iscompare == false) {
                            event.preventDefault();
                            PHD.confirmDialog("<p>" + gettextCatalog.getString("Do you want to save your changes?") + "</p>",
                                {
                                    title: gettextCatalog.getString("Saving Alert")
                                }, gettextCatalog.getString("Yes"))
                                .done(function () {
                                    isrepeat = false;
                                    $('#edit-appliance').trigger('alertdialogyesclick', isrepeat);
                                })
                                .fail(function () {
                                    isrepeat = true;
                                    $(currentTarget).trigger('tabsactivateafterconfirm', ui);
                                })
                        } else {
                            isrepeat = true;
                            $(currentTarget).trigger('tabsactivateafterconfirm', ui);
                        }
                    }
                });
            }

            // Start of code ported from backup job to handle custom calendaring
            // For edited jobs, jobOptions is equivalend to $scope.joborder.
            // For new jobs, jobOptions is null, so if the user saves calendar (saveCustomCalendar event)
            // we will create a jobOptions object with an ical property.
            var restartOpen = false; // prevent double-click error.
            function confirmCopyRestart(event) {
                event.stopPropagation();

                // Access the ngDialog module injected into the app.
                var elem = angular.element(document.querySelector('[ng-controller=GlobalCtrl]'));
                var injector = elem.injector();
                var ngDialog = injector.get('ngDialog');

                if (!restartOpen) {
                    restartOpen = true;

                    // Clear this function so that the ngDialog elements can gain focus above a jQuery-ui dialog.
                    $.ui.dialog.prototype._focusTabbable = function () {
                    };
                    ngDialog.open({
                        template: 'app/configure/backupcopy/restart-copy/confirm.html',
                        scope: elem.scope(),
                        data: {appliance: selectedAppliance},
                        overlay: true,
                        modelDialogId: 'restart-backup-copy',
                        name: 'restart-backup-copy',
                        ngDialogStyle: 'width:500px;height:184px;',
                        preCloseCallback: function (value) {
                            restartOpen = false;
                        }
                    });
                }

            }

            function suspendOrResume(initialValueForMaxConcurrent) {

                var base_url = "/api/replication/";
                var suspendFromTargetURL = base_url + "suspend/source/?sid=1";
                var resumeFromTargetURL = base_url + "resume/source/?sid=1";
                var suspendFromSourceURL = base_url + "suspend/target";
                var resumeFromSourceURL = base_url + "resume/target";
                var suspendURL, resumeURL;

                var wantToSuspend = $('#suspendBackupSelection').prop("checked") == true;
                var maxConcurrentWasInitiallyZero = initialValueForMaxConcurrent == 0;

                // Check state to see if want to change it.
                var currentlySuspended = selectedAppliance.status == "suspended";

                var arg = {};
                if (selectedAppliance.local) {
                    // Local Appliance and I am replicating.
                    if (targetObject !== undefined) {
                        arg.target_hostname = targetObject.name;
                    } else {
                        arg.target_hostname = "_all_";
                    }
                    suspendURL = suspendFromSourceURL;
                    resumeURL = resumeFromSourceURL;
                } else {
                    // Non-local, so either a manager or a target.
                    if (localAppliance !== null && localAppliance.role != null && localAppliance.role.indexOf("Target") != -1) {
                        // I am a target, suspend the source.
                        arg.source_hostname = selectedAppliance.name;
                        suspendURL = suspendFromTargetURL;
                        resumeURL = resumeFromTargetURL;
                    }
                }

                var changing = false;
                var url;
                if (wantToSuspend == true && currentlySuspended == false) {
                    url = suspendURL;
                    changing = true;

                } else if (wantToSuspend == false && (currentlySuspended == true || (maxConcurrentWasInitiallyZero == true && selectedAppliance.local && $("#spinMaxBackupCopies").val() == 0) )) {
                    url = resumeURL;
                    changing = true;
                }

                if (changing) {
                    //this.$buttons.disable();
                    var data = JSON.stringify(arg);
                    var resp = PHD.Ajax.put(url, data, null);

                    resp.done(function (data) {
                        var result = data.result[0];
                        PHD.hideLoadingIndicator(load);
                        if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                            $(document).trigger("editappliance");
                            PHD.currentDialog.wizard("close");
                        } else if (parseInt(result.code) === AJAX_RESULT_ERROR) {
                            console.log("FAILURE");
                        }
                    })
                        .always(function () {
                            PHD.hideLoadingIndicator(loadindicator);
                        });
                }

                return this;
            }

            $("input[name=optimizedbackupcopygroup]:checkbox").change(function () {
                if ($("#optimizedBackupcopySelection").prop("checked")) {
                    $('#txtSecureNetwork').removeAttr('disabled');
                    $('#txtSecureNetmask').removeAttr('disabled');
                    $('#securePortSelection').removeAttr('disabled');
                }
                else {
                    $('#txtSecureNetwork').attr('disabled', 'disabled');
                    $('#txtSecureNetmask').attr('disabled', 'disabled');
                    $('#securePortSelection').attr('disabled', 'disabled');
                }
            });

            /* DOM Ready Function */
            initForm();

        }

        angular.element(document).ready(function () {
            processBackupCopyTab(PHD, window, $rootScope, $scope, $analytics);

            setTimeout(function(){
                $('.tooltip').tooltipster({
                    theme: 'tooltips-custom-theme',
                    arrow:false,
                    contentAsHTML: true
                });
            }, 200);
        });
    }]);