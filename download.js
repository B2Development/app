
var download = angular.module('download', []);

download.service("DownloadService", function() {
	this.downloadFile =  function(blob, filename) {
		if (navigator.msSaveBlob) {
			navigator.msSaveBlob(blob, filename);
		} else {
			var saveBlob = navigator.webkitSaveBlob || navigator.mozSaveBlob || navigator.saveBlob;
			if (saveBlob !== undefined) {
				saveBlob(blob, filename);
			} else {
				var urlCreator = window.URL || window.webkitURL || window.mozURL || window.msURL;
				if (urlCreator) {
					var link = document.createElement('a');
					if ('download' in link) {
						var url = urlCreator.createObjectURL(blob);
						link.setAttribute('href', url);
						link.setAttribute('download', filename);
						var event = document.createEvent('MouseEvents');
						event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
						link.dispatchEvent(event);
					} else {
						var url = urlCreator.createObjectURL(blob);
						window.location = url;
					}
				} else {
					window.PHD.throwError({"result": [{"message": gettext("An error occurred while downloading the file.")}]});
				}
			}
		}
	};
	this.saveAs = function (uri, filename) {
		var link = document.createElement('a');
		if (typeof link.download === 'string') {
			link.setAttribute('href', uri);
			link.setAttribute('download', filename);

			//Firefox requires the link to be in the body
			document.body.appendChild(link);

			//simulate click
			link.click();

			//remove the link when done
			document.body.removeChild(link);
		} else {
			window.open(uri);
		}
	}
});