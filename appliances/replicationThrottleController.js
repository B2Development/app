angular.module('replicationThrottleScheduleModule', ['ngDialog',"checklist-model"])
.controller('replicationThrottleController', ['$scope', '$rootScope', '$http','ngDialog', 'gettextCatalog',
    function($scope, $rootScope, $http,ngDialog, gettextCatalog) {
     $scope.processScheduleModel = function (dataArray){
        for (var i =0 ; i <dataArray.length ; i ++){
            dataArray[i].show = false;
           return  dataArray;
        }
     };
    $scope.init = function () {
        $scope.throttleSchedulesList =[];
        $scope.item={};
        $scope.connectionTypes=[];
        $scope.connectionType={};
        $scope.showSchedule=[];
        $scope.throttleLabel="Throttle";
        $scope.connectionTypeLabel= gettextCatalog.getString("Connection Type");
        $scope.daysLabel="Days";
        $scope.typesLabel="Type";
        $scope.customText = "Custom";
        $scope.percentOptions = [
            { id : 0, name: "0%" },
            { id : 10, name: "10%" },
            { id : 20, name: "20%" },
            { id : 30, name: "30%" },
            { id : 40, name: "40%" },
            { id : 50, name: "50%" },
            { id : 60, name: "60%" },
            { id : 70, name: "70%" },
            { id : 80, name: "80%" },
            { id : 90, name: "90%" },
            { id : 100,name: "100%"}
        ];
        $scope.timeOptions = [
            { id : 0,  name: "12AM" },
            { id : 1,  name: "1AM" },
            { id : 2,  name: "2AM" },
            { id : 3,  name: "3AM" },
            { id : 4,  name: "4AM" },
            { id : 5,  name: "5AM" },
            { id : 6,  name: "6AM" },
            { id : 7,  name: "7AM" },
            { id : 8,  name: "8AM" },
            { id : 9,  name: "9AM" },
            { id : 10, name: "10AM"},
            { id : 11, name: "11AM" },
            { id : 12, name: "12PM" },
            { id : 13, name: "1PM" },
            { id : 14, name: "2PM" },
            { id : 15, name: "3PM" },
            { id : 16, name: "4PM" },
            { id : 17, name: "5PM" },
            { id : 18, name: "6PM" },
            { id : 19, name: "7PM" },
            { id : 20, name: "8PM" },
            { id : 21, name: "9PM" },
            { id : 22, name: "10PM" },
            { id : 23, name: "11PM" }
        ];
        $scope.timeEndOptions = [
            { id : 0,  name: "1AM" },
            { id : 1,  name: "2AM" },
            { id : 2,  name: "3AM" },
            { id : 3,  name: "4AM" },
            { id : 4,  name: "5AM" },
            { id : 5,  name: "6AM" },
            { id : 6,  name: "7AM" },
            { id : 7,  name: "8AM" },
            { id : 8,  name: "9AM" },
            { id : 9,  name: "10AM" },
            { id : 10, name: "11AM"},
            { id : 11, name: "12PM" },
            { id : 12, name: "1PM" },
            { id : 13, name: "2PM" },
            { id : 14, name: "3PM" },
            { id : 15, name: "4PM" },
            { id : 16, name: "5PM" },
            { id : 17, name: "6PM" },
            { id : 18, name: "7PM" },
            { id : 19, name: "8PM" },
            { id : 20, name: "9PM" },
            { id : 21, name: "10PM" },
            { id : 22, name: "11PM" },
            { id : 23, name: "12AM" }
        ];
        $scope.typeOptions=[
            { id : 0,  name: gettextCatalog.getString("Hours") },
            { id : 1,  name: gettextCatalog.getString("All Day") }
        ];
        $scope.scheduleDays=[
            {'name': gettextCatalog.getString('Monday'),   'value' : 1},
            {'name': gettextCatalog.getString('Tuesday'),  'value' : 2},
            {'name': gettextCatalog.getString('Wednesday'),'value' : 3},
            {'name': gettextCatalog.getString('Thursday'), 'value' : 4},
            {'name': gettextCatalog.getString('Friday'),   'value' : 5},
            {'name': gettextCatalog.getString('Saturday'), 'value' : 6},
            {'name': gettextCatalog.getString('Sunday'),   'value' : 0}
        ];
    };

    $scope.showThrottleTooltip = function(){
        var form = angular.element("#bandwidth-throttle-form");
        form.find(".definition").popover({
            appendTo: form
        });
    };

    $scope.$on('ngDialog.opened', function(event, obj) {
        switch (obj.name){
            case 'replication-bandwidth-dialog':
                $scope.showThrottleTooltip();
                break;
            default:
                // No action.
                break;
        }
    });
	
	 $scope.bandwidthArray = [];
     $http({
         method: 'GET',
         url: '/api/replication/throttle/?sid='+$rootScope.replicationApplianceId
     }).success(function(resultdata, status, headers){
		  var bandwidthsData = resultdata.bandwidths;
		  angular.forEach(bandwidthsData, function (data, key) {
				var bandwidthTempObj = {};
				bandwidthTempObj.value = data.value;
				bandwidthTempObj.name = data.name;
				$scope.bandwidthArray.push(bandwidthTempObj);
                
				if(data.selected){
					delete data.selected;
					$scope.connectionType= data;
				}
		  });
		 
		   $scope.connectionTypes = $scope.bandwidthArray;
		   var throttleDataArray = resultdata.throttle;
		 if(throttleDataArray.length >0){
			 $scope.throttleSchedulesList =$scope.processScheduleModel(throttleDataArray);
		 }
           
	  });
	
	
    $scope.updateTypeModel =function(index){
       if( $scope.throttleSchedulesList[index].type ==1){
           $scope.throttleSchedulesList[index].start=0
           $scope.throttleSchedulesList[index].end=23;
       }
    }
    $scope.addSchedule =function(){
        var dataObjArray=[{
             "percentage":10,
             "days" :[0],
             "type":"Hours",
             "end":12,
             "start":1
             
         }]
         var dataObj=  $scope.processScheduleModel(dataObjArray);
		 
         $scope.throttleSchedulesList.push(dataObj[0]);
         $scope.showHideSchedule( $scope.throttleSchedulesList.length-1,"showSchedule"); 
    }
    $scope.removeSchedule = function(index){
        $scope.throttleSchedulesList.splice(index,1);
        $scope.throttleSchedulesList = $scope.throttleSchedulesList;
    }
    $scope.showHideSchedule = function(index,flag){
         if (typeof(flag) != "undefined"){
             for (var i =0 ; i < $scope.throttleSchedulesList.length ; i++){
                       $scope.throttleSchedulesList[i].show = false;   
             }
             $scope.throttleSchedulesList[index].show = true;
         } else {
             if ($scope.throttleSchedulesList[index].show){
                $scope.throttleSchedulesList[index].show = !$scope.throttleSchedulesList[index].show;
              } else {
                for (var i =0 ; i < $scope.throttleSchedulesList.length ; i++){
                       $scope.throttleSchedulesList[i].show = false;   
                }
                $scope.throttleSchedulesList[index].show = true;
              }
         }
    }
    $scope.validateform = function(){
        $scope.validForm = true;
        $scope.iteration=0;
		
		 if($scope.connectionType.name == $scope.customText){
			if($scope.connectionType.value == ""){
			 $scope.validForm =false;
			 return;
			}
		 }
        for (var i =0 ;  i < $scope.throttleSchedulesList.length ; i++){
              if ($scope.throttleSchedulesList[i].type== 0 && $scope.throttleSchedulesList[i].start > $scope.throttleSchedulesList[i].end){
                  $scope.validForm =false;
                  console.log("error1");
                  $scope.iteration=i;
                  break;
              } else if ( $scope.throttleSchedulesList[i].days.length ==0  ){
                  $scope.validForm =false;
                  $scope.iteration=i;
                  console.log("error2" +$scope.iteration );
                  break;
                  // Allow 0 throttle
              /*} else if ($scope.throttleSchedulesList[i].percentage == 0){
                  $scope.validForm =false;
                  $scope.iteration=i;
                  console.log("error2" +$scope.iteration );
                  break;*/
              }
        }
    }
    $scope.saveThrottleSchedule = function(){
	 var throttlePutObj ={};	
      $scope.validateform();
      if ($scope.validForm ){
          var throttleSchedulistData = $scope.throttleSchedulesList;
		  angular.forEach(throttleSchedulistData, function (data, key) {
			  delete data.show;
			  delete data.type;
			  delete data.$$hashKey;
			  });
		  console.log($scope.connectionType);
		  throttlePutObj.bandwidth = $scope.connectionType.value;	  
		  throttlePutObj.throttle = throttleSchedulistData;
		
		  console.log(JSON.stringify(throttlePutObj));
	
		 $http({
			 method: 'PUT',
			 url: '/api/replication/throttle/?sid='+$rootScope.replicationApplianceId,
			 data: JSON.stringify(throttlePutObj)
         }).success(function(resultdata, status, headers){
			  ngDialog.open({
                    dialogType:'Information',
				    scope:$scope,
                    dialogMessage:"Configured bandwidth successfully."
                });
			 //ngDialog.close('replication-bandwidth-dailog');
		 }).error(function(response) { 
			 ngDialog.open({
			 dialogType:'retry',
			 dialogMessage:response.result[0].message
			})
         });
	   } else{
        $scope.showHideSchedule($scope.iteration,"showSchedule");  
      }
    } 
	
 }]);