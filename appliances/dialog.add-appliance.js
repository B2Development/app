(function($, PHD, window, undefined) {

    var $form = $("#form-add-appliance");

    var applianceForm,
        FQDN_REGEXP = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/i;

    function initForm() {

        // Copy system name to host.
        $("#id_name").focusout(function() {
            console.log("in function, name = " + $("#id_name").val());
            $("#id_host").val($("#id_name").val());
            console.log("in function, host = " + $("#id_host").val());
        });

        $form.find(".definition").popover({
            appendTo: $form
        });

        applianceForm = PHD.FormController($form, {
            serialize: function($form) {
                return $form.find("input").serialize();
            }
        });

        applianceForm
            .validate({
                rules: {
                    ip: {
                        required: true,
                        pattern: FQDN_REGEXP
                    }
                },
                messages: {
                    ip: {
                        required: gettext("IP Address is required"),
                        pattern: gettext("IP Address is not a valid address")
                    }
                }
            })
            .on("formcancel", function(event) {
                PHD.currentDialog.wizard("close");
            })
            .on("formsubmit", function(event, data) {
                $(document).trigger("vbaadd");
                PHD.currentDialog.wizard("close");
                if(typeof data.result !== 'undefined' && data.result[0].code != AJAX_RESULT_SUCCESS) {
                    PHD.throwNotice(data);
                }
            });
    }

    /*
    *   DOM Ready Function
    */
    $(function() {
        PHD.currentDialog.one("wizardfocus", function() {
            initForm();
        });
    });

})(jQuery, window.PHD || (window.PHD = {}), window);
