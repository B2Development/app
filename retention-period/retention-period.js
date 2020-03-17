
var retentionPeriodApp = angular.module('retention-period', ['ngDialog']);


retentionPeriodApp.controller('RetentionPeriodCtrl',
    function($scope, $rootScope, $compile, $timeout, gettextCatalog) {

        $scope.retention_days = 0;

        $scope.retentionLabel = gettext('Cold Backup Copy Retention Days');

        /*
         * Code borrowed from Cold backup copy job for retention spinner.  Ideally, this should be in a reusable component.
         */
        var retentionSpinner,
            $retentionCheckbox,
            $retentionPeriod,
            $retentionAmount,
            retentionAmount,

            retentionOptions = {
                years: {
                    max: 999,
                    min: 1,
                    step: 1
                },
                months: {
                    max: 999,
                    min: 1,
                    step: 1
                },
                weeks: {
                    max: 999,
                    min: 1,
                    step: 1
                },
                days: {
                    max: 999,
                    min: 1,
                    step: 1
                }
            };

        function handleRetentionState($el) {
            var checked = $el.is(":checked");
            retentionSpinner.spinner("option","disabled", !checked);
            $retentionPeriod.prop("disabled", !checked);
        }

        function setRetentionInputValue(enabled) {
            var multiplier = enabled ? $retentionPeriod.val() : 0;
            $scope.retention_days = $retentionAmount.val() * multiplier;
        }

        function initRetentionControls() {

            $retentionCheckbox = $("#retention-checkbox");
            $retentionPeriod = $("#retention-period");
            $retentionAmount = $("#retention-amount");
            retentionAmount = $retentionAmount.val();

            retentionSpinner = $retentionAmount.spinner(retentionOptions.days);
            retentionSpinner.on("spinchange", function() {
                var val = parseFloat($(this).val());
                if(!isNaN(val) && val > 0) {
                    val = Math.round(val);
                    $(this).spinner("value", val);
                } else {
                    $(this).spinner("value", 1);
                }
            });

            $retentionPeriod.on("change", function(event) {

                retentionSpinner
                    .spinner("option", "min", 1)
                    .spinner("option", "max", 999)
                    .spinner("option", "step", 1);

            });

            $retentionCheckbox.on("change", function(event) {
                handleRetentionState($(this));
            }).trigger("change");
        }

        $scope.initCtrl = function() {
            initRetentionControls();
        };

        // on load of the job options, init the dialog.
        $scope.$on("Retention-Loaded", function(event, retention_days) {
            if(retention_days !== undefined && retention_days !== 0) {
                if(retention_days % 365 == 0) {
                    $retentionAmount.val(retention_days / 365);
                    retentionSpinner = $retentionAmount.spinner(retentionOptions.years);
                    $retentionPeriod.val('365');
                } else if(retention_days % 30 == 0) {
                    $retentionAmount.val(retention_days / 30);
                    retentionSpinner = $retentionAmount.spinner(retentionOptions.months);
                    $retentionPeriod.val('30');
                } else if(retention_days % 7 == 0) {
                    $retentionAmount.val(retention_days / 7);
                    retentionSpinner = $retentionAmount.spinner(retentionOptions.weeks);
                    $retentionPeriod.val('7');
                } else {
                    $retentionAmount.val(retention_days);
                    retentionSpinner = $retentionAmount.spinner(retentionOptions.days);
                    $retentionPeriod.val('1');
                }
                $retentionCheckbox.prop('checked', true);
                handleRetentionState($retentionCheckbox);
            }
        });


        $scope.getRetentionDays = function() {
            setRetentionInputValue($retentionCheckbox.prop("checked"));
            return $scope.retention_days;
        };
});
