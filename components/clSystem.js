const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

function clSystem() { 
}
clSystem.prototype = {
	classDescription : 'clSystem', 
	contractID : '@clear-code.com/system;2',
	classID : Components.ID('{12ae3fc0-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clISystem,
		Ci.clISystemInternal
	]),

	get cpu() {
		return Cc['@clear-code.com/system/cpu;2'].getService(Ci.clICPU);
	},

	addMonitor : function(aTopic, aMonitor, aInterval) {
	},

	removeMonitor : function(aTopic, aMonitor) {
	},

	addMonitor : function(aTopic, aMonitor, aInterval, aOwner) {
	},

	removeAllMonitors : function() {
	}
};

function clCPU() { 
}
clCPU.prototype = {
	classDescription : 'clCPU', 
	contractID : '@clear-code.com/system/cpu;2',
	classID : Components.ID('{ae145a80-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPU
	]),

	getCurrentTime : function() {
		return 0;
	},

	getCurrentTimes : function() {
		return [];
	},

	getUsage : function() {
		return 0;
	},

	getUsages : function() {
		return [];
	},

	get count() {
		return this.utils.getCount();
	}
};
XPCOMUtils.defineLazyGetter(clCPU.prototype, 'utils', function () {
	var utils = {};
	Components.utils.import('resource://system-monitor-modules/CPUWin.js', utils);
	return utils;
});

function clCPUTime() { 
}
clCPUTime.prototype = {
	classDescription : 'clCPUTime', 
	contractID : '@clear-code.com/system/time;2',
	classID : Components.ID('{eb5ea940-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPUTime
	]),

	get user() {
		return 0;
	},

	get nice() {
		return 0;
	},

	get system() {
		return 0;
	},

	get idle() {
		return 0;
	},

	get io_wait() {
		return 0;
	}
};

function clMemory() { 
}
clMemory.prototype = {
	classDescription : 'clMemory', 
	contractID : '@clear-code.com/system/memory;2',
	classID : Components.ID('{06c631d0-4884-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPUTime
	]),

	get total() {
		return 0;
	},

	get used() {
		return 0;
	},

	get free() {
		return 0;
	},

	get virtualUsed() {
		return 0;
	}
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([clSystem, clCPU, clCPUTime, clMemory]);
