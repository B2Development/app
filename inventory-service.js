
var inventory = angular.module('inventory', []);

inventory.service("inventorysvc", function() {
	this.nodeToObject =  function(node_id) {
		var obj = {
			system_id: null,
			client_id: null,
			app_id: null,
			host_guid: null,
			instance_id: null
		};
		// id components are "_" delimited, e.g.,
		//
		// system-id_client-id_app-id_instance-id
		// system-id_client-id_app-id_host-guid_instance-id
		// system-id_client-id
		//
		var a = node_id.split("_");
		if (a.length > 0) {
			obj.system_id = a[0];
		}
		if (a.length > 1) {
			obj.client_id = a[1];
		}
		if (a.length > 2) {
			obj.app_id = a[2];
		}
		if (a.length > 3) {
			if (a.length > 4) {
				obj.host_guid = a[3];
				obj.instance_id = a[4];
			} else {
				obj.instance_id = a[3];
			}
		}
		return obj;
	};
	this.getAssetType = function(app_id){
		if(app_id === APP_ID_FILE_LEVEL){
			return INVENTORY_TYPE_FAMILY_CLIENT;
        } else if(app_id === APP_ID_BLOCK_LEVEL){
            return INVENTORY_TYPE_FAMILY_BLOCK;
		} else if(app_id === APP_ID_VMWARE){
			return INVENTORY_TYPE_FAMILY_VMWARE;
		} else if(app_id === APP_ID_HYPERV_2008_R2 || app_id === APP_ID_HYPERV_2012 || app_id === APP_ID_HYPERV_2016){
			return INVENTORY_TYPE_FAMILY_HYPER_V;
		} else if (app_id === APP_ID_EXCHANGE_2003 || app_id === APP_ID_EXCHANGE_2007 || app_id === APP_ID_EXCHANGE_2010 || app_id === APP_ID_EXCHANGE_2013 || app_id === APP_ID_EXCHANGE_2016) {
			return INVENTORY_TYPE_FAMILY_EXCHANGE;
		} else if (app_id === APP_ID_SQL_SERVER_2005 || app_id === APP_ID_SQL_SERVER_2008 || app_id === APP_ID_SQL_SERVER_2008_R2
			|| app_id === APP_ID_SQL_SERVER_2012 || app_id === APP_ID_SQL_SERVER_2014 || app_id === APP_ID_SQL_SERVER_2016 || app_id === APP_ID_SQL_SERVER_2017) {
			return INVENTORY_TYPE_FAMILY_SQL;
		} else if (app_id === APP_ID_SHAREPOINT_2007 || app_id === APP_ID_SHAREPOINT_2010 || app_id === APP_ID_SHAREPOINT_2013 || app_id === APP_ID_SHAREPOINT_2016) {
			return INVENTORY_TYPE_FAMILY_SHAREPOINT;
		} else if (app_id === APP_ID_ORACLE_11 || app_id === APP_ID_ORACLE_12 || app_id === APP_ID_ORACLE_10) {
			return INVENTORY_TYPE_FAMILY_ORACLE;
		} else if (app_id === APP_ID_CISCO_UCS_SERVICE_PROFILE) {
			return INVENTORY_TYPE_FAMILY_CISCO_UCS;
		}else if (app_id === APP_ID_XEN) {
			return INVENTORY_TYPE_FAMILY_XEN;
		} else if (app_id === APP_ID_NDMP) {
			return INVENTORY_TYPE_FAMILY_NDMP;
        }else if (app_id === APP_ID_AHV) {
            return INVENTORY_TYPE_FAMILY_AHV;
        }
	};
	this.buildNavGroups = function(data) {
		return getGroups(({"node": data}));

		function getGroups(item) {
			var itemGroups = [];
			if (item.node.nodes) {
				_.each(item.node.nodes, function(value, index, arr) {
					if (value.group !== undefined) {
						itemGroups.push(value.group);
					}
					itemGroups = itemGroups.concat(getGroups({"node":value}));
				})
			}
			return itemGroups;
		}
	};
	/*
	 * Given a group id, determines if the object is a member of the group.
	 */
	this.isGroupMember = function(id, objID, navGroups) {
		var matchObj = this.buildChildID(objID);
		for (var i = 0; i < navGroups.length; i++) {
			var group = navGroups[i];
			if (group['@attributes'] !== undefined) {
				if (id == group['@attributes']['id']) {
					var children = group['childIDs'] !== undefined ? group['childIDs']['child'] : null;
					if (children !== undefined) {
						if (!(children instanceof Array)) {
							children = [children];
						}
						for (var j = 0; j < children.length; j++) {
							var child = children[j];
							if (this.isMatch(matchObj, child)) {
								return true;
							} else {
								if (this.isGroup(child, '.')) {
									if (this.isGroupMember(child, objID, navGroups)) {
										return true;
									}
								}
							}
						}
					}
				}
			}
		}
		return false;
	};
	this.removeFromGroup = function(obj, navGroups) {
		var found = false;
		for (var i = 0; i < navGroups.length && !found; i++) {
			var group = navGroups[i];
			if (group['@attributes'] !== undefined) {
				var children = group['childIDs'] !== undefined ? group['childIDs']['child'] : null;
				if (children !== undefined) {
					if (Array.isArray(children)) {
						for (var j = 0; j < children.length; j++) {
							var child = children[j];
							if (this.isMatch(obj, child)) {
								children.splice(j, 1);
								if (children.length === 1) {
									group['childIDs']['child'] = group['childIDs']['child'][0];
								}
								found = true;
							}
						}
					} else {
						if (this.isMatch(obj, children)) {
							delete group['childIDs']['child'];
							found = true;
						}
					}
				}
			}
		}
		return found;
	};
	this.getGroup = function(groupID, navGroups) {
		var found = false;
		var group;
		for (var i = 0; i < navGroups.length && !found; i++) {
			var thisGroupID = this.getGroupID(navGroups[i]);
			if (groupID === thisGroupID) {
				group = navGroups[i];
				found = true;
			}
		}
		return group;
	};
	this.addChildToGroup = function(groupID, newChildID, navGroups) {
		var found = false;
		var group = this.getGroup(groupID, navGroups);
		if (group !== undefined) {
			found = true;
			var children = group['childIDs'];
			var childIDs = [];
			if (children !== undefined) {
				if (children instanceof Array && children.length == 0) {
					childIDs = [];
				} else {
					childIDs = children['child'];
				}
			}
			if (!(childIDs instanceof Array)) {
				childIDs = [childIDs];
			}
			var new_children = childIDs;
			new_children.push(newChildID);

			if (new_children.length > 1) {
				group['childIDs'] = {'child': new_children};
			} else if (new_children.length == 1) {
				group['childIDs'] = {'child': new_children[0]};
			} else {
				group['childIDs'] = [];
			}
		}
		return found;
	};
	this.buildChildID = function(invID) {
		var id = invID;
		var a = invID.split('_');
		var exact = true;
		// handle difference in group ID representation.
		// groups use '.' as delimiters, instead of '_'.
		// groups for client use just system ID and client ID
		// groups for VMware ust just system ID and client ID (for vCenter-RRC)
		if (a.length === 4 && a[2] == APP_ID_FILE_LEVEL) {
			id = a[0] + '.' + a[1];
		} else {
			id = id.replace(/_/g, ".");
		}
        if (a[2] !== undefined) {
            if (a[2] == APP_ID_VMWARE || a[2] == APP_ID_AHV) {
                exact = false;
            }
        }
		return { 'isExact': exact, 'id': id };
	};
	this.convertInvID = function(invID, asGroupChild) {
		var child = asGroupChild || false;
		var id;
		if (asGroupChild) {
			// Handle special case for clients in groups.
			//  The legacy UI uses <sysID>.<clientID> where Satori inventory uses <sysID>_<clientID>_<appID>_<instanceID> where appID is 1.
			// When converting to a group child, handle this conversion.
			var obj = this.buildChildID(invID);
			id = obj.id;
		} else {
			id = invID.replace(/_/g, '.');
		}
		return id;
	};
	this.isGroup = function(id, separator) {
		var sep = separator || '_';
		return id.indexOf('-') !== -1 && id.indexOf(sep) == -1;
	};
	this.isPoolOrVApp = function (id, separator) {
		var sep = separator || '_';
		var isPool = false;
		var a = id.split(sep);
		if (a.length >= 5) {
			isPool = isNaN(a[4]);
		}
		return isPool;
	};
	this.isMatch = function(obj, id) {
		var match = false;
		var matchID = obj.id !== undefined ? obj.id : obj;
		if (obj.isExact) {
			match = matchID == id;
		} else {
			match = matchID.indexOf(id) !== -1;
		}
		return match;
	};
	this.getGroupAttr = function(group, attrName) {
		var attr = group['@attributes'];
		return attr !== undefined ? attr[attrName] : attr;
	};
	this.setGroupAttr = function(group, attrName, attrValue) {
		var attr = group['@attributes'];
		if (attr !== undefined) {
			attr[attrName] = attrValue;
		}
	};
	this.getGroupID = function(group) {
		return this.getGroupAttr(group, 'id');
	};
	this.setGroupID = function(group, id) {
		this.setGroupAttr(group, 'id', id);
	};
	this.getGroupName = function(group) {
		return this.getGroupAttr(group, 'name');
	};
	this.setGroupName = function(group, name) {
		this.setGroupAttr(group, 'name', name);
	};
	this.getGroupColor = function(group) {
		return this.getGroupAttr(group, 'color');
	};
	this.setGroupColor = function(group, color) {
		this.setGroupAttr(group, 'color', color);
	};
	this.createItem = function(id, name, parent, itemColor) {
		var attr  = {'id': id, 'name': name, 'treeParentID': parent };
		// default color.
		var color;
		if (itemColor !== undefined && itemColor != "-1") {
			color = itemColor;
		} else {
			color = '#204363';
		}
		attr['color'] = color;
		return { '@attributes': attr };
	};
	this.getGroupUsers = function(group) {
		var groupUsers = [];
		if (group != null) {
			var attr = group['@attributes'];
			var users = attr !== undefined ? attr['users'] : attr;
			groupUsers = users !== undefined ? users.split(',') : [];			
		}
		return groupUsers;
	};
	this.setGroupUsers = function(group, users) {
		if (group != null && group['@attributes'] !== undefined) {
			group['@attributes']['users'] = this.getUsersString(users);
		}
	};
	this.getUsersString = function(users) {
		var ids = users;
		if (users instanceof Array) {
			ids = _.pluck(users, 'id');
			ids = ids.toString();
		}
		return ids;
	};
	this.setGroupParent = function(group, parentID) {
		group['@attributes']['treeParentID'] = parentID;
		return true;
	};
	this.getGroupParent = function(group) {
		var attr = group['@attributes'];
		return attr !== undefined ? attr['treeParentID'] : attr;
	};
	this.getSiblings = function(id, inventory, lvl) {
		var siblings = [];
		var found = false;
		var level = lvl || 0;
		if (!(inventory instanceof Array)) {
			inventory = [inventory];
		}
		for (var i = 0; i < inventory.length && !found; i++) {
			// If an appliance node is passed in, set id to null to get children, below.
			var thisNode = inventory[i].id;
			if (thisNode == id) {
				id = null;
			}
			var invNodes = inventory[i].nodes;
			for (var j = 0; j < invNodes.length && !found; j++) {
				// if id is null, we want the siblings of the tree first level.
				if (invNodes[j].id == id || id === null) {
					found = true;
					for (var k = 0; k < invNodes.length; k++) {
						if (invNodes[k].id != id) {
							siblings.push(invNodes[k]);
						}
					}
				}
			}
			if (!found) {
				for (j = 0; j < invNodes.length && !found; j++) {
					if (invNodes[j].nodes instanceof Array){
						siblings = this.getSiblings(id, invNodes[j], ++level);
						if (siblings.length > 0) {
							found = true;
						}
					}
				}
			}
		}
		return siblings;
	};
	this.getChildren = function(id, inventory, lvl) {
		var children = [];
		var found = false;
		var level = lvl || 0;
		if (!(inventory instanceof Array)) {
			inventory = [inventory];
		}
		for (var i = 0; i < inventory.length && !found; i++) {
			var invNodes = inventory[i].nodes;
			for (var j = 0; j < invNodes.length && !found; j++) {
				if (invNodes[j].id == id) {
					children = invNodes[j].nodes;
					found = true;
				}
			}
			if (!found) {
				for (j = 0; j < invNodes.length && !found; j++) {
					if (invNodes[j].nodes instanceof Array){
						children = this.getChildren(id, invNodes[j], ++level);
						if (children.length > 0) {
							found = true;
						}
					}
				}
			}
		}
		return children;
	};
	this.getNodeName = function(id, inventory) {
		var name = '';
		var found = false;
		if (!(inventory instanceof Array)) {
			inventory = [inventory];
		}
		for (var i = 0; i < inventory.length && !found; i++) {
			var invNodes = inventory[i].nodes;
			for (var j = 0; j < invNodes.length && !found; j++) {
				// if id is null, we want the siblings of the tree first level.
				if (invNodes[j].id == id || id === null) {
					found = true;
					name = invNodes[j].name;
				}
			}
			if (!found) {
				for (j = 0; j < invNodes.length && !found; j++) {
					if (invNodes[j].nodes instanceof Array){
						name = this.getNodeName(id, invNodes[j]);
						if (name != '') {
							found = true;
						}
					}
				}
			}
		}
		return name;
	};
	this.userInGroup = function (userID, group) {
		var str_id = userID.toString();
		var users = this.getGroupUsers(group);
		return ($.inArray(str_id, users) !== -1);
	};
	this.createUUID = function() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
		return uuid.toUpperCase();
	};
	this.handleSpecialChars = function(node_id) {
        // remove the starting 'li#' when node ID contains spaces or '#' other leading 'li#'.
        if (node_id.indexOf(" ") !== -1 || node_id.lastIndexOf("#") !== 2) {
            node_id = node_id.substr(3);
        }
		return node_id;
	}
});