
 // Validations for all wizard steps.
 function checkWizardValidation(wizardTitle){

 // regular expression to match required time format
   	if(wizardTitle === DATE_TIME_WIZARD){
    	timeZoneValidator();
    	dateValidator();
		$("#dateTimeWizForm").validate({
            rules: {  
                date: {
                    required: true,
                    isDateValid: true
                },
                time: {
                    required: true,
					isTimeZoneMatch:true
                },
                timeZone: {
                    required: true
                }
            },
            messages: {
                        date: { required: gettext("Date is required."),
                                isDateValid: gettext("Date format is not valid.") },
                        time:{ required: gettext("Time is required.")},
                        timeZone: gettext("Time zone is required.")

            }
        });
        if((!$('#dateTimeWizForm').valid())) {
            isValidationDone = false;
                return false;
        }else{
            isValidationDone = true;
            return true;
        }
     }
	else if(wizardTitle === HOSTNAME_PASSWORD_WIZARD){
         domainNameValidator();
         $("#form_host").validate({
            rules: {  
                host_name: {
                    required: true,
                    maxlength: 63
                },
                host_domain_name: {
                    required: false,
                    isDomainNameValid: true // Domain name not mandatory hence required false here.
                },
                host_root_password: {
                    required: true
                },
                host_confirm_password: {
                    required: true,
                    equalTo: "#host_root_password"
                }
            },
             messages: {
                 host_name:{
                     required: gettext("Host name is required."),
                     maxlength: gettext("Host name is too long.  The maximum allowed is 63 characters.")
                 },
                 host_root_password: {
                     required: gettext("Root password is required.")
                 },
                 host_confirm_password:{
                     required: gettext("Confirm password is required."),
                     equalTo: gettext("Confirm password and password do not match.")
                 }
             }
        });
        if((!$('#form_host').valid())) {
            isValidationDone = false;
                return false;
        }else{
            isValidationDone = true;
            return true;
        }
     }else if(wizardTitle === EMAIL_WIZARD){
        
         $("#emailQSForm").validate({
            rules: {  
                smtp_server: {
                    required: true
                },
                email_user_name: {
                    required: true
                },
                email_password:{
                    required:true
                },
                email_confirm_pwd:{
                    required:true,
                    equalTo: "#email_password"
                }
            },
             messages: {
                 smtp_server: gettext("Smtp server is required."),
                 email_user_name: gettext("Username is required."),
                 email_password: gettext("Password is required."),
                 email_confirm_pwd:{
                     required: gettext("Confirm password is required."),
                     equalTo: gettext("Confirm password and password do not match.")
                 }
             }
            });
        if((!$('#emailQSForm').valid())) {
                return false;
        }else{
            return true;
        }

    } else if (wizardTitle === OPTIMIZE_WIZARD) {
        isValidationDone = true;
        return true;
        
    } else if (wizardTitle === BACKUP_STORAGE_WIZARD){
        isValidationDone = true;
        return true;

	 }else if(wizardTitle === FORUM_ACCOUNT_WIZARD){
		$("#form_forum_account").validate({
            rules: {  
                forum_acccount_email: {
                    required: true
                },
                forum_account_password:{
                    required: true
                }
            },
            messages: {
                forum_acccount_email: gettext("Unitrends forum account is required."),
                forum_account_password: gettext("Password is required.")
            }
        });
        if((!$('#form_forum_account').valid())) {
            isValidationDone = false;
                return false;
        }else{
            isValidationDone = true;
            return true;
        }
	 }
    return true; // If All steps are valid then it will return true.
}// checkWizardValidation() >> End

function backupStoreNameValidator(totalStorageDiskSize){
    var backupVal = document.getElementById("backup").value;
	$.validator.addMethod("isbackupStoreNameMatch", function(value, element){ 
	          if(backupVal !== 'Internal' && backupVal !== 'internal')
					return true;
				else
					return false;

	}, gettext("Invalid backup store name"));
	
	$.validator.addMethod("isDiskSizeMatch", function(value, element){ 
			 if(totalStorageDiskSize >= 140){
					return true;
				}else{
				   return false;
				}
	}, gettext("Total disk selection should be a minimum size of 140GB"));
	
	$.validator.addMethod("checkException", function(value, element){ 
			 if(checkStorageExceptionFlags){
					return true;
				}else{
				   return false;
				}
	}, gettext("Total disk selection should be a minimum size of 140GB"));
}

function dateValidator() {
    $.validator.addMethod("isDateValid", function(value, element) {
        var $scope = $("[ng-controller=GlobalCtrl]").scope();
        var notValid = DateTimeHandler.dateNotValid(value, $scope.userLanguageCode);
        return !notValid;
    })
}
 function timeZoneValidator(){
     re = /^\d{1,2}:\d{1,2}:\d{1,2}([ap]m)?$/;
     $.validator.addMethod("isTimeZoneMatch", function(value, element) {
         return value.match(re);

     }, gettext("Invalid time format"));
 }

 function domainNameValidator(){
     re = /^[a-zA-Z0-9-_.]*$/;

     $.validator.addMethod("isDomainNameValid", function(value, element) {
         if(value== undefined || value== null || value== ""){
             return true;
         }
         if(value.length >253){
             return false;
         }
         return value.match(re);

     }, gettext("Invalid domain name"));
 }

 /************************************* Validation for Image Level Instant Recovery ********************************************/
 function validateImageLevelInstantRecovery(){
     checkIPFormate();
     checkNetMaskFormate();
     checkGatewayFormate();
     $("#image-level-instant-recovery-location-form").validate({
         errorLabelContainer: ".datetime-dialog-error-list",
         errorContainer: ".datetime-dialog-errors",
         showErrors: function(errorMap, errorList) {
             $(".datetime-dialog-errors").find(".summary")
                 .html(gettext("Correct the following errors:"));
             this.defaultShowErrors();
         },
         rules: {
             imageLevelHypervisorType: {
                 required: true
             },
             imageLevelLocation: {
                 required:true
             },
             imageLevelDatastore: {
                 required:true
             },
             imageLevelLocationNetwork:{
                 required:true
             }/*,
             ipAddress:{
                 required:true,
                 IPFormateChecked:true
             },
             netmask:{
                 required:true,
                 netmaskFormateChecked:true
             },
             gateway:{
                 required:true,
                 gatwayFormateChecked:true
             }*/
         },
         messages: {
             imageLevelHypervisorType:"Type is required",
             imageLevelLocation:"Location is required",
             imageLevelDatastore:"Datastore is required",
             imageLevelLocationNetwork:"Network is required"/*,
             ipAddress: "Invalid IP Address",
             netmask:"Invalid Netmask",
             gateway:"Invalid Gateway"*/
         }
     });
     if((!$('#image-level-instant-recovery-location-form').valid())) {
         return false;
     }else{
         return true;
     }
 }

/************************************* Validation for WIR ********************************************/
function validateWIR(){

    // Access the gettextCatalog service injected into the app.
    var elem = angular.element(document.querySelector('[ng-controller=GlobalCtrl]'));
    var injector = elem.injector();
    var gettextCatalog = injector.get('gettextCatalog');

    checkIPFormate();
    checkNetMaskFormate();
    checkGatewayFormate();
    $("#wir-location-form").validate({
            errorLabelContainer: ".datetime-dialog-error-list",
            errorContainer: ".datetime-dialog-errors",
            showErrors: function(errorMap, errorList) {
                $(".datetime-dialog-errors").find(".summary")
                    .html(gettextCatalog.getString("Correct the following errors:"));
                this.defaultShowErrors();
            },
            rules: {  
                locationType: {
                    required: true
                },
                location: {
                    required:true
                },
                wirDatastore: {
                    required:true
                },
                wirLocationNetwork:{
                    required:true
                },
                ipAddress:{
                    required:true,
                    IPFormateChecked:true
                },
                netmask:{
                    required:true,
                    netmaskFormateChecked:true
                },
                gateway:{
                    required:true,
                    gatwayFormateChecked:true
                }
            },
            messages: {
                locationType:gettextCatalog.getString("Type is required"),
                location:gettextCatalog.getString("Location is required"),
                wirDatastore:gettextCatalog.getString("Datastore is required"),
                wirLocationNetwork:gettextCatalog.getString("Network is required"),
                ipAddress: gettextCatalog.getString("Invalid IP Address"),
                netmask:gettextCatalog.getString("Invalid Netmask"),
                gateway:gettextCatalog.getString("Invalid Gateway")
            }
        });
        if((!$('#wir-location-form').valid())) {
                return false;
        }else{
            return true;
        }
	 }
    function checkIPFormate(){
        
        var ipformate = $("#wir-location-ip").val();
            
         $.validator.addMethod("IPFormateChecked", function(ipformate) { 
                
              var ip = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
             if(ipformate.match(ip)==null ){
                 return false;
             }else if(ipformate.match(ip) !=null){
                return true; //ipformate.match(ip);   
             }
        }, "Invalid IP Format.");
    }
    function checkNetMaskFormate(){
        
        var ipformate = $("#wir-location-mask").val();
            
         $.validator.addMethod("netmaskFormateChecked", function(ipformate) { 
                
              var ip = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
             if(ipformate.match(ip)==null ){
                 return false;
             }else if(ipformate.match(ip) !=null){
                return true; //ipformate.match(ip);   
             }
        }, "Invalid Netmask format.");
    }
    function checkGatewayFormate(){
        
        var ipformate = $("#wir-location-gateway").val();
            
         $.validator.addMethod("gatwayFormateChecked", function(ipformate) { 
                
              var ip = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
             if(ipformate.match(ip)==null ){
                 return false;
             }else if(ipformate.match(ip) !=null){
                return true; //ipformate.match(ip);   
             }
        }, gettext("Invalid Gateway format."));
    }

function checkedValidationVPCOption(isUnitrendAppliance,minProcessors,maxProcessors,minMemory,maxMemory,selectedAppType,memory_step){
	  checkProcessorValidation(minProcessors,maxProcessors);
	  checMemoryValidation(minMemory,maxMemory,selectedAppType,memory_step);
       $("#wir-vfc-form").validate({
            errorLabelContainer: ".datetime-dialog-error-list",
            errorContainer: ".datetime-dialog-errors",
            showErrors: function(errorMap, errorList) {
                $(".datetime-dialog-errors").find(".summary")
                    .html(gettext("Correct the following errors:"));
                this.defaultShowErrors();
            },
            rules: {  
                vfcName: {
                    required: !(isUnitrendAppliance)
                },
                processor:{
                    required: true,
					processorCheck:true
                },
                memory:{
                    required: true,
					memoryCheck:true,
					memoryStepCheck:true
                }
            },
            messages: {
                vfcName:gettext("Name is required"),
			    processor:{ required:gettext("Processors is required")},
                memory:{ required:gettext("Please enter Memory.")}
                
            }
        });
        if((!$('#wir-vfc-form').valid())) {
                return false;
        }else{
            return true;
        }
}

function checkProcessorValidation(minProcessors,maxProcessors){
	 var processor = $("#wir-vfc-processors").val();
	 var memory = $("#wir-vfc-memory").val();
	
	  $.validator.addMethod("processorCheck", function(ipformate) { 
		      if(processor <= minProcessors && processor >= maxProcessors){
                 return false;
             }else if(processor >= minProcessors && processor <= maxProcessors){
                return true; 
             }
        },  gettext("Processor value should be in between ") + minProcessors+" & "+maxProcessors);
	
}

function checMemoryValidation(minMemory,maxMemory,selectedAppType,memoryStep){
	 var processor = $("#wir-vfc-processors").val();
	 var memory = $("#wir-vfc-memory").val();
	 $.validator.addMethod("memoryCheck", function(ipformate) {
    	      if(memory <= minMemory && memory >= maxMemory){
                 return false;
             }else if(memory >= minMemory && memory <= maxMemory){
                return true; 
             }
        }, gettext("Memory value should be in between ") + minMemory +" & "+ maxMemory);
	
	   $.validator.addMethod("memoryStepCheck", function(ipformate) {
		  if(memory % memoryStep !== 0){
                 return false;
             }else if(memory % memoryStep === 0){
                return true; 
             }
        }, gettext("Memory value should be multiple of ") + memoryStep);
	
}
 /************************************* End of Validation for WIR ********************************************/


/*************************************** Validation for Recover Wizard******************************************/
function checkValidationForRecoverOptions(gettextCatalog, hostRequired,resourcePoolRequired,storageRequired,networkRequired,switchRequired){
	  $("#recovery-job-form").validate({
            errorLabelContainer: ".datetime-dialog-error-list",
            errorContainer: ".datetime-dialog-errors",
            showErrors: function(errorMap, errorList) {
                $(".datetime-dialog-errors").find(".summary")
                    .html(gettextCatalog.getString("Correct the following errors:"));
                this.defaultShowErrors();
            },
            rules: {  
                    host: {
                        required: function(element) {
                            return hostRequired;
                        }
                    },
                    resource: {
                        required: function(element) {
                            return resourcePoolRequired;
                        }
                    },
                    storage: {
                        required: function(element) {
                            return storageRequired;
                        }
                    },
                    network: {
                        required: function(element) {
                            return networkRequired;
                        }
                    },
                    hypervisor_switch: {
                        required: function(element) {
                            return switchRequired;
                        }
                    }
            },
            messages: {
				   host: {
							required: gettextCatalog.getString("Target location is required")
						},
						resource: {
							required: gettextCatalog.getString("Target resource pool is required")
						},
						storage: {
							required: gettextCatalog.getString("Target storage is required")
						},
						network: {
							required: gettextCatalog.getString("Target appliance network is required")
						},
						hypervisor_switch: {
							required: gettextCatalog.getString("Target network switch is required")
						}
            }
        });
        if((!$('#recovery-job-form').valid())) {
                return false;
        }else{
            return true;
        }
}

function checkValidationForImageLevelInstantRecoveryLocation(gettextCatalog, isUnitrendAppliance){
    $("#image-level-instant-recovery-location-form").validate({
        errorLabelContainer: ".datetime-dialog-error-list",
        errorContainer: ".datetime-dialog-errors",
        showErrors: function(errorMap, errorList) {
            $(".datetime-dialog-errors").find(".summary")
                .html(gettextCatalog.getString("Correct the following errors:"));
            this.defaultShowErrors();
        },
        rules: {
            imageLevelHypervisorType: {
                required: true
            },
            imageLevelLocation: {
                required: !isUnitrendAppliance
            },
            imageLevelResourcePool: {
                required: !isUnitrendAppliance
            },
            imageLevelDatastore: {
                required: !isUnitrendAppliance
            },
            imageLevelNetworkSwitch: {
                required: !isUnitrendAppliance
            },
            imageLevelLocationNetwork: {
                required: !isUnitrendAppliance
            }
        },
        messages: {
            imageLevelHypervisorType: {
                required: gettextCatalog.getString("Hypervisor type is required")
            },
            imageLevelLocation: {
                required: gettextCatalog.getString("Target location is required")
            },
            imageLevelResourcePool: {
                required: gettextCatalog.getString("Target resource pool is required")
            },
            imageLevelDatastore: {
                required: gettextCatalog.getString("Target storage is required")
            },
            imageLevelNetworkSwitch: {
                required: gettextCatalog.getString("Target network switch is required")
            },
            imageLevelLocationNetwork: {
                required: gettextCatalog.getString("Target appliance network is required")
            }
        }
    });
    if(!$('#image-level-instant-recovery-location-form').valid()) {
        return false;
    }else{
        return true;
    }
}

function checkValidationForExchangeRecoverOptions(gettextCatalog) {
    $("#exchange-recovery-job-form").validate({
        errorLabelContainer: ".datetime-dialog-error-list",
        errorContainer: ".datetime-dialog-errors",
        showErrors: function(errorMap, errorList) {
            $(".datetime-dialog-errors").find(".summary")
                .html(gettextCatalog.getString("Correct the following errors:"));
            this.defaultShowErrors();
        },
        rules: {
            exchange_asset: {
                required: function(element) {
                    return $("#id_recovery_target_select").val() === "0";
                }
            },
            exchange_alt_asset: {
                required: function(element) {
                    return $("#id_recovery_target_select").val() === "1";
                }
            },
            recovery_area: {
                required: function(element) {
                    if($("#id_recovery_database").is(":checked")){
                        return ($("#id_recovery_target_select").val() === "0");
                    }
                    return false;
                }
            },
            original_location: {
                required: function(element) {
                    return !($("#id_recovery_database").is(":checked") || $("#id_original_location").is(":checked"));
                }
            },
            exchange_alt_directory: {
                required: function(element) {
                    return $("#id_recovery_target_select").val() === "1";
                }
            }
        },
        messages: {
            exchange_asset: {
                required: gettextCatalog.getString("Asset is required")
            },
            exchange_alt_asset: {
                required: gettextCatalog.getString("Asset is required")
            },
            recovery_area: {
                required: gettextCatalog.getString("Recovery database is required")
            },
            original_location: {
                required: gettextCatalog.getString("Original location should be accessible")
            },
            exchange_alt_directory: {
                required: gettextCatalog.getString("Directory is required")
            }
        }
    });
    if((!$('#exchange-recovery-job-form').valid())) {
        return false;
    } else {
        return true;
    }
}

function validateDatabaseName(restrictCharacters, databaseName, gettextCatalog) {
    // certain special characters “ < > : * / | ? ‘ [ ] need to be restricted in the database name when restoring to
    // a different instance (not the one where backup was taken from) or,
    // an alternate directory/path - when path is entered in Specify Path
    $.validator.addMethod("databaseNameCheck", function() {
        var invalidCharacters = ["<", ">", ":", "*", "\\", "/", "|", "?", "\"", "'", "[", "]"];
        if (!restrictCharacters) {
            return true;
        }
        for (var i = 0; i < invalidCharacters.length; i++) {
            if (databaseName.indexOf(invalidCharacters[i]) !== -1) {
                return false;
            }
        }
        return true;
    }, gettextCatalog.getString("Database name must not contain <, >, :, *, \\, /, |, ?, \", ', [, ] "));
}

 /*************************************** Validation for SQL Recover Wizard******************************************/
 function checkValidationForSqlRecoverOptions(gettextCatalog, noInPlaceFlag, restrictCharacters) {
     var noInPlace = noInPlaceFlag || false;
     var databaseName = $('#id_recovery_database').val();
     validateDatabaseName(restrictCharacters, databaseName, gettextCatalog);
     $('#sql-recovery-job-form').validate({
         errorLabelContainer: ".datetime-dialog-error-list",
         errorContainer: ".datetime-dialog-errors",
         showErrors: function (errorMap, errorList) {
             $(".datetime-dialog-errors").find(".summary")
                 .html(gettextCatalog.getString("Correct the following errors:"));
             this.defaultShowErrors();
         },
         rules: {
             target: {
                 required: true
             },
             instance: {
                 required: true
             },
             database: {
                 required: true,
                 databaseNameCheck: true
             },
             directory: {
                 required: function(element) {
                     return $("#id_recovery_path_checkbox").is(":checked");
                 }
             }
         },
         messages: {
             target: {
                 required: gettextCatalog.getString("Recovery target is required")
             },
             instance: {
                 required: gettextCatalog.getString("Recovery instance is required")
             },
             database: {
                 required: gettextCatalog.getString("Recovery database is required")
             },
             directory: {
                 required: noInPlace ? gettextCatalog.getString("The target path must be specified as this operator cannot perform in-place restores") :
                                        gettextCatalog.getString("The target path must be specified.")
             }
         }
     });
     if ((!$('#sql-recovery-job-form').valid())) {
         return false;
     } else {
         return true;
     }
 }


 /*************************************** Validation for NDMP Recover Wizard******************************************/
 function checkValidationForNdmpRecoverOptions(gettextCatalog) {
     var volumeValue = $('#id_volume').val();
     validateVolume(volumeValue, gettextCatalog);
     $("#ndmp-recovery-job-form").validate({
         errorLabelContainer: ".datetime-dialog-error-list",
         errorContainer: ".datetime-dialog-errors",
         showErrors: function(errorMap, errorList) {
             $(".datetime-dialog-errors").find(".summary")
                 .html(gettextCatalog.getString("Correct the following errors:"));
             this.defaultShowErrors();
         },
         rules: {
             host: {
                 required: true
             },
             volume: {
                 required: true,
                 volumeCheck: true
             },
             name_directory: {
                 required: false
             }
         },
         messages: {
             host: {
                 required: gettextCatalog.getString("Asset is required")
             },
             volume: {
                 required: gettextCatalog.getString("Volume is required")
             },
             name_directory: {
                 required: gettextCatalog.getString("Directory is required")
             }
         }
     });
     if((!$('#ndmp-recovery-job-form').valid())) {
         return false;
     } else {
         return true;
     }
 }

 /*
  * If the volume is not initialized, the value may be empty or a '?' value.  Check for either.
  */
 function validateVolume(volumeValue, gettextCatalog) {
     $.validator.addMethod("volumeCheck", function() {
         return (volumeValue !== '' && volumeValue !== '?');
     }, gettextCatalog.getString("Volume must be selected"));
 }