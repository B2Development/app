editApplianceApp.controller('AdvancedCtrl', ['$scope', '$rootScope', '$http', '$analytics', 'gettextCatalog',
    function($scope, $rootScope, $http, $analytics, gettextCatalog) {

        function processAdvancedTab(PHD, window, $rootScope, $scope, $analytics) {


            var $form = $("#encryption-edit-form"),
                EncryptionForm,
                $enabled = $("#id_enable_encryption"),
                $passphrase = $("#id_encryption_passphrase, #id_confirm_passphrase"),
                $newPassphrase = $("#id_encryption_passphrase_change, #id_confirm_passphrase_change"),
                $currentPassphrase = $('#id_current_passphrase'),
                $changePassphrase = $('#id_change_passphrase'),
                EncryptionTable,
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false;
            var scope = $("[ng-controller=GlobalCtrl]").scope();


            function handleEncryption() {
                //var val = parseInt($encryption.val(), 10);
                // $port.val(ports[val]);
            }

            function handlePassphrase() {
                $passphrase.prop("disabled", !$enabled.prop("checked"));
                $changePassphrase.prop("disabled", !$enabled.prop("checked"));
                if ($changePassphrase.is("disabled")) {
                    $changePassphrase.prop("checked", false);
                }
                $currentPassphrase.prop("disabled", !$enabled.prop("checked"));
                $newPassphrase.prop("disabled", !$changePassphrase.prop("checked"));

            }


            function initForm() {

                if (selectedAppliance !== undefined && selectedAppliance.local === false) {
                    $("#btnOSPassword").hide();
                }

                $enabled.on("change", handlePassphrase).trigger("change");
                $currentPassphrase.on("change", handlePassphrase).trigger("change");
                $changePassphrase.on("change", handlePassphrase).trigger("change");

                /*$(".btn-change-passphrase").on("click", function(event) {
                 event.preventDefault();
                 $("#encryption_passphrase_not_set").show();
                 $("#encryption_passphrase_change").hide();
                 });*/

                initSANDirectForm();

                $(".btn-save-master-key").on("click", function (event) {
                    event.preventDefault();
                    var confirmMessage = gettextCatalog.getString("To save the master key file to a CD, insert one now. If no CD is found, or your appliance does not have a CD drive, the master key file will be saved to the appliance.");
                    var confirm = PHD.confirmDialog(confirmMessage, {title: gettextCatalog.getString("Save Master Key File")}, gettextCatalog.getString("Continue"));
                    confirm.done(function () {
                        var resp = PHD.Ajax.post("/api/encryption/keys");

                        resp.done(function (data) {
                            PHD.throwNotice({"result": [{"message": data.data.message}]}, {
                                width: 650,
                                height: 150
                            });
                        });
                    });
                });

                // The advanced support toolbox is on the Encryption tab, which is the Advanced Tab.
                $("#btnAdvancedToolbox").click(function (event) {
                    event.stopPropagation();
                    console.log(PHD.currentMiniWizard);
                    // This prevents the window from coming up twice, as "edit appliance" currently sends 2 clicks.
                    // Once the toolbox is loaded, we clear currentMiniWizard, and in the error handler if the load fails.
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        PHD.currentMiniWizard = 'toolboxDialog';
                        var url = "/api/commands/?sid=" + selectedAppliance.id;
                        var load = PHD.showLoadingIndicator("body", true, "Loading Toolbox....");
                        var scope = $("[ng-controller=AppliancesCtrl]").scope();
                        var dimensions = 'width:700px; height:530px';
                        var resp = PHD.Ajax.get(url, load, handleToolboxError);
                        resp.done(function (data) {
                            PHD.currentMiniWizard = null;
                            if (PHD.currentDialog !== null && PHD.currentDialog !== undefined) {
                                // Since this is an ngDialog child of a UI dialog, focus and therefore escape handling is not clean.
                                // To prevent the Edit appliance dialog from closing on escape while the dialog is open, turn off the handler.
                                console.log('turn off escape');
                                PHD.currentDialog.wizard("option", "closeOnEscape", false);
                            }
                            ngDialogService.open({
                                template: 'app/configure/advanced-toolbox/toolbox.html',
                                modelDialogId: 'advanced-toolbox-dialog',
                                name: 'advanced-toolbox-dialog',
                                closeByEscape: true,
                                scope: scope,
                                overlay: true,
                                ngDialogStyle: dimensions,
                                data: data.commands,
                                preCloseCallback: function (value) {
                                    if (PHD.currentDialog !== null && PHD.currentDialog !== undefined) {
                                        // Re-enable the close on escape functionality when the ngDialog closes.
                                        PHD.currentDialog.wizard("option", "closeOnEscape", true);
                                        console.log('turn on escape');
                                    }
                                    return true;
                                }
                            });
                        });
                    }

                    function handleToolboxError(jqXHR, textStatus, errorThrown) {
                        PHD.currentMiniWizard = null;
                        PHD.ajaxError(jqXHR, textStatus, errorThrown);
                    }
                });


                // The General configuration settings button is on the Encryption tab, which is the Advanced Tab.
                $("#btnAdvancedSettings").click(function (event) {
                    event.stopPropagation();
                    console.log(PHD.currentMiniWizard);
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        var url = "/api/settings/?sid=" + selectedAppliance.id + "&showFlat";
                        var load = PHD.showLoadingIndicator("body", true, gettextCatalog.getString("Loading information..."));
                        var resp = PHD.Ajax.get(url, load, handleSettingsError);
                        resp.done(function (data) {
                            var SettingsDialog = PHD.wizard("app/configure/advanced-settings/advanced-settings.html", "advanced-settings", {
                                title: gettextCatalog.getString("General Configuration") + " (" + gettextCatalog.getString("Advanced") + ")",
                                helpArticle: PHD.App.getHelpLink("advanced-settings", true),
                                width: 800,
                                height: 560,
                                open: function (event, ui) {
                                    var dialog = angular.element(document.getElementById("advancedSettingsTree"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function ($compile) {
                                        $compile(dialog.contents())(scope);
                                        scope.PHD = PHD;
                                        scope.gridData = data.data;
                                    });
                                },
                                beforeClose: function (event, ui) {
                                    setTimeout(function () {
                                        // Clear errors and state.
                                        $("#form-errors").hide();
                                        PHD.currentMiniWizard = null;
                                    }, 0);
                                }
                            }, false, saveCurrentDialog);
                            PHD.currentMiniWizard = SettingsDialog;
                        });
                    }

                    function handleSettingsError(jqXHR, textStatus, errorThrown) {
                        PHD.currentMiniWizard = null;
                        PHD.ajaxError(jqXHR, textStatus, errorThrown);
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });


                $("#id_enable_encryption").on("click", function (event) {
                    //debugger;
                    var initialState = !($("#id_enable_encryption").is(":checked"));
                    if (initialState === true) {
                        var confirm = PHD.confirmDialog(
                            "<p>" + gettextCatalog.getString("WARNING: You should not disable encryption once enabled and backups have completed, as new backups may fail and existing encrypted backups cannot be recovered.") + "</p>",
                            {title: gettextCatalog.getString("Disable Encryption")})
                            .done(function () {
                                // reset validator and clear errors on input boxes.
                                $form.data('validator').resetForm();
                                $form.find(".control-group.text.error").removeClass("error");
                            })
                            .fail(function () {
                                $('#id_enable_encryption').prop('checked', initialState);
                                $currentPassphrase.prop("disabled", !initialState);
                            });
                        $('.dialog-confirm').css('border', '1px solid #ccc');
                    }
                });

                // The OS password button is on the Encryption tab, which is the Advanced Tab.
                $("#btnOSPassword").click(function (event) {
                    event.stopPropagation();
                    console.log(PHD.currentMiniWizard);
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        /*
                         * Compile the additional content so we can use AngularJS.
                         */
                        var OSPasswordDialog = PHD.wizard("app/configure/os-password/os-password.html", "os-password", {
                            title: "Low-Level OS Password (Advanced)",
                            helpArticle: PHD.App.getHelpLink("os-password", true),
                            width: 550,
                            height: 260,
                            open: function (event, ui) {
                                var osDialog = angular.element(document.getElementById("osPasswordDialog"));
                                var osScope = osDialog.scope();
                                angular.element(document).injector().invoke(function ($compile) {
                                    $compile(osDialog.contents())(osScope);
                                    osScope.$digest();
                                    osScope.PHD = PHD;
                                });
                            },
                            beforeClose: function (event, ui) {
                                setTimeout(function () {
                                    // Clear errors and state.
                                    $("#form-errors").hide();
                                    PHD.currentMiniWizard = null;
                                }, 0);
                            }
                        }, false, saveCurrentDialog);
                        PHD.currentMiniWizard = OSPasswordDialog;
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });

                // The iSCSI CHAP button is on the Encryption tab, which is the Advanced Tab.
                $("#btniscsiCHAP").click(function (event) {
                    event.stopPropagation();
                    console.log(PHD.currentMiniWizard);
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        /*
                         * Compile the additional content so we can use AngularJS.
                         */
                        var CHAPDIalog = PHD.wizard("app/configure/iscsi-chap/iscsi-chap.html", "iscsi-chap", {
                            title: "iSCSI CHAP Credentials",
                            helpArticle: PHD.App.getHelpLink("iscsi-chap", true),
                            width: 550,
                            height: 260,
                            open: function (event, ui) {
                                var dialog = angular.element(document.getElementById("iscsiCHAPDialog"));
                                var scope = dialog.scope();
                                angular.element(document).injector().invoke(function ($compile) {
                                    $compile(dialog.contents())(scope);
                                    scope.PHD = PHD;
                                    scope.$digest();
                                });
                            },
                            beforeClose: function (event, ui) {
                                setTimeout(function () {
                                    // Clear errors and state.
                                    $("#form-errors").hide();
                                    PHD.currentMiniWizard = null;
                                }, 0);
                            }
                        }, false, saveCurrentDialog);
                        PHD.currentMiniWizard = CHAPDIalog;
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });

                // The SNMP button is on the Encryption tab, which is the Advanced Tab.
                $("#btnSNMP").click(function (event) {
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        var url = "/api/traps/destinations/?sid=" + selectedAppliance.id;
                        var load = PHD.showLoadingIndicator("body", true, "Loading...");
                        var resp = PHD.Ajax.get(url, load, handleHostsError);
                        resp.done(function (data) {
                            var Dialog = PHD.wizard("app/configure/notifications/snmp/snmp-list.html", "advanced-snmp", {
                                title: "Edit SNMP Configuration (Advanced)",
                                helpArticle: PHD.App.getHelpLink("advanced-snmp", true),
                                width: 800,
                                height: 540,
                                open: function (event, ui) {
                                    var dialog = angular.element(document.getElementById("snmpDialog"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function ($compile) {
                                        $compile(dialog.contents())(scope);
                                        scope.PHD = PHD;
                                        scope.gridData = data.data;
                                        scope.selectedID = selectedAppliance.id;
                                    });
                                },
                                beforeClose: function (event, ui) {
                                    setTimeout(function () {
                                        // Clear errors and state.
                                        $("#form-errors").hide();
                                        PHD.currentMiniWizard = null;
                                    }, 0);
                                }
                            }, false, saveCurrentDialog);
                            PHD.currentMiniWizard = Dialog;
                        });
                    }

                    function handleHostsError(jqXHR, textStatus, errorThrown) {
                        PHD.currentMiniWizard = null;
                        PHD.ajaxError(jqXHR, textStatus, errorThrown);
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });

                // The Replica Configuration button is on the Encryption tab, which is the Advanced Tab.
                $("#btnReplicaConfig").click(function (event) {
                    event.stopPropagation();
                    console.log(PHD.currentMiniWizard);
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        /*
                         * Compile the additional content so we can use AngularJS.
                         */
                        var replicaConfigDialog = PHD.wizard("app/configure/replica-config/replica-config.html", "max-recovery-points",{
                            title: "Edit VM Replica Configuration (Advanced)",
                            helpArticle: PHD.App.getHelpLink("replica-config", true),
                            width: 550,
                            height: 260,
                            open: function(event, ui) {
                                var replicaDialog = angular.element(document.getElementById("replicaConfigDialog"));
                                var replicaScope = replicaDialog.scope();
                                angular.element(document).injector().invoke(function($compile){
                                    $compile(replicaConfigDialog.contents())(replicaScope);
                                    replicaScope.$digest();
                                    replicaScope.PHD = PHD;
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
                        PHD.currentMiniWizard = replicaConfigDialog;
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });

                EncryptionForm = PHD.FormController($form, {})
                    .validate({
                        errorLabelContainer: ".encryption-dialog-error-list",
                        errorContainer: ".encryption-dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $(".encryption-dialog-errors").find(".summary")
                                .html(gettext("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            //for new
                            encryption_passphrase: {
                                required: function () {
                                    return $("#id_enable_encryption:checked") && $("#id_encryption_passphrase_not_set:visible");
                                }
                            },
                            encryption_confirm_passphrase: {
                                required: function () {
                                    return $("#id_enable_encryption:checked") && $("#id_encryption_passphrase_not_set:visible");
                                },
                                equalTo: "#id_encryption_passphrase"
                            },
                            //for change
                            current_passphrase: {
                                required: function () {
                                    return $("#id_enable_encryption:checked") && $("#id_encryption_passphrase_set:visible");
                                }
                            },
                            encryption_passphrase_change: {
                                required: function () {
                                    return $("#id_enable_encryption:checked") && $("#id_encryption_passphrase_set:visible") && $('#id_change_passphrase:checked');
                                }
                            },
                            encryption_confirm_passphrase_change: {
                                required: function () {
                                    return $("#id_enable_encryption:checked") && $("#id_encryption_passphrase_set:visible") && $('#id_change_passphrase:checked');
                                },
                                equalTo: "#id_encryption_passphrase_change"
                            }
                        },
                        messages: {
                            encryption_passphrase: {
                                required: gettext("Please enter your passphrase")
                            },
                            encryption_confirm_passphrase: {
                                required: gettext("Please re-enter your passphrase"),
                                equalTo: gettext("Your passphrase must be the same in both fields")
                            },
                            current_passphrase: {
                                required: gettext("Please enter your current passphrase")
                            },
                            encryption_passphrase_change: {
                                required: gettext("Please enter your new passphrase")
                            },
                            encryption_confirm_passphrase_change: {
                                required: gettext("Please re-enter your new passphrase"),
                                equalTo: gettext("Your new passphrase must be the same in both fields")
                            }
                        }
                    })
                    .on("formcancel", function (event) {
                        PHD.currentDialog.wizard("close");
                    })
                    .on("formsubmit", function (event, data) {
                        PHD.currentDialog.wizard("close");
                    });

                EncryptionForm.submit = function () {
                    var self = this;

                    if ($form.valid()) {
                        this.$buttons.blur().disable();

                        var encryptionData = {};
                        var type = "";
                        var post = false;
                        /* There are four cases for encryption
                         1. Passphrase has never been set (turning encryption on and setting passphrase)
                         2. Changing Passphrase
                         3. Turning encryption on (if turned off with passphrase set)
                         4. Turning encryption off
                         */
                        console.log($('#encryption_passphrase_not_set').is(':visible'));
                        if ($('#id_enable_encryption').prop("checked") == true && $('#encryption_passphrase_not_set').is(':visible') == true) {
                            encryptionData.new_passphrase = $('#id_encryption_passphrase').val();
                            type = "passphrase/";
                            post = true;
                        } else if ($('#id_enable_encryption').prop("checked") == true && $('#id_change_passphrase').prop("checked") == true) {
                            encryptionData.current_passphrase = $('#id_current_passphrase').val();
                            encryptionData.new_passphrase = $('#id_encryption_passphrase_change').val();
                            type = "passphrase/";
                        } else if ($('#id_enable_encryption').prop("checked") == true) {
                            encryptionData.passphrase = $('#id_current_passphrase').val();
                            type = "persistent/";
                        } else {
                            type = "disable/";
                        }

                        encryptionData = JSON.stringify(encryptionData);

                        var url = "/api/encryption/";
                        var sid = (PHD.appliance_sid === null) ? "" : "?sid=" + PHD.appliance_sid;
                        url += type + sid;
                        var load = PHD.showLoadingIndicator($form);
                        if (post) {
                            console.log("POSTing encryption data");
                            PHD.Ajax
                                .post(url, encryptionData, load)
                                .done(function (data) {
                                    var url = "/api/encryption/persistent/";
                                    var sid = (PHD.appliance_sid === null) ? "" : "?sid=" + PHD.appliance_sid;
                                    url += sid;
                                    var persistData = {};
                                    persistData.passphrase = $('#id_encryption_passphrase').val();
                                    persistData = JSON.stringify(persistData);
                                    load = PHD.showLoadingIndicator($form);
                                    PHD.Ajax
                                        .put(url, persistData, load)
                                        .done(function (data) {
                                            self.$form.trigger("formsubmit", [data, self.$form, self]);
                                        })
                                        .always(function () {
                                            self.$buttons.enable();
                                        });
                                })
                                .always(function () {
                                    self.$buttons.enable();
                                });

                        } else {
                            console.log("PUTing encryption data");
                            PHD.Ajax
                                .put(url, encryptionData, load)
                                .done(function (data) {
                                    self.$form.trigger("formsubmit", [data, self.$form, self]);
                                })
                                .always(function () {
                                    self.$buttons.enable();
                                });
                        }

                        return this;
                    }
                };

                $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                    var ADVANCED_INDEX = 6;
                    if (ui.oldTab.index() === ADVANCED_INDEX) {
                        var currentData = jQuery.extend(true, {}, ui.currentData);
                        var editedDataObject = jQuery.extend(true, {}, currentData);

                        if ($('#id_enable_encryption').prop("checked") == true) {
                            editedDataObject.has_passphrase = true;
                        } else {
                            editedDataObject.has_passphrase = false;
                        }

                        iscompare = ($('#id_encryption_passphrase').val() != '') ? false : iscompare;
                        iscompare = ($('#id_current_passphrase').val() != '') ? false : iscompare;
                        iscompare = ($('#id_current_passphrase').val() != '') ? false : iscompare;

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

            function initSANDirectForm() {
                var $sanDirect = $("#san-direct-details");

                // Check to see if a physical appliance or not.  By default, the box is hidden and only exposed if physical.
                var elem = angular.element(document.querySelector('[ng-controller=GlobalCtrl]'));
                var $scope = elem.scope();
                if ($scope.isRecoverySeries) {
                    $.get("app/configure/san-direct/san-details.html", function (sanDirect_html) {
                        console.log($sanDirect);
                        $sanDirect.append(sanDirect_html);

                        // Load the dialog html, and compile the elements.
                        var injector = elem.injector();
                        var $compile = injector.get('$compile');
                        var elements = angular.element(document.getElementById("san-direct-component"));
                        $compile(elements.contents())($scope);

                        // Load the SAN Direct controller, run the function in its scope to load the grid.
                        elem = angular.element(document.querySelector('[ng-controller=SANDirectCtrl]'));
                        $scope = elem.scope();
                        $scope.reloadGrid();
                        $scope.$digest();

                        $sanDirect.show();
                    });
                }
            }

            /*
             *   DOM Ready Function
             */
            initForm();

        }

        angular.element(document).ready(function () {
            processAdvancedTab(PHD, window, $rootScope, $scope, $analytics);
        });
    }]);
