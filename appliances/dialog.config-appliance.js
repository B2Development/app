editApplianceApp.controller('GeneralApplianceCtrl', ['$scope', '$rootScope', '$http', '$analytics', 'gettextCatalog',
    function($scope, $rootScope, $http, $analytics, gettextCatalog) {

        function processGeneralTab(PHD, window, $rootScope, $scope, $analytics) {

            var $form = $("#form-add-appliance");
            var applianceForm,
                loadindicator,
                FQDN_REGEXP = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/,
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false;

            function initForm() {
                if (selectedAppliance !== undefined && selectedAppliance.local === false) {
                    $("#btnShutdownRestart").hide();
                }

                // Copy system name to host.
                $("#id_name").focusout(function () {
                    console.log("in function, name = " + $("#id_name").val());
                    $("#id_host").val($("#id_name").val());
                    console.log("in function, host = " + $("#id_host").val());
                });

                $form.find(".definition").popover({
                    appendTo: $form
                });

                applianceForm = PHD.FormController($form, {
                    serialize: function ($form) {
                        return $form.find("input").serialize();
                    }
                });

                applianceForm
                    .validate({
                        errorLabelContainer: "#dialog-error-list",
                        errorContainer: "#dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $("#dialog-errors").find(".summary")
                                .html(gettext("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            ip: {
                                required: true,
                                pattern: FQDN_REGEXP
                            },
                            name: {
                                required: true
                            }
                        },
                        messages: {
                            ip: {
                                required: gettext("IP Address is required"),
                                pattern: gettext("IP Address is not a valid address")
                            },
                            name: {
                                required: gettext("Name is required")
                            }
                        }
                    })
                    .on("formcancel", function (event) {
                        PHD.hideLoadingIndicator(loadindicator);
                        PHD.currentDialog.wizard("close");
                    });


                /*
                 * Override the standard submit for the FormController and re-direct to handleApplianceSave.
                 */
                applianceForm.submit = function () {
                    handleSaveAppliance();
                };

                $("#btnEditApplianceSave").click(function(event) {
                    handleSaveAppliance();
                });

                function handleSaveAppliance() {
                    if (($form.valid()) === false) {
                        return;
                    }
                    var self = this;

                    loadindicator = PHD.showLoadingIndicator("body", true, gettext("Saving..."));
                    if (selectedAppliance.local) {
                        var sid = (PHD.appliance_sid === null) ? "" : "?sid=" + PHD.appliance_sid;
                        var url = "/api/hostname/" + sid;

                        var hostObj = {};
                        if (($('#id_name').val()) !== '') {
                            hostObj.name = $('#id_name').val();
                        }

                        if (($('#id_longname').val()) !== '') {
                            hostObj.long_name = $('#id_longname').val();
                        }
                        hostObj = JSON.stringify(hostObj);

                        PHD.Ajax
                            .put(url, hostObj)
                            .done(function (data) {
                                var start = new Date().getTime();
                                for (var i = 0; i < 1e7; i++) {
                                    if ((new Date().getTime() - start) > 1000) {
                                        break;
                                    }
                                }
                                if (typeof data.result !== 'undefined' && parseInt(data.result[0].code) !== AJAX_RESULT_SUCCESS) {
                                    PHD.hideLoadingIndicator(loadindicator);
                                    PHD.throwNotice(data);
                                } else {
                                    PHD.hideLoadingIndicator(loadindicator);
                                    PHD.currentDialog.wizard("close");
                                }

                            })
                            .always(function () {
                                PHD.hideLoadingIndicator(loadindicator);
                                /*PHD.currentDialog.wizard("close");*/
                            });
                    } else {
                        PHD.currentDialog.wizard("close");
                        PHD.hideLoadingIndicator(loadindicator);
                    }
                    return this;

                }


                $("#btnShutdownRestart").click(function (event) {
                    event.stopPropagation();
                    /*
                     * Workaround to handle the 2 event clicks that come from the 2 buttons that overlay each other.
                     * Also, to use wizard within the wizard, the workaround is to use the miniWizard.
                     * Save current Edit dialog, load the shutdown dialog, and set it to be the miniWizard one.
                     * This can be simplified once Edit Appliance is AngularJS.
                     */
                    var saveDialog = PHD.currentDialog;
                    if (PHD.currentMiniWizard === undefined || PHD.currentMiniWizard === null) {
                        var shutdownDialog = PHD.wizard("app/configure/appliances/shutdown-restart.html", "shutdown-restart", {
                            title: gettextCatalog.getString("Shutdown appliance"),
                            helpArticle: PHD.App.getHelpLink("shtudown-restart", true),
                            width: 425,
                            height: 225,
                            open: function (event, ui) {
                                var dialog = angular.element(document.getElementById("shutdownRestartDialog"));
                                var scope = dialog.scope();
                                angular.element(document).injector().invoke(function ($compile) {
                                    $compile(dialog.contents())(scope);
                                    scope.PHD = PHD;
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
                        PHD.currentMiniWizard = shutdownDialog;
                    }

                    function saveCurrentDialog() {
                        PHD.currentDialog = saveDialog;
                    }
                });

                $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                    var GENERAL_INDEX = 0;
                    if (ui.oldTab.index() === GENERAL_INDEX) {
                        var currentData = jQuery.extend(true, {}, ui.currentData);
                        var editedDataObject = jQuery.extend(true, {}, currentData);

                        editedDataObject.name = $('#id_name').val();
                        editedDataObject.long_name = $('#id_longname').val();

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

            /*
             *   DOM Ready Function
             */
            initForm();

        }

        angular.element(document).ready(function () {
            processGeneralTab(PHD, window, $rootScope, $scope, $analytics);
        });

}]);