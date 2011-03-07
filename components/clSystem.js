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
	this.mPreviousTimes = this.utils.getCPUTimes();
}
clCPU.prototype = {
	classDescription : 'clCPU', 
	contractID : '@clear-code.com/system/cpu;2',
	classID : Components.ID('{ae145a80-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPU
	]),

	sumCPUTimes : function(aCPUTimes) {
		var total = {
				userTime   : 0,
				systemTime : 0,
				niceTime   : 0,
				userTime   : 0,
				IOWaitTime : 0
			};
		for each (let time in aCPUTimes) {
			total.userTime   += time.userTime;
			total.systemTime += time.systemTime;
			total.niceTime   += time.niceTime;
			total.userTime   += time.userTime;
			total.IOWaitTime += time.IOWaitTime;
		}
		return total;
	}

	getCurrentTime : function() {
		return new clCPUTime(this.getCurrentTimeInternal());
	},
	getCurrentTimeInternal : function() {
		var current = this.utils.getCPUTimes();
		var time = this.utils.calculateCPUUsage(this.sumCPUTimes(this.mPreviousTimes), this.sumCPUTimes(current));
		this.mPreviousTimes = current;
		return time;
	},

	getCurrentTimes : function() {
		return this.getCurrentTimesInternal().forEach(function(aUsage) {
				return new clCPUTime(aUsage);
			}, this);
	},
	getCurrentTimesInternal : function() {
		var current = this.utils.getCPUTimes();
		var times = current.forEach(function(aTime, aIndex) {
				return this.utils.calculateCPUUsage(this.mPreviousTimes[aIndex], aTime);
			}, this);
		this.mPreviousTimes = current;
		return times;
	},

	getUsage : function() {
		var time = this.getCurrentTimeInternal();
		return time.user + time.system;
	},

	getUsages : function() {
		var times = this.getCurrentTimesInternal();
		return times.map(function(aTime) {
			return aTime.user + aTime.system;
		});
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

function clCPUTime(aCPUTime) { 
	this.mCPUTime = aCPUTime;
}
clCPUTime.prototype = {
	classDescription : 'clCPUTime', 
	contractID : '@clear-code.com/system/time;2',
	classID : Components.ID('{eb5ea940-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPUTime
	]),

	get user() {
		return this.mCPUTime.user;
	},

	get nice() {
		return this.mCPUTime.nice;
	},

	get system() {
		return this.mCPUTime.system;
	},

	get idle() {
		return this.mCPUTime.idle;
	},

	get io_wait() {
		return this.mCPUTime.IOWait;
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
