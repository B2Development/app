var dateRangeApp = angular.module('date_range', ['ngDialog']);


dateRangeApp.controller('DateRangeCtrl',
    function($scope, $rootScope, $compile, $timeout) {

        $scope.dateRange = {
            'custom_days': 1
        };

        $scope.selectedRange = {};
        $scope.isCustomDate = false;

        // Default to Last backups, in which range start and end are 0.
        $scope.range_start = 0;
        $scope.range_end = 0;

        $scope.handleLastXDays = function(days) {
            var endDate = moment().endOf('day');
            var startDate = moment().subtract(days, 'days').startOf('day');
            return ({'endDate': endDate, 'startDate': startDate});
        };

        $scope.handleLast24Hours = function() {
            var endDate = moment();
            var startDate = moment(endDate).subtract(1, 'days');
            $scope.dateRange = ({'endDate': endDate, 'startDate': startDate});
        };

        $scope.handleLast7Days = function() {
            $scope.dateRange = $scope.handleLastXDays(7);
        };

        $scope.handleLast30Days = function() {
            $scope.dateRange = $scope.handleLastXDays(30);
        };

        $scope.handleLast12Months = function() {
            var endDate = moment().endOf('day');
            var startDate = moment().subtract(1, 'years').startOf('day');
            $scope.dateRange = ({'endDate': endDate, 'startDate': startDate});
        };

        $scope.handleToday = function() {
            $scope.dateRange = $scope.handleLastXDays(0);
        };

        $scope.handleYesterday = function() {

        };

        $scope.handleWeekTo = function() {

        };

        $scope.handleMonthTo = function() {

        };

        $scope.handleQuarterTo = function() {

        };

        $scope.handleYearTo = function() {

        };

        $scope.handleLastWeek = function() {

        };

        $scope.handleLastMonth = function() {

        };

        $scope.handleLastQuarter = function() {

        };

        $scope.handleLastYear = function() {

        };

        $scope.handleCustomTo = function() {

        };

        $scope.handleCustom = function() {

        };

        $scope.handleLastBackups = function() {
            $scope.dateRange = ({'endDate': null, 'startDate': null});
        };

        $scope.handleCustomDays = function() {
            var savedCustomDays = $scope.dateRange.custom_days;
            $scope.dateRange = $scope.handleLastXDays($scope.dateRange.custom_days);
            $scope.dateRange.custom_days = savedCustomDays;
        };

        $scope.browserDateRangeTypes = [
            { label: "Last 24 hours",   handler: $scope.handleLast24Hours },
            { label: "Last 7 Days",     handler: $scope.handleLast7Days },
            { label: "Last 30 Days",    handler: $scope.handleLast30Days },
            { label: "Last 12 Months",  handler: $scope.handleLast12Months }
           /* { label: "Custom Date",     handler: $scope.handleCustom }*/
        ];

        $scope.dateRangeTypes = [
            { label: "Last 24 hours",   handler: $scope.handleLast24Hours },
            { label: "Last 7 Days",     handler: $scope.handleLast7Days },
            { label: "Last 30 Days",    handler: $scope.handleLast30Days },
            { label: "Last 12 Months",  handler: $scope.handleLast12Months },
            /*{ label: "Today",           handler: $scope.handleToday },
            { label: "Yesterday",       handler: $scope.handleYesterday },
            { label: "Week to Date",    handler: $scope.handleWeekTo },
            { label: "Month to Date",   handler: $scope.handleMonthTo },
            { label: "Quarter to Date", handler: $scope.handleQuarterTo },
            { label: "Year to Date",    handler: $scope.handleYearTo },
            { label: "Last Week",       handler: $scope.handleLastWeek },
            { label: "Last Month",      handler: $scope.handleLastMonth },
            { label: "Last Quarter",    handler: $scope.handleLastQuarter },
            { label: "Last Year",       handler: $scope.handleLastYear },
            { label: "Custom to Date",  handler: handleCustomTo }, */
            { label: "Custom Date",     handler: $scope.handleCustom }

        ];

        $scope.archiveDateRangeArray = [
            { label: "Last Backups",    handler: $scope.handleLastBackups },
            { label: "Custom Days",     handler: $scope.handleCustomDays }
        ];

        $scope.dateRangeTypes = $scope.archiveDateRangeArray.concat($scope.dateRangeTypes);

        $scope.onDateRangeChange = function(rangeName) {
            console.log(rangeName);
            for (var i = 0; i < $scope.dateRangeTypes.length; i++) {
                var range = $scope.dateRangeTypes[i];
                if (rangeName == range.label) {
                    $scope.selectedRange = jQuery.extend({}, range);
                    $scope.isCustomDate = range.label == 'Custom Date';
                    range.handler();
                    if (range.label == 'Custom Days') {
                        $scope.dateRange.custom_days = 1;
                    } else if (range.label == 'Custom Date') {
                        $scope.dateRange.endDate = moment();
                        $scope.dateRange.startDate = moment();
                        var endString = moment($scope.dateRange.endDate).format(DATE_DISPLAY_FORMAT);
                        var startString = moment($scope.dateRange.startDate).format(DATE_DISPLAY_FORMAT);
                        $timeout(function() {
                            $("#id_custom_start").datepicker("setDate", startString);
                            $("#id_custom_end").datepicker("setDate", endString);
                        }, 0);
                    }
                    break;
                }
            }
        };

        /*
         * Checks validity of date range.  If both start and end are null, this is last backups, so okay.
         */
        $scope.checkDateRange = function() {
            var isValid = true;
            if ($scope.dateRange.startDate !== null && $scope.dateRange.endDate !== null) {
                var end = moment($scope.dateRange.endDate, DATE_DISPLAY_FORMAT).unix();
                var start = moment($scope.dateRange.startDate, DATE_DISPLAY_FORMAT).unix();
                isValid = (start <= end);
            }
            return isValid;
        };

        $scope.getDateRange = function() {
            var selected = $scope.selectedRange;
            if (selected != null) {
                if (!$scope.isCustomDate) {
                    selected.handler();
                }
            }
            return $scope.dateRange;
        };

        $scope.setDateRange = function (range_end, range_size) {
            if (range_end == 0) {
                $scope.isCustomDate = false;
                switch (range_size) {
                    case 0:
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[0]);
                        break;
                    case 86400:     // Last 24 hours
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[2]);
                        break;
                    case 687599:	//spring forward
                    case 691199:	// Last 7 days = ((8 days * 24 hrs/day * 3600 s/hour) - 1 = nsec
                    case 694799:	//Fall back
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[3]);
                        break;
                    case 2674799:
                    case 2678399:	// Last 30 days = 31 days * 24 * 3600 - 1
                    case 2681999:
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[4]);
                        break;
                    case 31618799:
                    case 31622399:	// Last 12 Months = 366 days * 24 * 3600 - 1
                    case 31625999:
                    case 31708799:  // handle Leap year, 1 more day.
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[5]);
                        break;
                    default:
                        $scope.dateRange.custom_days = Math.round(((range_size + 1) / 24 / 3600) - 1); // convert seconds to days
                        $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[1]); // Custom Days
                        break;
                }
            } else {
                // Custom Date
                $scope.selectedRange = jQuery.extend({}, $scope.dateRangeTypes[$scope.dateRangeTypes.length - 1]);
                $scope.dateRange.endDate = moment(range_end * 1000);
                $scope.dateRange.startDate = moment((range_end - range_size) * 1000);
                var endString = moment($scope.dateRange.endDate).format(DATE_DISPLAY_FORMAT);
                var startString = moment($scope.dateRange.startDate).format(DATE_DISPLAY_FORMAT);
                $timeout(function() {
                    $("#id_custom_start").datepicker("setDate", startString);
                    $("#id_custom_end").datepicker("setDate", endString);
                }, 0);
                $scope.isCustomDate = true;
                $scope.handleCustom();
            }
        };

        $scope.initCtrl = function() {
            $("#id_custom_days").spinner({min: 1, max: 999});
        }

    });
