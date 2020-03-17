
var DateTimeHandler = {};

DateTimeHandler.convertTimeToAPI = function(format, str) {
    var hours = Number(str.match(/^(\d+)/)[1]);
    var minutes = Number(str.match(/:(\d+)/)[1]);
    var AMPM = str.match(/\s?([AaPp][Mm]?)$/)[1];

    var pm = ['P', 'p', 'PM', 'pM', 'pm', 'Pm'];
    var am = ['A', 'a', 'AM', 'aM', 'am', 'Am'];

    if (pm.indexOf(AMPM) >= 0 && hours < 12) hours = hours + 12;
    if (am.indexOf(AMPM) >= 0 && hours == 12) hours = hours - 12;

    var sHours = hours.toString();
    var sMinutes = minutes.toString();
    if (hours < 10) sHours = "0" + sHours;
    if (minutes < 10) sMinutes = "0" + sMinutes;

    if (format == '0000') {
        return (sHours + sMinutes);
    } else if (format == '00:00') {
        return (sHours + ":" + sMinutes);
    } else if (format == '00:00:00') {
        return (sHours + ":" + sMinutes + ':00');
    } else {
        return false;
    }
};

DateTimeHandler.convertTimeFromAPI = function(str) {
    var ret = "";
    if (str != null) {
        ret = str.replace(/ pm/g,"PM").replace(/ am/g, "AM");
    }
    return ret;
};

DateTimeHandler.convertHourFromAPI = function(hours) {
    var ret = "";
    var suffix = (hours > 12) ? "PM" : "AM";
    var hour = hours > 12 ? hours - 12 : hours;

    // decrement by 1 minute for clarity.
    hour--;
    var minutes = ":59";

    ret = hour + minutes + suffix;
    return ret;
};

DateTimeHandler.convertTimeToHour = function(str) {
    var hours = Number(str.match(/^(\d+)/)[1]);
    var minutes = Number(str.match(/:(\d+)/)[1]);
    var AMPM = str.match(/\s?([AaPp][Mm]?)$/)[1];

    var pm = ['P', 'p', 'PM', 'pM', 'pm', 'Pm'];
    var am = ['A', 'a', 'AM', 'aM', 'am', 'Am'];

    if (pm.indexOf(AMPM) >= 0 && hours < 12) hours = hours + 12;
    if (am.indexOf(AMPM) >= 0 && hours == 12) hours = hours - 12;

    // increment by 1 minute for clarity.
    if (minutes === 59) {
        hours++;
    }

    return hours;
};

DateTimeHandler.getUSDateObject = function(locale, dateString) {
    var dateObj;
    if (locale === 'en') {
        dateObj = new Date(dateString);
    } else {
        // dd/mm/yyyy
        // If not English, convert date to US format.
        var dateMoment = moment(dateString, 'DD/MM/YYYY');
        dateObj = new Date(dateMoment.format("MM/DD/YYYY"));
    }
    return dateObj;
};

DateTimeHandler.getUSDateTimestamp = function(locale, dateString) {
    var dt = this.getUSDateObject(locale, dateString);
    return dt.getTime() / 1000;
};

DateTimeHandler.getUSDateString = function(locale, dateString){

    var return_date = dateString;
    if (locale !== 'en') {
        // dd/mm/yyyy
        if (dateString !== undefined) {
            var DatePattern = /^(\d{1,2})(\/|-)(\d{1,2})(\/|-)(\d{4})$/;
            var DateArray = dateString.match(DatePattern);
            if (DateArray !== null) {
                var Month = DateArray[3] !== undefined ? DateArray[3] : 0;
                var Day = DateArray[1] !== undefined ? DateArray[1] : 0;
                var Year = DateArray[5] !== undefined ? DateArray[5] : 0;
                return_date = Month + "/" + Day + "/" + Year;
            }
        }
    }
    return return_date;
};

DateTimeHandler.dateNotValid = function (date, languageCode) {
    if(date === '' || typeof date === "undefined"){
        return true;
    }
    date = this.getUSDateString(languageCode,date);
    var DatePattern = /^(\d{1,2})(\/|-)(\d{1,2})(\/|-)(\d{4})$/;
    var DateArray = date.match(DatePattern);
    if(DateArray === null){
        return true;
    }
    var Month = DateArray[1];
    var Day= DateArray[3];
    var Year = DateArray[5];
    var leapYear;
    if (Month < 1 || Month > 12){
        return true;
    }
    else if (Day < 1 || Day> 31){
        return true;
    }
    else if ((Month==4 || Month==6 || Month==9 || Month==11) && Day ==31){
        return true;
    }
    else if (Month == 2)
    {
        if(Year % 4 == 0 && (Year % 100 != 0 || Year % 400 == 0)){
            leapYear = true;
        }
        if (Day> 29 || (Day ==29 && !leapYear)){
            return true;
        }
    }
    return false;
};