var sortsvc = angular.module('sort-module', []);

sortsvc.service("sortsvc", function() {

    this.ipSortSeparate = function(a, b){
        if (typeof a !== "string") {
            return -1;
        } else if (typeof b !== "string") {
            return 1;
        } else {
            a = a.split('.');
            b = b.split('.');
            for (var i = 0; i < a.length; i++) {
                a[i] = parseInt(a[i]);
                b[i] = parseInt(b[i]);
                if (a[i] < b[i]) {
                    return -1;
                } else if (a[i] > b[i]) {
                    return 1;
                }
            }
            return 0;
        }
    }
});
