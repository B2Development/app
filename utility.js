    
    /*Function for compare two objects*/
    function compareTwoObjects(currentObj , editedObj) {
        return angular.equals(currentObj , editedObj)
    }
    /*return type of the data*/
    String.prototype.getType = function(){
        var  agentStringType= typeof(this);
        return agentStringType;
    }