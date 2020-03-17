editApplianceApp.controller('LicenseCtrl', ['$scope', '$rootScope', '$http', '$analytics', 'gettextCatalog',
    function($scope, $rootScope, $http, $analytics, gettextCatalog) {

        function processLicenseTab(PHD, window, $rootScope, $scope, $analytics) {

            var $form = $("#license-edit-form"),
                $btnAddLicense = $(".btn-add-license-info"),
                $btnUpgrade = $(".btn-upgrade-license"),
                $btnResources = $(".btn-view-license-resources");
            var LicenseForm,
                loadindicator,
                FQDN_REGEXP = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/,
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false;

            function initForm() {
                $btnAddLicense.on("click", handleSend);
                $btnUpgrade.on("click", handleUpgrade);
                $btnResources.on("click", handleResources);

                $form.find(".definition").popover({
                    appendTo: $form
                });

                LicenseForm = PHD.FormController($form, {})
                    .validate({
                        errorLabelContainer: ".license-dialog-error-list",
                        errorContainer: ".license-dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $(".license-dialog-errors").find(".summary")
                                .html(gettext("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            license_key_entered: {
                                required: true
                            },
                            feature_string_entered: {
                                required: true
                            }
                        },
                        messages: {
                            license_key_entered: {
                                required: gettext("License Key is required")
                            },
                            feature_string_entered: {
                                required: gettext("Feature String is required")
                            }
                        }
                    })
                    .on("formcancel", function (event) {
                        PHD.currentDialog.wizard("close");
                    })
                    .on("formsubmit", function (event, data) {
                        PHD.currentDialog.wizard("close");
                    });

                LicenseForm.submit = function () {
                    if ($(".btn-add-license-info").is(':visible')) {
                        return false;
                    }
                    var self = this;
                    var url = "/api/license/";
                    var sid = (PHD.appliance_sid === null) ? "" : "?sid=" + PHD.appliance_sid;
                    url += sid;
                    var persistData = {};
                    persistData.key = $('#license_key_entered').val();
                    persistData.feature_string = $('#feature_string_entered').val();
                    persistData.expiration_date = $('#expiration_date').val();
                    if ($('#expiration_date').val() === "") {
                        persistData.expiration_date = "never";
                    }
                    persistData = JSON.stringify(persistData);
                    var load = PHD.showLoadingIndicator($form);
                    PHD.Ajax
                        .put(url, persistData, load)
                        .done(function (data) {
                            // self.$form.trigger("formsubmit", [data, self.$form, self]);
                            var result = data.result[0];
                            if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                                console.log("SUCCESS");
                                PHD.Ajax.get(url)
                                    .done(function (data) {
                                        if (data != undefined) {
                                            $("#asset_tag").text(data.asset_tag);
                                            $("#license_name").text(data.name);
                                            $("#install_date").text(data.install_date);
                                            $("#expires").text(data.expiration_date);
                                            $("#feature_description").text(data.feature_string_description);
                                            $("#feature_string").text(data.feature_string);
                                            $("#license_key").text(data.key);
                                            $("#license_key_entered").val("");
                                            $('#feature_string_entered').val("");
                                            $('#expiration_date').val("");
                                        }
                                    });
                                handleSend();
                            }
                        })
                        .always(function () {
                            self.$buttons.enable();
                        });
                }

                $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                    var LICENSE_INDEX = 4;
                    if (ui.oldTab.index() === LICENSE_INDEX) {
                        var currentData = jQuery.extend(true, {}, ui.currentData);
                        var editedDataObject = jQuery.extend(true, {}, currentData);
                        var iscompare = true;

                        if (($('#license_key_entered').val() != "") ||
                            ($('#feature_string_entered').val() != "") ||
                            ($('#expiration_date').val() != "")) {
                            iscompare = false;
                        }

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

                /* Set date picker style */
                $(".datepicker input:text").datepicker({
                    showOn: "both",
                    buttonText: '<img src="assets/images/calendar.png" width="24" height="24">',
                    dateFormat: DATE_FORMAT
                }).attr("placeholder", DATE_DISPLAY_FORMAT);

            }

            function handleSend() {

                if ($("#update_license").is(':visible')) {
                    $("#update_license").hide();
                    $(".btn-add-license-info").show();
                    $(".btn-upgrade-license").show();
                    $(".btn-view-license-resources").show();
                }
                else {
                    $("#update_license").show();
                    $(".btn-add-license-info").hide();
                    $(".btn-upgrade-license").hide();
                    $(".btn-view-license-resources").hide();
                }
            }

            $("#clear_date").on("click", function () {
                $("#expiration_date").datepicker('setDate', null);
            });

            function handleUpgrade() {
                var info_url = "/api/license/request/?sid=" + PHD.appliance_sid;
                var load = PHD.showLoadingIndicator('body', true, 'Gathering information for registration page......');
                var resp = PHD.Ajax.get(info_url, load);
                resp.done(function (data) {
                    var upgrade_link;
                    if (data.request.link !== undefined) {
                        upgrade_link = data.request.link;
                    }
                    var licenseObj = data.request.registration;
                    console.log("License object is " + JSON.stringify(licenseObj));
                    upgrade_link.data = licenseObj;

                    var upgradeForm = $('<form></form>');
                    upgradeForm.attr('id', 'id_upgrade_form');
                    upgradeForm.attr('action', upgrade_link);
                    upgradeForm.attr('method', 'post');
                    upgradeForm.attr('target', '_blank');
                    for (name in licenseObj) {
                        var licenseInput = $("<input>");
                        licenseInput.attr('name', name);
                        licenseInput.attr('value', licenseObj[name]);
                        upgradeForm.append(licenseInput);
                    }
                    // append to body (required by some browsers.
                    upgradeForm.appendTo('body').submit();
                    setTimeout(function () {
                        upgradeForm.remove();
                    }, 2000);
                });

            }

            function handleResources(event) {
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
                    var sid = (PHD.appliance_sid === null) ? "" : ("?sid=" + PHD.appliance_sid);
                    var url = "/api/license/resources/" + sid;
                    var load = PHD.showLoadingIndicator("body", true, "Loading...");
                    var resp = PHD.Ajax.get(url, load, handleResourceError);
                    resp.done(function (data) {
                        var licenseInfo = data.license;
                        if (licenseInfo !== undefined && licenseInfo instanceof Array && licenseInfo[0].resources !== undefined) {
                            var SettingsDialog = PHD.wizard("app/configure/license/resources.html", "license-resources", {
                                title: "View License Resources",
                                helpArticle: PHD.App.getHelpLink("license-resources", true),
                                width: 540,
                                height: 360,
                                open: function (event, ui) {
                                    var dialog = angular.element(document.getElementById("licenseResources"));
                                    var scope = dialog.scope();
                                    angular.element(document).injector().invoke(function ($compile) {
                                        $compile(dialog.contents())(scope);
                                        scope.PHD = PHD;
                                        scope.resources = licenseInfo[0].resources
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
                        } else {
                            PHD.throwError({"result": [{"message": gettext("Error loading license resource information.")}]});
                        }
                    });
                }

                function handleResourceError(jqXHR, textStatus, errorThrown) {
                    PHD.currentMiniWizard = null;
                    PHD.ajaxError(jqXHR, textStatus, errorThrown);
                }

                function saveCurrentDialog() {
                    PHD.currentDialog = saveDialog;
                }
            }

            /*
             *   DOM Ready Function
             */
            initForm();
        }

        angular.element(document).ready(function () {
            processLicenseTab(PHD, window, $rootScope, $scope, $analytics);
        });
    }]);