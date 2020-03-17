angular.module('multipleErrorsController',['ngDialog'])
    .config(['ngDialogProvider', function (ngDialogProvider) {
        ngDialogProvider.setDefaults({
            plain: false,
            showClose: true,
            closeByDocument: true,
            closeByEscape: true,
            appendTo: false,
            preCloseCallback: function (value) {

            }
        });
    }])

    .controller('MultipleErrorCtrl', ['$scope', '$rootScope', '$http', 'AssetService', 'ngDialog', function($scope, $rootScope, $http, AssetService, ngDialog) {

        var $ErrorLogTable = $("#error-table"),
            ErrorTable,allErrors;

        $scope.initCtrl = function() {
            console.log($scope.ngDialogData);
            ErrorTable = PHD.DataTable($ErrorLogTable, {});
            allErrors = [];
            function updateTable() {
                var errorList = $scope.ngDialogData;
                errorList.forEach(function(item,index){
                    console.log(item);
                    var obj = {};
                    obj.message = item;
                    obj.id = index;
                    allErrors.push(obj);
                });
                console.log(allErrors);
                ErrorTable.load(allErrors);
                ErrorTable.load(allErrors);     //why you no work?
            }
            updateTable();
        };

        $scope.$on('ngDialog.opened', function() {
            $scope.initCtrl();
        });
    }]);



