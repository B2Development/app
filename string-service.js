
var stringsvc = angular.module('strings-module', []);

stringsvc.service("stringsvc", function() {

    this.compareVersions = function(versionA, versionB) {
        // Return 1  if a > b
        // Return -1 if a < b
        // Return 0  if a == b

        if (versionA === versionB) {
            return 0;
        }

        var partsNumberA = versionA.split(".");
        var partsNumberB = versionB.split(".");

        for (var i = 0; i < partsNumberA.length; i++) {

            var a = partsNumberA[i];
            if (i > 3 && a.length > 4) {
                // If we get here, we've checked major.minor.release-dash
                // so they are the same.  If followed by a date, recognize we are done and they are "equal".
                var dateStr = a.substr(0, 4);
                if (dateStr >= '2017') {
                    return 0;
                }
            }

            var valueA = parseInt(partsNumberA[i]);
            var valueB = parseInt(partsNumberB[i]);

            // A bigger than B
            if (valueA > valueB || isNaN(valueB)) {
                return 1;
            }

            // B bigger than A
            if (valueA < valueB) {
                return -1;
            }
        }
    }

});