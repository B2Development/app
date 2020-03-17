/**
 * Easy to use Wizard library for AngularJS
 */
angular.module('templates-angularwizard', ['step.html', 'wizard.html']);

angular.module("step.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("step.html",
    "<section ng-show=\"selected\" ng-class=\"{current: selected, done: completed}\" class=\"step\" ng-transclude>\n" +
    "</section>");
}]);

angular.module("wizard.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("wizard.html",
    "<div>\n" +
	"   <div class=\"breadcrumbs steps-{{steps.length}}\" ng-if=\"flag == 'false'\">\n" +
	"    <ul>\n" +
    "       <li ng-class=\"{default: !step.completed && !step.selected, active: step.selected && !step.completed, done: step.completed && !step.selected, editing: step.selected && step.completed}\" ng-repeat=\"step in steps\">\n" +
    "        <a ng-click=\"goTo(step)\">{{step.heading || step.wzTitle}}</a>\n" +
    "      </li>\n" +
    "    </ul>\n" +
	"    </div>\n"+
	"    <ul class=\"steps-indicator steps-{{steps.length}}\" ng-if=\"flag == 'true'\">\n" +
    "      <li  ng-class=\"{default: !step.completed && !step.selected, current: step.selected && !step.completed, done: step.completed && !step.selected, editing: step.selected && step.completed}\" ng-repeat=\"step in steps\">\n" +
    "        <a ng-click=\"goTo(step)\">{{step.heading || step.wzTitle}}</a>\n" +
    "      </li>\n" +
    "    </ul>\n" +
	"    <div class=\"steps\" ng-transclude></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module('mgo-angular-wizard', ['ngDialog','templates-angularwizard']);

angular.module('mgo-angular-wizard').config(['ngDialogProvider', function (ngDialogProvider) {
    ngDialogProvider.setDefaults({
        plain: false,
        closeByDocument: true,
        closeByEscape: true,
        appendTo: false,
        preCloseCallback: function (value) {

        }
    });
}]);

angular.module('mgo-angular-wizard').service('wizardService', ['$rootScope','$http','ngDialog',function($rootScope,$http,ngDialog){

	//Next button function in service
	this.nextWizard = function(dataObject){
	     console.log(dataObject);
		 	$http({
				method: dataObject.method,
				url : dataObject.url,
				params: dataObject.params,
				data: JSON.stringify(dataObject.wizardFormData)
			}).success(function(data, status, headers){
              	$rootScope.$root.$broadcast("nextBtnClick"); 
				$rootScope.$broadcast("nestedFunction"); 
                ngDialog.closeAllDialog();
			}).error(function(response) { 
                if(response != null){
                    ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'replication-dailog',
                        dialogMessage:response.result[0].message
                    })
                }else{
                   ngDialog.open({
                        dialogType:'retry',
                        modelDialogId:'replication-dailog',
                        dialogMessage:"Server Error Occur"
                    }) 
                }
                
			});
		}
      
}]);

angular.module('mgo-angular-wizard').directive('wzStep', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            wzTitle: '@',
            heading: '@'
			
        },
        require: '^wizard',
        templateUrl: function(element, attributes) {
          return attributes.template || "step.html";
        },
        link: function($scope, $element, $attrs, wizard) {
            $scope.heading = $scope.heading || $scope.wzTitle;
		    wizard.addStep($scope);
        }
    }
});

angular.module('mgo-angular-wizard').directive('wizard', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            currentStep: '=',
		    onFinish: '&', 
			onNext:'&',
            onPrevious: '&',
		    hideIndicators: '=',
            flag: '@',
            editMode: '=',
            name: '@'
        },
        templateUrl: function(element, attributes) {
          return attributes.template || "wizard.html";
        },
        controller: ['$scope', '$rootScope','$element', 'WizardHandler', function($scope,$rootScope, $element, WizardHandler){
            /*
            TODO when Auto Tune is enabled
             //to check appliance is physical or not.
			 $scope.isRecoverySeriesAppliance = $rootScope.isRecoverySeries;
			 */
			
            WizardHandler.addWizard($scope.name || WizardHandler.defaultName, this);
            $scope.$on('$destroy', function() {
                WizardHandler.removeWizard($scope.name || WizardHandler.defaultName);
            });
            
            $scope.steps = [];
            
            $scope.$watch('currentStep', function(step) {
                if (!step) return;
                
                if ($rootScope.selectedStep && $rootScope.selectedStep.heading !== $rootScope.currentStep) {
                    $scope.goTo(_.find($scope.steps, {heading: $scope.currentStep}));
                }
                
            });
            
            $scope.$watch('[editMode, steps.length]', function() {
                var editMode = $scope.editMode;
                if (_.isUndefined(editMode) || _.isNull(editMode)) return;
                
                if (editMode) {
                    _.each($scope.steps, function(step) {
                        step.completed = true;
                    });
                }
            }, true);
            
            this.addStep = function(step) {
                $scope.steps.push(step);
                if ($scope.steps.length === 1) {
                    $scope.goTo($scope.steps[0]);
                }
            };
            
            $scope.goTo = function(step) {
				 unselectAll();
			    $scope.selectedStep = step;
			    if (!_.isUndefined($scope.currentStep)) {
                    $scope.currentStep = step.heading;    
			      }
				 step.selected = true;
         	 };
            
            function unselectAll() {
                _.each($scope.steps, function (step) {
                    step.selected = false;
                });
                $scope.selectedStep = null;
            }
			/* Added new event for next button click event for wizard.*/
			$rootScope.$on('nextBtnClick', function (event){
			
				var draft;
				index = _.indexOf($scope.steps , $scope.selectedStep); 
				 nextStepIndex = index + 1;
				 wizardTitle = $scope.selectedStep.heading; 	// getting current Wizard Title.
					   if (!draft) {
							$scope.selectedStep.completed = true;
						}
						if (index === $scope.steps.length - 1) {
							 $scope.finish();
						} else {
						 $scope.goTo($scope.steps[index + 1]);
						}
			   });
			   
            /* Updated next button logic***********/
            this.next = function(draft) {
			     wizardTitle = $scope.selectedStep.heading; 
					$scope.onNext && $scope.onNext(); 
			};
            
            this.goTo = function(step){
			    var stepTo;
                if (_.isNumber(step)) {
                    stepTo = $scope.steps[step];
                } else {
                    stepTo = _.find($scope.steps, {heading: step});
                }
                $scope.goTo(stepTo);
            };
            
            $scope.finish = function() {
                $scope.onFinish && $scope.onFinish(); 
            };
            
			/*this.cancel = function() {
			      var index = _.indexOf($scope.steps , $scope.selectedStep); 
				    if(index >0){
				 	  $scope.goTo($scope.steps[0]);
					  $scope.selectedStep.completed =false;
				    }
				    $scope.onCancel && $scope.onCancel(); 
			}*/
			 
            this.cancel = function() {
                var index = _.indexOf($scope.steps , $scope.selectedStep);
                if (index === 0) {
                    throw new Error("Can't go back. It's already in step 0");
                } else {
                    $scope.goTo($scope.steps[index - 1]);
                }
            };

            this.previous = function() {
                this.cancel();
                wizardTitle = $scope.selectedStep.heading;
                $scope.onPrevious && $scope.onPrevious();
            };
            
        }]
    }
});

function wizardButtonDirective(action) {
  angular.module('mgo-angular-wizard')
        .directive(action, function() {
            return {
                restrict: 'A',
                replace: false,
                require: '^wizard',
                link: function($scope, $element, $attrs, wizard) {
                    $element.on("click", function(e) {
                        e.preventDefault();
                        $scope.$apply(function() {
                            $scope.$eval($attrs[action]);
                            wizard[action.replace("wz", "").toLowerCase()]();
                        });
                    });
                }
            }
		});
}

wizardButtonDirective('wzNext');
wizardButtonDirective('wzPrevious');
wizardButtonDirective('wzFinish');
wizardButtonDirective('wzCancel');
//wizardButtonDirective('wzOptimize');

angular.module('mgo-angular-wizard').factory('WizardHandler', function() {
   var service = {};
   
   var wizards = {};
   
   service.defaultName = "defaultWizard";
   
   service.addWizard = function(name, wizard) {
       wizards[name] = wizard;
   };
   
   service.removeWizard = function(name) {
       delete wizards[name];
   };
   
   service.wizard = function(name) {
       var nameToUse = name;
       if (!name) {
           nameToUse = service.defaultName;
       }
       
       return wizards[nameToUse];
   };
   
   return service;
});