
var cookieManager = angular.module('cookie-manager', []);

cookieManager.service("cookiesvc", ['$cookies', '$cookieStore', '$location', function($cookies, $cookieStore, $location) {

    this.get =  function(attr, cookies) {
        var key = createKey(attr);
        var useCookies = cookies || false;
        var value;
        if (useCookies) {
            value = $cookies[key];
        } else {
            value = $cookieStore.get(key);
        }
        return value;
    };

    this.put = function(attr, value){
        var key = createKey(attr);
        $cookieStore.put(key, value);
    };

    this.remove = function(attr){
        var key = createKey(attr);
        $cookieStore.remove(key);
    };

    function createKey(key) {
        var port = $location.port();
        if (!standardPort(port)) {
            key = String(port) + "." + key;
        }
        return key;
    }

    function standardPort(port) {
        return port == 80 || port == 443;
    }
}]);

