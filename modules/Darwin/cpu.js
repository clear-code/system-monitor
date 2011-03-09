var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

const CoreFoundation = ctypes.open('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
addShutdownListener(function() { CoreFoundation.close(); });


function getCount() {
	return 0;
}

function getCPUTimes() {
	var times = [];
	return times;
}

function calculateCPUUsage(aPrevious, aCurrent) {
	var user   = aCurrent.user - aPrevious.user;
	var system = aCurrent.system - aPrevious.system;
	var nice   = aCurrent.nice - aPrevious.nice;
	var idle   = aCurrent.idle - aPrevious.idle;

	var total  = user + system + nice + idle;
	if (total == 0) {
		return {
			user   : 0,
			system : 0,
			nice   : 0,
			idle   : 0,
			iowait : 0
		};
	}
	else {
		return {
			user   : user / total,
			system : system / total,
			nice   : nice / total,
			idle   : idle / total,
			iowait : 0
		};
	}
}
