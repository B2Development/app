editApplianceApp.controller('UsersCtrl', ['$scope', '$rootScope', '$http', '$analytics', '$timeout', 'gettextCatalog', 'ngDialog',
    function($scope, $rootScope, $http, $analytics, $timeout, gettextCatalog, ngDialog) {

    $scope.activeDirectorySettings = {};

        function processUsersTab(PHD, window, $rootScope, $scope, $analytics, $timeout) {

            var $form = $("#users-edit-form"),
                allUsers,
                UsersTable,
                $usersTable,
                UsersForm,
                $btnAddUser = $(".users-add"),
                $btnEditUser = $(".users-edit"),
                $btnDeleteUser = $(".users-delete"),
                $btnSaveUser = $(".users-save"),
                $btnCancel = $(".users-cancel"),
                roleSelect,
                $roleSelect = $("#role"),
                roleAccessSelect,
                $roleAccessSelect = $("#role-access"),
                $btnRoleScope = $("#button-role-scope"),
                $supportsRoles = $("#supports-roles"),
                EditUser = false,
                UsersRowData, id, username, superuser, customers = {}, locations = {}, systems = {},
                multiple, common_privilege_level, self_serve_user,
                $btnAddADUserRoles = $('#btnADUserRole'),
                supports_user_roles, global_user_role, global_is_ad_user;

            var MANAGE_LEVEL = 2;
            var ROLE_LEVEL_NO_RESTRICTIONS = 1;
            var ROLE_LEVEL_BACKUP_OPERATOR = 2;
            var ROLE_NO_RESTRICTIONS = 'No Restrictions', ROLE_BACKUP_OPERATOR = 'Backup Operator',
                ROLE_RESTORE_OPERATOR = 'Recovery Operator', ROLE_OPERATOR = 'Backup/Recovery Operator';
            var $roleScopeEditButton = $(".btn-edit-scope");
            var $recoverOptionsEditButton = $(".btn-edit-recover-options");

            var globalElement = angular.element(document.querySelector('[ng-controller=GlobalCtrl]'));
            var $rootScope = globalElement.scope();

            function initForm() {

                $btnAddUser.on("click", function (event) {
                    EditUser = false;
                    global_is_ad_user = false;
                    global_user_role = {};
                    $("#box_title").text(gettextCatalog.getString("Add User"));
                    $("#users-save-button-id").text(gettextCatalog.getString("Add"));
                    $("#passwordLabel1").text(gettextCatalog.getString("Password"));
                    $("#confirm_password").show();
                    $("#password1").show();
                    $("#change_password").hide();
                    $("#currentPassword").hide();
                    $("#username").val("");
                    $("#username").prop('disabled', false);
                    $("#password1").val("");
                    $("#password2").val("");
                    $("#change-password-group").show();
                    $("#user-primary-role").show();
                    $roleSelect.val(MANAGE_LEVEL);
                    $roleSelect.removeAttr('disabled');
                    $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                    $roleAccessSelect.removeAttr('disabled');
                    $btnRoleScope.hide();
                    handleAddUser();
                });
                $btnAddADUserRoles.on("click", function (event) {
                    EditUser = false;
                    global_is_ad_user = true;
                    global_user_role = {};
                    $("#box_title").text(gettextCatalog.getString("Add Active Directory User Role"));
                    $("#users-save-button-id").text(gettextCatalog.getString("Add"));
                    $("#passwordLabel1").text(gettextCatalog.getString("Password"));
                    $("#confirm_password").hide();
                    $("#password1").show();
                    $("#change_password").hide();
                    $("#currentPassword").hide();
                    $("#username").val("");
                    $("#username").prop('disabled', false);
                    //$("#password1").val("");
                    //$("#password2").val("");
                    $("#change-password-group").hide();
                    $("#user-primary-role").hide();
                    $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                    $roleAccessSelect.removeAttr('disabled');
                    $btnRoleScope.hide();
                    handleAddUser();
                });
                $btnCancel.on("click", handleAddUser);
                $btnSaveUser.on("click", handleSaveUser);
                $btnEditUser.on("click", function (event) {
                    if (!$btnEditUser.hasClass("disabled")) {
                        EditUser = true;
                        if (global_is_ad_user) {
                            $("#box_title").text(gettextCatalog.getString("Edit Active Directory User Role"));
                            $("#change-password-group").hide();
                            $("#user-primary-role").hide();
                        } else {
                            $("#box_title").text(gettextCatalog.getString("Edit User"));
                            $("#change-password-group").show();
                            $("#user-primary-role").show();
                        }
                        $("#users-save-button-id").text(gettextCatalog.getString("Update"));
                        $("#confirm_password").hide();
                        $("#password1").hide();
                        $("#change_password").show();
                        $("#username").val(username);
                        $("#username").prop('disabled', true);
                        $btnRoleScope.hide();
                        if (typeof id !== "undefined") {
                            $roleAccessSelect.attr('disabled', 'disabled');
                            if (superuser) {
                                $roleSelect.val(4);
                                $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                                handleAddUser();
                            }
                            else if (multiple) {
                                PHD.alert(gettextCatalog.getString("Please use Legacy UI to update this user information."));
                            }
                            else {
                                $roleSelect.val(common_privilege_level);
                                /*
                                 * If manage user, enable the access-level drop-down (only visible if supports_user_roles is true).
                                 */
                                if (common_privilege_level == MANAGE_LEVEL) {
                                    $roleAccessSelect.removeAttr('disabled');
                                    if (global_user_role !== undefined) {
                                        $roleAccessSelect.val(global_user_role.level);
                                        if ($roleAccessSelect.val() == ROLE_LEVEL_BACKUP_OPERATOR) {
                                            $btnRoleScope.hide();
                                        } else {
                                            $btnRoleScope.show();
                                        }
                                    } else {
                                        $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                                    }
                                } else {
                                    $roleAccessSelect.attr('disabled', 'disabled');
                                    $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                                }
                                handleAddUser();
                            }
                        }
                        else {
                            PHD.alert(gettextCatalog.getString("You must select a user to edit."));
                        }
                        // Determines if the Role Access elements should be displayed or not.
                        if (supports_user_roles) {
                            $supportsRoles.show();
                        } else {
                            $supportsRoles.hide();
                        }
                    }
                });
                $btnDeleteUser.on("click", handleDeleteUser);

                $("#change_password").on("click", function () {
                    $("#confirm_password").show();
                    $("#password1").show();
                    $("#change_password").hide();
                    $("#currentPassword").show();
                    $("#passwordLabel1").text(gettextCatalog.getString("New Password"));
                });

                $usersTable = $form.find(".users-table");
                UsersTable = PHD.DataTable($usersTable, {});
                refreshUsersList();

                $(document)
                    .on("rolesUpdated", function (event, new_scope, new_options) {
                        if (EditUser) {
                            refreshUsersList();
                        }
                        if (global_user_role !== undefined) {
                            if (new_scope !== null) {
                                global_user_role.scope = new_scope;
                            }
                            if (new_options !== null) {
                                global_user_role.recover_options = new_options;
                            }
                        }
                    });

                $usersTable.on("rowselect", "tr", function (event, dbid, $el, DataTable, DataRow) {
                    if (!$btnAddUser.is(':visible')) {
                        handleAddUser();
                    }
                    multiple = false;
                    UsersRowData = DataRow.data;
                    id = UsersRowData.id;
                    username = UsersRowData.name;
                    superuser = UsersRowData.superuser;
                    customers = UsersRowData.customers;
                    locations = UsersRowData.locations;
                    systems = UsersRowData.systems;
                    var vault_user = UsersRowData.vault_user;
                    var self_service = UsersRowData.self_service;
                    self_serve_user = false;
                    if (!superuser) {
                        if (vault_user && self_service != undefined && self_service == 1) {
                            self_serve_user = true;
                        }
                        else if (customers.length > 0 && locations.length > 0 && systems.length > 0) {
                            if ((customers[0]['privilege_level'] == locations[0]['privilege_level']) && (locations[0]['privilege_level'] == systems[0]['privilege_level'])) {
                                common_privilege_level = parseInt(customers[0]['privilege_level']);
                                console.log("Multiple: False", customers[0]['privilege_level'], locations[0]['privilege_level'], systems[0]['privilege_level']);
                            }
                            else {
                                multiple = true;
                                console.log("Multiple: True", customers[0]['privilege_level'], locations[0]['privilege_level'], systems[0]['privilege_level']);
                            }
                        }
                        else {
                            multiple = true;
                        }
                        global_user_role = UsersRowData.user_role;
                        global_is_ad_user = UsersRowData.ADuser === true;
                    }
                    if (self_serve_user) {
                        $btnEditUser.addClass("disabled");
                    } else {
                        $btnEditUser.removeClass("disabled");
                    }
                    // for 'root' user, do not allow changing of privileges
                    if (username == "root") {
                        $roleSelect.attr('disabled', 'disabled');
                    } else {
                        $roleSelect.removeAttr('disabled');
                    }
                });

                roleSelect = $roleSelect[0];
                roleSelect.options[0] = new Option('Monitor', 1);
                roleSelect.options[1] = new Option('Manage', 2);
                roleSelect.options[2] = new Option('Administrator', 3);
                roleSelect.options[3] = new Option('Superuser', 4);

                /* UI Elements for user-level role-based access */
                roleAccessSelect = $roleAccessSelect[0];
                roleAccessSelect.options[0] = new Option(ROLE_NO_RESTRICTIONS, 1);
                roleAccessSelect.options[1] = new Option(ROLE_BACKUP_OPERATOR, 2);
                roleAccessSelect.options[2] = new Option(ROLE_RESTORE_OPERATOR, 3);
                roleAccessSelect.options[3] = new Option(ROLE_OPERATOR, 4);

                $roleSelect.on("change", function (event) {
                    var val = $roleSelect.val();
                    if (val == MANAGE_LEVEL) {
                        $roleAccessSelect.removeAttr('disabled');
                        if ($roleAccessSelect.val() == ROLE_LEVEL_NO_RESTRICTIONS) {
                            $btnRoleScope.hide();
                        } else {
                            $btnRoleScope.show();
                        }
                    } else {
                        $roleAccessSelect.attr('disabled', 'disabled');
                        $roleAccessSelect.val(ROLE_LEVEL_NO_RESTRICTIONS);
                        $btnRoleScope.hide();
                    }
                });

                $roleAccessSelect.on("change", function (event) {
                    var val = $roleAccessSelect.val();
                    if (val == ROLE_LEVEL_NO_RESTRICTIONS || val == ROLE_LEVEL_BACKUP_OPERATOR) {
                        $btnRoleScope.hide();
                    } else {
                        $btnRoleScope.show();
                    }
                });

                $roleScopeEditButton.on("click", function (event) {
                    editRestoreScope(event);
                });

                $recoverOptionsEditButton.on("click", function (event) {
                    editRecoverOptions(event);
                });
                /* End of UI Elements for user-level role-based access */

                $timeout(function() {
                    $form.find(".definition").popover({
                        appendTo: $form
                    });
                });

                UsersForm = PHD.FormController($form, {})

                    .on("formcancel", function (event) {
                        PHD.currentDialog.wizard("close");
                    })
                    .on("formsubmit", function (event, data) {
                        PHD.currentDialog.wizard("close");
                    })
                    .validate({
                        errorLabelContainer: ".users-dialog-error-list",
                        errorContainer: ".users-dialog-errors",
                        showErrors: function (errorMap, errorList) {
                            $(".users-dialog-errors").find(".summary")
                                .html(gettextCatalog.getString("Correct the following errors:"));
                            this.defaultShowErrors();
                        },
                        rules: {
                            username: {
                                required: true
                            },
                            password1: {
                                required: true
                            },
                            password2: {
                                required: true,
                                equalTo: "#password1"
                            }
                        },
                        messages: {
                            name: {
                                required: gettextCatalog.getString("Username is required")
                            },
                            password1: {
                                required: gettextCatalog.getString("Password is required")
                            },
                            password2: {
                                required: gettextCatalog.getString("Confirm Password is required"),
                                equalTo: gettextCatalog.getString("Confirm password and password do not match.")
                            }
                        }
                    });

                /*
                 * Override the standard submit for the FormController and re-direct to handleSaveUser.
                 * Only redirect if the save button is visible; otherwise no changes are being made
                 */
                UsersForm.submit = function () {
                    var $saveBtn = $("#users-save-button-id");
                    if ($saveBtn.is(":visible")) {
                        // See if the user is editing or adding a user, and indicate to the save user function
                        // that the dialog should be closed if update/add is successful (because they clicked the overall dialog "Save".
                        EditUser = $saveBtn.text() == gettextCatalog.getString('Update');
                        handleSaveUser(true);
                    } else {
                        PHD.currentDialog.wizard("close");
                    }
                };
            }

            $('#edit-appliance').on("beforeactivationtab", function (event, ui) {
                var USERS_INDEX = 2;
                if (ui.oldTab.index() === USERS_INDEX) {
                    /* code to see if a confirmation is needed would go here */
                    $(currentTarget).trigger('tabsactivateafterconfirm', ui);
                }
            });

            function refreshUsersList() {
                var users = PHD.Ajax.get('/api/users/?sid=' + PHD.appliance_sid);
                users.done(function (data) {
                    allUsers = [];

                    supports_user_roles = ($rootScope.isCE || $rootScope.isKumo) ? false : (data.supports_roles === true);
                    // If roles are not supported, we should not display the button to add AD user roles.
                    if (supports_user_roles) {
                        $btnAddADUserRoles.show();
                    } else {
                        $btnAddADUserRoles.hide();
                    }
                    var usersList = data.data;
                    usersList.forEach(function (item, index) {
                        item.username = item.name;
                        item.role = item.superuser;
                        if (!item.vault_user) {
                            if (item.superuser) {
                                item.role = "Superuser";
                            }
                            else {
                                if (item.customers.length > 0 && item.locations.length > 0 && item.systems.length > 0) {
                                    if (item.customers[0]['privilege_level'] == 0 && item.locations[0]['privilege_level'] == 0 && item.systems[0]['privilege_level'] == 0) {
                                        item.role = "None";
                                    }
                                    else if (item.customers[0]['privilege_level'] == 1 && item.locations[0]['privilege_level'] == 1 && item.systems[0]['privilege_level'] == 1) {
                                        item.role = "Monitor";
                                    }
                                    else if (item.customers[0]['privilege_level'] == 2 && item.locations[0]['privilege_level'] == 2 && item.systems[0]['privilege_level'] == 2) {
                                        item.role = "Manage";
                                        if (item.ADuser) {
                                            item.role += ", AD User";
                                        }
                                        if (supports_user_roles) {
                                            if (item.user_role !== undefined && item.user_role.name !== undefined) {
                                                item.role += " (Access Level: " + prettyPrintRole(item.user_role.name);
                                                if (item.user_role.level == ROLE_LEVEL_BACKUP_OPERATOR) {
                                                    item.user_role.scope = "";
                                                    item.user_role.recover_options = "";
                                                }
                                                if (item.user_role.scope !== undefined && item.user_role.scope !== "") {
                                                    item.role += ", scope is set";
                                                }
                                                if (item.user_role.recover_options !== undefined && item.user_role.recover_options !== "") {
                                                    item.role += ", options are set";
                                                }
                                                item.role += ")";
                                            }
                                        }
                                    }
                                    else if (item.customers[0]['privilege_level'] == 3 && item.locations[0]['privilege_level'] == 3 && item.systems[0]['privilege_level'] == 3) {
                                        item.role = "Administrator";
                                    }
                                    else {
                                        item.role = "Multiple";
                                    }
                                }
                                else {
                                    item.role = "Multiple";
                                }
                            }
                        } else {
                            if (item.self_service !== undefined && item.self_service == 1) {
                                item.role = "Self-service";
                            }
                        }
                    });
                    allUsers = $.merge(allUsers, usersList);
                    UsersTable.load(allUsers);
                });
            }

            /*
             * Converts the nvp 'role' to a string suiable for user-display.
             */
            function prettyPrintRole(raw_role) {
                var role = '';
                if (raw_role == 'operator') {
                    role = ROLE_OPERATOR;
                } else if (raw_role == 'restore_operator') {
                    role = ROLE_RESTORE_OPERATOR;
                } else if (raw_role == 'backup_operator') {
                    role = ROLE_BACKUP_OPERATOR;
                } else {
                    role = ROLE_NO_RESTRICTIONS;
                }
                return role;
            }

            var scopeOpen = false; // prevent double-click error.

            function editRestoreScope(event) {
                event.stopPropagation();

                if (!scopeOpen) {
                    // Access the ngDialog module injected into the app.
                    var injector = globalElement.injector();
                    var ngDialog = injector.get('ngDialog');
                    var $http = injector.get('$http');
                    var userName = EditUser ? username : null;

                    var resp = PHD.Ajax.get('/api/inventory/replicas/?uid=' + $rootScope.user.id);
                    resp.done(function (data) {
                        var treeDataCache = data.inventory;
                        var setTopvalue = 'top:75px;';
                        if (screen.height > 1024) {
                            setTopvalue = 'top:10%;'
                        } else if (screen.height == 1024) {
                            setTopvalue = 'top:6%;'
                        }

                        scopeOpen = true;

                        // Clear this function so that the ngDialog elements can gain focus above a jQuery-ui dialog.
                        $.ui.dialog.prototype._focusTabbable = function () {
                        };
                        ngDialog.open({
                            //template: 'app/configure/user-roles/role-scope.html',
                            template: "app/configure/users/roles/scope-objects.html",
                            scope: globalElement.scope(),
                            overlay: true,
                            data: {
                                userName: userName,
                                user_role: global_user_role,
                                treeDataCache: treeDataCache,
                                ADuser: global_is_ad_user
                            },
                            modelDialogId: 'edit-scope-dialog',
                            name: 'edit-scope-dialog',
                            ngDialogStyle: 'width:780px;height:580px;',
                            ngDialogPostionStyle: setTopvalue,
                            preCloseCallback: function (value) {
                                scopeOpen = false;
                            }
                        });
                    });
                }
            }

            var optionsOpen = false; // prevent double-click error.

            function editRecoverOptions(event) {
                event.stopPropagation();

                if (!optionsOpen) {
                    // Access the ngDialog module injected into the app.
                    var injector = globalElement.injector();
                    var ngDialog = injector.get('ngDialog');
                    var $http = injector.get('$http');
                    var userName = EditUser ? username : null;

                    optionsOpen = true;

                    // Clear this function so that the ngDialog elements can gain focus above a jQuery-ui dialog.
                    $.ui.dialog.prototype._focusTabbable = function () {
                    };
                    ngDialog.open({
                        template: "app/configure/users/roles/recover-options.html",
                        scope: globalElement.scope(),
                        overlay: true,
                        data: {userName: userName, user_role: global_user_role, ADuser: global_is_ad_user},
                        modelDialogId: 'edit-recover-options-dialog',
                        name: 'edit-recover-options-dialog',
                        ngDialogStyle: 'width:550px;height:380px;',
                        preCloseCallback: function (value) {
                            optionsOpen = false;
                        }
                    });
                }
            }

            function handleAddUser() {
                if ($btnAddUser.is(':visible')) {
                    $(".user_add_update_buttons").hide();
                    $("#add_update_users").show();
                    $("#active-directory-info").hide();
                }
                else {
                    $(".user_add_update_buttons").show();
                    $("#add_update_users").hide();
                    $("#active-directory-info").show();
                    $('#add_update_users').find('.error').removeClass("error");
                    $("#users-edit-form #dialog-error-list").empty();
                    $("#users-edit-form .users-dialog-errors").css('display', 'none');
                }
                // Determines if the Role Access elements should be displayed or not.
                if (supports_user_roles) {
                    $supportsRoles.show();
                } else {
                    $supportsRoles.hide();
                }
            }

            function handleDeleteUser() {

                var isADUser = global_is_ad_user;
                // adding a confirmation dialog when deleting the user
                var confirmMsg = "<p>" + gettextCatalog.getString("Are you sure you want to remove the selected user?") + "</p>";
                if (isADUser) {
                    confirmMsg = "<p>" + gettextCatalog.getString("Are you sure you want to remove the role for the selected Active Directory user?") + "</p>";
                }
                if (self_serve_user) {
                    confirmMsg += "<p>" + gettextCatalog.getString("Self-service information cannot be obtained on the source system, if the self-service user is removed.") + "</p>";
                }
                var confirm = PHD.confirmDialog(confirmMsg, {title: gettextCatalog.getString("Confirm User Removal")});

                confirm.done(function () {
                    var url = "/api/users/" + id + "/";
                    if (isADUser) {
                        url = "/api/users/0/";
                    }
                    var sid = (PHD.appliance_sid == null) ? "" : "?sid=" + PHD.appliance_sid;
                    url += sid;
                    if (isADUser) {
                        url += "&ADuserName=" + username;
                    }

                    PHD.Ajax
                        .delete(url)
                        .done(function (data) {
                            var result = data.result[0];
                            if (result !== undefined) {
                                if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                                    console.log("SUCCESS");
                                    refreshUsersList();
                                } else if (parseInt(result.code) === AJAX_RESULT_ERROR) {
                                    console.log("FAILURE");
                                    PHD.throwError(data);
                                }
                            }
                        });
                });
            }

            function handleSaveUser(closeAfter) {
                var closeDialog = closeAfter === true;      // only close the dialog if closeAfter is true, not an event.
                //passwordValidator();
                if (!$form.valid()) {
                    return false;
                }
                var selectedRoleID = $roleSelect.val();
                var obj = {};
                var url = "/api/users/";
                var self = this;
                var sid = (PHD.appliance_sid == null) ? "" : "?sid=" + PHD.appliance_sid;
                var customers = {}, locations = {}, systems = {}, customersArray = {}, locationsArray = {},
                    systemsArray = {};
                var isADUser = global_is_ad_user;

                if (!isADUser) {
                    if (EditUser) {
                        if (!$("#change_password").is(':visible')) {
                            obj.password = $("#password1").val();
                            obj.current_password = $("#currentPasswordInput").val();
                        }
                    }
                    else {
                        obj.password = $("#password1").val();
                        obj.name = $("#username").val();
                    }
                } else {
                    obj.name = $("#username").val();
                }

                if (selectedRoleID == 4) {
                    obj.superuser = true;
                }
                else {
                    obj.superuser = false;
                    customers.id = PHD.appliance_sid;
                    customers.privilege_level = parseInt(selectedRoleID);
                    customersArray[0] = customers;
                    obj.customers = customersArray;
                    locations.id = PHD.appliance_sid;
                    locations.privilege_level = parseInt(selectedRoleID);
                    locationsArray[0] = locations;
                    obj.locations = locationsArray;
                    systems.id = PHD.appliance_sid;
                    systems.privilege_level = parseInt(selectedRoleID);
                    systemsArray[0] = systems;
                    obj.systems = systemsArray;
                    if (supports_user_roles) {
                        // If roles are supported, pass in the selected role for the user.
                        // Will pass in a level, which will be translated to a role name by the API
                        obj.user_role = {};
                        obj.user_role.level = parseInt($roleAccessSelect.val());
                        if (!EditUser && global_user_role !== undefined && global_user_role.scope !== undefined) {
                            obj.user_role.scope = global_user_role.scope;
                        }
                        if (!EditUser && global_user_role !== undefined && global_user_role.recover_options !== undefined) {
                            obj.user_role.recover_options = global_user_role.recover_options;
                        }
                        obj.ADuser = isADUser;
                    }
                }

                obj = JSON.stringify(obj);
                var load = PHD.showLoadingIndicator($form);
                if (!isADUser) {
                    if (EditUser) {
                        url += id + "/" + sid;
                        resp = PHD.Ajax.put(url, obj, load);
                    }
                    else {
                        url += sid;
                        resp = PHD.Ajax.post(url, obj, load);
                    }
                } else {
                    // if an AD user, use id 0.  This will be handled by the PUT /users API.
                    url += 0 + "/" + sid;
                    resp = PHD.Ajax.put(url, obj, load);
                }

                resp.done(function (data) {
                    // self.$form.trigger("formsubmit", [data, self.$form, self]);
                    var result = data.result[0];
                    if (result !== undefined) {
                        if (parseInt(result.code) === AJAX_RESULT_SUCCESS) {
                            console.log("SUCCESS");
                            refreshUsersList();
                            handleAddUser();
                            PHD.hideLoadingIndicator(load);
                            if (closeDialog) {
                                PHD.currentDialog.wizard("close");
                            }
                        } else if (parseInt(result.code) === AJAX_RESULT_ERROR) {
                            console.log("FAILURE");
                            PHD.throwError(data);
                        } else {
                            // adding user, get back id.
                            console.log("SUCCESS");
                            refreshUsersList();
                            handleAddUser();
                            PHD.hideLoadingIndicator(load);
                            if (closeDialog) {
                                PHD.currentDialog.wizard("close");
                            }
                        }
                    }
                });
            }


            // The Active Directory settings button is on the users tab.
            $("#btnADSettings").click(function (event) {
                event.stopPropagation();
                if (!scopeOpen) {
                    scopeOpen = true;

                    // Clear this function so that the ngDialog elements can gain focus above a jQuery-ui dialog.
                    $.ui.dialog.prototype._focusTabbable = function () {
                    };

                    ngDialog.open({
                        template: "app/configure/active-directory/active-directory.html",
                        overlay: true,
                        data: {
                            activeDirectorySettings: $scope.activeDirectorySettings
                        },
                        modelDialogId: 'edit-active-directory',
                        name: 'edit-active-directory',
                        ngDialogStyle: 'width:825px;height:480px;',
                        preCloseCallback: function (value) {
                            scopeOpen = false;
                        }
                    });
                }
            });

            initForm();
        }

        angular.element(document).ready(function () {
            processUsersTab(PHD, window, $rootScope, $scope, $analytics, $timeout);
        });
}]);
