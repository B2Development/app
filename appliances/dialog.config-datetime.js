editApplianceApp.controller('DateTimeCtrl', ['$scope', '$rootScope', '$http', '$analytics', 'gettextCatalog',
    function($scope, $rootScope, $http, $analytics, gettextCatalog) {

        function processDateTimeTab(PHD, window, $rootScope, $scope, $analytics) {

            var $form = $("#form-datetime-appliance"),
                $ntpServerRule = $("#app_ntpserver_checkbox"),
                DateTimeForm,
                DATE_FORMAT = $rootScope.DATE_FORMAT,
                DATE_DISPLAY_FORMAT = $rootScope.DATE_DISPLAY_FORMAT,
                TIME_REGEXP = /^([01]?[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
                isrepeat = (typeof(isrepeat) != 'undefined') ? isrepeat : false;


            function initForm() {
                $ntpServerRule.on("click", ntpServerUpdate);
                $form.find(".definition").popover({
                    appendTo: $form
                });

                DateTimeForm = PHD.FormController($form, {
                    serialize: function ($form) {
                        return $form.find("input").serialize();
                    }
                });

                DateTimeForm = PHD.FormController($form, {})
                    .validate({
                        errorLabelContainer: ".datetime-dialog-error-list",
                        errorContainer: ".datetime-dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $(".datetime-dialog-errors").find(".summary")
                                .html(gettext("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            appliance_date: {
                                required: true
                            },
                            appliance_time: {
                                required: true,
                                pattern: TIME_REGEXP
                            },
                            appliance_timezone: {
                                required: true
                            },
                            appliance_ntpserver: {
                                isntpServerAvailable: true
                            }
                        },
                        messages: {
                            appliance_date: {
                                required: gettext("Date is required")
                            },
                            appliance_time: {
                                required: gettext("Time is required"),
                                pattern: gettext("Time format is not valid")
                            },
                            appliance_timezone: {
                                required: gettext("Time Zone is required")
                            }
                        }
                    })
                    .on("formcancel", function (event) {
                        PHD.currentDialog.wizard("close");
                    })
                    .on("formsubmit", function (event, data) {
                        //PHD.currentDialog.wizard("close");
                    })

                $.validator.addMethod("isntpServerAvailable", function (value, element) {
                    var data = document.getElementById("ntpTable").rows;
                    var ntpServerTotal = data.length;
                    if ($("#app_ntpserver_radioselection").prop("checked") == true) {
                        if (ntpServerTotal > 0) {
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        return true;
                    }
                }, "Atleast one NTP server should be present");

                $.validator.addClassRules("data-table", {
                    isntpServerAvailable: true
                });

                $("#btnEditDateTimeSave").click(function () {
                    var self = this;

                    if ($form.valid()) {
                        var dateTimeData = {};
                        var ntpServerObj = {};

                        if ($('#app_ntpserver_radioselection').prop("checked") == true) {
                            dateTimeData.tz = $('#appliance_timezone option:selected').val();
                            ntpServerObj.enabled = true;
                            ntpServerObj.servers = [];

                            var data = document.getElementById("ntpTable").rows;
                            for (var j = 0; j < data.length; j++) {
                                var ntpServerList = document.getElementById("ntpTable").rows[j].cells[0].innerHTML;
                                if (ntpServerList.length != 0) {
                                    ntpServerObj.servers.push(ntpServerList);
                                }

                            }
                            dateTimeData.ntp = ntpServerObj;
                        } else {
                            var dateData = $('#appliance_date').val();
                            var dateDataField = dateData.split("/");
                            dateTimeData.month = parseInt(dateDataField[0]);
                            dateTimeData.day = parseInt(dateDataField[1]);
                            dateTimeData.year = parseInt(dateDataField[2]);

                            var timeData = $('#appliance_time').val();
                            var timeDataField = timeData.split(":");
                            dateTimeData.hour = parseInt(timeDataField[0]);
                            dateTimeData.minute = parseInt(timeDataField[1]);
                            dateTimeData.second = parseInt(timeDataField[2]);

                            dateTimeData.tz = $('#appliance_timezone option:selected').val();
                            ntpServerObj.enabled = false;
                            dateTimeData.ntp = ntpServerObj;
                        }


                        dateTimeData = JSON.stringify(dateTimeData);

                        var url = "/api/date-time/";
                        var sid = (PHD.appliance_sid === null) ? "" : "?sid=" + PHD.appliance_sid;
                        url += sid;
                        var load = PHD.showLoadingIndicator($form);

                        PHD.Ajax
                            .put(url, dateTimeData, load)
                            .done(function (data) {
                                PHD.hideLoadingIndicator(load);

                                if (typeof data.result !== 'undefined' && data.result[0].code != AJAX_RESULT_SUCCESS) {
                                    PHD.throwNotice(data);
                                } else {
                                    PHD.currentDialog.wizard("close");
                                }
                            })
                            .always(function () {
                                PHD.hideLoadingIndicator(load);
                            });

                        return this;
                    }
                });

                $("#btnAddNtpServer").click(function () {
                    var table = $("#ntpTable")[0];
                    var ntpServerName = $("#id_addNtpServerAddress").val();

                    if ((ntpServerName === "") || (typeof(ntpServerName) == undefined)) {
                        return;
                    }
                    var rowCount = table.rows.length;
                    var row = table.insertRow(rowCount);
                    var cell1 = row.insertCell(0);
                    cell1.innerHTML = ntpServerName;

                    var cell2 = row.insertCell(1);
                    cell2.innerHTML = '<span class="btn-remove-recipient" style="float:right;padding-right:10px;"><i title="Remove" onclick="deleteNtpServer(this)" class="icon-removesign"></i></span>';
                    $("#id_addNtpServerAddress").val("");
                });

                $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                    var DATE_TIME_INDEX = 3;
                    if (ui.oldTab.index() === DATE_TIME_INDEX) {
                        var currentData = jQuery.extend(true, {}, ui.currentData);
                        var editedDataObject = jQuery.extend(true, {}, currentData);
                        var dateTimeData = {};
                        var ntpServerObj = {};

                        var dateData = $('#appliance_date').val();
                        var dateDataField = dateData.split("/");
                        editedDataObject.month = parseInt(dateDataField[0]);
                        editedDataObject.day = parseInt(dateDataField[1]);
                        editedDataObject.year = parseInt(dateDataField[2]);

                        var timeData = $('#appliance_time').val();
                        var timeDataField = timeData.split(":");
                        editedDataObject.hour = parseInt(timeDataField[0]);
                        editedDataObject.minute = parseInt(timeDataField[1]);
                        editedDataObject.second = parseInt(timeDataField[2]);

                        editedDataObject.tz = $('#appliance_timezone option:selected').val();

                        if ($('#app_ntpserver_radioselection').prop("checked") == true) {
                            if (editedDataObject.ntp === undefined) {
                                editedDataObject.ntp = {};
                            }
                            editedDataObject.ntp.enabled = true;
                        } else {
                            if (editedDataObject.ntp === undefined) {
                                editedDataObject.ntp = {};
                            }
                            editedDataObject.ntp.enabled = false;
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

            $("input[name=datetimeradiogroup]:radio").change(function () {
                if ($("#app_datetime_radioselection").prop("checked")) {
                    $('#divAddNtpServer *').attr('disabled', 'disabled');
                    $('#ntpTable').find('i').removeClass('icon-removesign');
                    $('#appliance_date').removeAttr('disabled');
                    $('#datechangediv .ui-datepicker-trigger').removeAttr('disabled');
                    $('#appliance_time').removeAttr('disabled');
                    $('#appliance_timezone').removeAttr('disabled');
                }
                else if ($("#app_ntpserver_radioselection").prop("checked")) {
                    $('#datechangediv .ui-datepicker-trigger').attr('disabled', 'disabled');
                    $('#appliance_date').attr('disabled', 'disabled');
                    $('#appliance_time').attr('disabled', 'disabled');
                    $('#appliance_timezone').attr('disabled', 'disabled');
                    $('#divAddNtpServer *').removeAttr('disabled');
                    $('#ntpTable').find('i').addClass('icon-removesign');
                }
            });

            /* Set date picker style */
            $(".datepicker input:text").datepicker({
                showOn: "both",
                buttonText: '<img src="assets/images/calendar.png" width="24" height="24">',
                dateFormat: DATE_FORMAT
            }).attr("placeholder", DATE_DISPLAY_FORMAT);

            function ntpServerUpdate() {
                console.log($('#app_ntpserver_checkbox').prop("checked"));
                if ($('#app_ntpserver_checkbox').prop("checked") == true) {
                    $('#divAddNtpServer *').removeAttr('disabled');
                    $('#ntpTable').find('i').addClass('icon-removesign');
                    $('#appliance_timezone').attr('disabled', 'disabled');
                    $('#appliance_time').attr('disabled', 'disabled');
                    $('#appliance_date').attr('disabled', 'disabled');
                    $('#datechangediv .ui-datepicker-trigger').attr('disabled', 'disabled');
                } else {
                    $('#appliance_timezone').removeAttr('disabled');
                    $('#appliance_time').removeAttr('disabled');
                    $('#appliance_date').removeAttr('disabled');
                    $('#datechangediv .ui-datepicker-trigger').removeAttr('disabled');
                    $('#divAddNtpServer *').attr('disabled', 'disabled');
                    $('#ntpTable').find('i').removeClass('icon-removesign');
                }
            }

            function timeZoneValidator() {
                re = /^\d{1,2}:\d{1,2}:\d{1,2}([ap]m)?$/;
                var timeFieldVal = document.getElementById("appliance_time").value;
                /* To check root password and Confirm matching or not. */
                $.validator.addMethod("isTimeZoneMatch", function (value, element) {
                    if (timeFieldVal.match(re))
                        return true;
                    else
                        return false;

                }, "Invalid time format");
            }

            function validateNtpServer() {
                var data = document.getElementById("ntpTable").rows;
                var ntpServerTotal = data.length;
                if ($("#app_ntpserver_radioselection").prop("checked") == true) {
                    if (ntpServerTotal > 0) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            }

            /* DOM Ready Function */
            initForm();
        }

        angular.element(document).ready(function () {
            processDateTimeTab(PHD, window, $rootScope, $scope, $analytics);
        });

    }]);

/* function to delete row from NTP Server table */
function deleteNtpServer(r){
    var i = r.parentNode.parentNode.parentNode.rowIndex;
    document.getElementById("ntpTable").deleteRow(i);
}