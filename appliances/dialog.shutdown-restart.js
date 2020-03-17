editApplianceApp.controller('shutdownRestartCtrl', ['$scope', '$rootScope', '$http','ngDialog', 'gettextCatalog',
    function($scope, $rootScope, $http, ngDialog, gettextCatalog) {

        var $form,
            $btnShutdown,
            $btnRestart,
            $btnCancel,
            $osPassword;

        var loadIndicator;

        function initForm() {

            $form = $("#shutdown-restart-form");
            $btnShutdown = $(".btnShutdown");
            $btnRestart = $(".btnRestart");
            $btnCancel = $(".btnCancel");
            $osPassword = $("#os_password");

            var shutdownRestartForm = PHD.FormController($form, {});
            shutdownRestartForm.submit = function () {
                PHD.throwNotice({"result": [{"message": gettextCatalog.getString("Please Shutdown, Restart, or Cancel to continue.")}]});
                return false;
            };

            $btnShutdown.on("click", handleShutdown);
            $btnRestart.on("click", handleRestart);
            $btnCancel.on("click", handleCancel);

            $btnShutdown.prop("disabled", true);
            $btnRestart.prop("disabled", true);
            // If the password field has non-blank text, enable the buttons.
            $osPassword.on('keyup', function () {
                if ($.trim($osPassword.val()).length > 0) {
                    $btnShutdown.prop("disabled", false);
                    $btnRestart.prop("disabled", false);
                } else {
                    $btnShutdown.prop("disabled", true);
                    $btnRestart.prop("disabled", true);
                }
            });

        }

        function handleCancel(event) {
            console.log('handleCancel');
            PHD.currentMiniWizard.wizard("close");
            // Must clear currentMiniWizard for the next time the dialog is loaded.
            PHD.currentMiniWizard = null;
        }

        function handleShutdown() {
            console.log('handleShutdown');
            if ($form.valid()) {
                var confirm = confirmDialog(
                    "<p>" + gettextCatalog.getString("Are you sure you want to shut down this appliance?") + "</p>" +
                    "<p>" + gettextCatalog.getString("Any running jobs will be interrupted.") + "</p>",
                    {title: gettextCatalog.getString("Confirm Shutdown")},
                    gettextCatalog.getString('Shutdown'),
                    gettextCatalog.getString('Shutdown the appliance')
                );
                confirm.done(function () {
                    doShutdown(false);
                });
            }
        }

        function handleRestart() {
            console.log('handleRestart');
            if ($form.valid()) {
                var confirm = confirmDialog(
                    "<p>" + gettextCatalog.getString("Are you sure you want to restart this appliance?") + "</p>" +
                    "<p>" + gettextCatalog.getString("Any running jobs will be interrupted.") + "</p>",
                    {title: gettextCatalog.getString("Confirm Restart")},
                    gettextCatalog.getString('Restart'),
                    gettextCatalog.getString('Restart the appliance')
                );
                confirm.done(function () {
                    doShutdown(true);
                });
            }
        }

        function confirmDialog(message, options, confirmText, confirmTip) {
            var confirmText = confirmText || gettextCatalog.getString("Confirm");
            var confirmTip = confirmTip || null;
            var promise = $.Deferred(),
                buttons = [
                    {
                        text: confirmText,
                        title: confirmTip,
                        click: function () {
                            promise.resolve();
                            $(this).dialog("destroy").remove();
                        }
                    },
                    {
                        text: gettextCatalog.getString("Cancel"),
                        click: function () {
                            promise.reject();
                            $(this).dialog("destroy").remove();
                        }
                    }
                ];
            options.buttons = buttons;
            options = $.extend({}, PHD.dialogs.confirm, options);

            $("<div/>", {
                id: "dialog-confirm",
                "class": "dialog-box"
            })
                .hide()
                .appendTo("body")
                .html(message)
                .dialog(options);

            // We can't use PHD.confirmDialog because we need to explictly set z-index.
            $('.dialog-confirm').css('z-index', 102);

            return promise;

        }

        function doShutdown(restart) {
            var bRestart = restart || false;
            var url = "/api/systems/shutdown";
            var dots = ".....";
            var message = bRestart ? (gettextCatalog.getString("Initiating appliance restart") + dots) :
                (gettextCatalog.getString("Initiating appliance shutdown") + dots);
            loadIndicator = PHD.showLoadingIndicator('body', true, message);
            var payload = {};
            payload.password = $.trim($osPassword.val());
            payload.restart = bRestart;
            payload = JSON.stringify(payload);
            var resp = PHD.Ajax.put(url, payload, loadIndicator, handleError);
            resp.done(function (data) {
                PHD.currentMiniWizard.wizard("close");
                // Must clear currentMiniWizard for the next time the dialog is loaded.
                PHD.currentMiniWizard = null;
                if (PHD.currentDialog !== undefined) {
                    PHD.currentDialog.wizard("close");
                }
                message = gettextCatalog.getString("The appliance is shutting down at this time.  You can reconnect once the appliance is operational.");
                PHD.throwNotice({"result": [{"message": message}]});
            });

        }

        /*
         * Workaround - since not Angular, cannot use ngDialog.  So that the error will not be behind the
         * shutdown/restart dialog, we manipulate its z-index manually.
         */
        function handleError(jqXHR, textStatus, errorThrown) {
            PHD.hideLoadingIndicator(loadIndicator);
            if (jqXHR.status === 500) {
                var data = jqXHR.responseJSON;
                if (data !== undefined && data.result !== undefined && data.result[0] !== undefined) {
                    var errorText = data.result[0].message;
                    console.log("The error is:" + errorText);
                    errorText = "<p>" + errorText + "</p>";
                    var errorDialog = $("<div/>", {
                        id: "dialog-shutdown-error",
                        title: gettext("Error"),
                        "class": "dialog-box"
                    })
                        .hide()
                        .appendTo("body")
                        .html(errorText)
                        .dialog(PHD.dialogs.alert);
                } else {
                    PHD.throwError(data);
                }
            } else {
                PHD.ajaxError(jqXHR, textStatus, errorThrown);
            }
        }

        /*
         *   DOM Ready Function
         */
        angular.element(document).ready(function() {
            initForm();
        });
    }
]);