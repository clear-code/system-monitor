const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');


XPCOMUtils.defineLazyGetter(this, 'ObserverService', function () {
	return Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
});

XPCOMUtils.defineLazyGetter(this, 'XULAppInfo', function () {
	return Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime);
});

XPCOMUtils.defineLazyGetter(this, 'OS', function () {
	return XULAppInfo.OS.toLowerCase();
});

function baseSecurityCheckedComponent() {
}
baseSecurityCheckedComponent.prototype = {
	QueryInterface : XPCOMUtils.generateQI([
		Ci.nsISecurityCheckedComponent
	]),
	canCallMethod : function(aIID, aMethodName) {
		return 'allAccess';
	},
	canCreateWrapper : function(aIID) {
		return 'allAccess';
	},
	canGetProperty : function(aIID, aPropertyName) {
		return 'allAccess';
	},
	canSetProperty : function(aIID, aPropertyName) {
		return 'allAccess';
	}
};



function clSystem() { 
	this.init();
}
clSystem.prototype = {
	__proto__ : baseSecurityCheckedComponent.prototype,
	classDescription : 'clSystem', 
	contractID : '@clear-code.com/system;2',
	classID : Components.ID('{12ae3fc0-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clISystem,
		Ci.clISystemInternal,
		Ci.nsIObserver,
		Ci.nsISecurityCheckedComponent,
		Ci.nsIClassInfo
	]),

	addMonitor : function(aTopic, aMonitor, aInterval) {
		var caller = arguments.callee.caller;
		var owner = caller && Components.utils.getGlobalForObject(caller);
		if (owner && !(owner instanceof Ci.nsIDOMWindow))
			owner = null;
		return this.addMonitorWithOwner(aTopic, aMonitor, aInterval, owner);
	},

	removeMonitor : function(aTopic, aMonitor) {
		return this.monitors.some(function(aExistingMonitor, aIndex) {
			if (aExistingMonitor.equals(aTopic, aMonitor)) {
				aExistingMonitor.destroy();
				return true;
			}
			return false;
		}, this);
	},

	addMonitorWithOwner : function(aTopic, aMonitor, aInterval, aOwner) {
		if (this.monitors.every(function(aExistingMonitor) {
				return !aExistingMonitor.equals(aTopic, aMonitor);
			})) {
			this.monitors.push(new Monitor(aTopic, aMonitor, aInterval, aOwner, this));
			return true;
		}
		return false;
	},

	removeAllMonitors : function() {
		this.monitors.slice(0).forEach(function(aMonitor) {
			aMonitor.destroy();
		});
	},

	type : 'quit-application-granted',
	init : function() {
		this.monitors = [];
		ObserverService.addObserver(this, this.type, false);
	},
	observe : function(aSubject, aTopic, aData) {
		ObserverService.removeObserver(this, this.type);
		this.removeAllMonitors();
	},

	// nsIClassInfo 
	flags : Ci.nsIClassInfo.DOM_OBJECT | Ci.nsIClassInfo.SINGLETON,
	getInterfaces : function(aCount)
	{
		var interfaces = [Ci.clISystem];
		aCount.value = interfaces.length;
		return interfaces;
	},
	getHelperForLanguage : function(aLanguage)
	{
		return null;
	}
};
XPCOMUtils.defineLazyGetter(clSystem.prototype, 'cpu', function () {
	return new clCPU();
});

function clCPU() { 
	this.mPreviousTimes = this.utils.getCPUTimes();
}
clCPU.prototype = {
	__proto__ : baseSecurityCheckedComponent.prototype,
	classDescription : 'clCPU', 
	contractID : '@clear-code.com/system/cpu;2',
	classID : Components.ID('{ae145a80-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPU,
		Ci.nsISecurityCheckedComponent
	]),

	sumCPUTimes : function(aCPUTimes) {
		var total = {
				user   : 0,
				system : 0,
				nice   : 0,
				idle   : 0,
				iowait : 0
			};
		for each (let time in aCPUTimes) {
			total.user   += time.user;
			total.system += time.system;
			total.nice   += time.nice;
			total.idle   += time.idle;
			total.iowait += time.iowait;
		}
		return total;
	},

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
		return this.getCurrentTimesInternal().map(function(aUsage) {
				return new clCPUTime(aUsage);
			}, this);
	},
	getCurrentTimesInternal : function() {
		var current = this.utils.getCPUTimes();
		var times = current.map(function(aTime, aIndex) {
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
		times = times.map(function(aTime) {
			return aTime.user + aTime.system;
		});
		return times;
	},

	get count() {
		return this.utils.getCount();
	}
};
XPCOMUtils.defineLazyGetter(clCPU.prototype, 'utils', function () {
	var utils = {};
	if (OS.indexOf('win') == 0)
		Components.utils.import('resource://system-monitor-modules/Win/cpu.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import('resource://system-monitor-modules/Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import('resource://system-monitor-modules/Darwin/cpu.js', utils);
	else
		throw Components.results. NS_ERROR_NOT_IMPLEMENTED;
	return utils;
});

function clCPUTime(aCPUTime) { 
	this.mCPUTime = aCPUTime;
}
clCPUTime.prototype = {
	__proto__ : baseSecurityCheckedComponent.prototype,
	classDescription : 'clCPUTime', 
	contractID : '@clear-code.com/system/time;2',
	classID : Components.ID('{eb5ea940-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clICPUTime,
		Ci.nsISecurityCheckedComponent
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
		return this.mCPUTime.iowait;
	}
};

function clMemory() { 
}
clMemory.prototype = {
	__proto__ : baseSecurityCheckedComponent.prototype,
	classDescription : 'clMemory', 
	contractID : '@clear-code.com/system/memory;2',
	classID : Components.ID('{06c631d0-4884-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.clIMemory,
		Ci.nsISecurityCheckedComponent
	]),

	get total() {
		return this.utils.getMemory().total;
	},

	get used() {
		return this.utils.getMemory().used;
	},

	get free() {
		return this.utils.getMemory().free;
	},

	get virtualUsed() {
		return this.utils.getMemory().virtualUsed;
	}	
};
XPCOMUtils.defineLazyGetter(clMemory.prototype, 'utils', function () {
	var utils = {};
	if (OS.indexOf('win') == 0)
		Components.utils.import('resource://system-monitor-modules/Win/memory.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import('resource://system-monitor-modules/Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import('resource://system-monitor-modules/Darwin/memory.js', utils);
	else
		throw Components.results. NS_ERROR_NOT_IMPLEMENTED;
	return utils;
});

function Monitor(aTopic, aMonitor, aInterval, aOwner, aSystem) {
	this.topic = aTopic;
	this.monitor = aMonitor;
	this.interval = aInterval;
	this.owner = aOwner;
	this.system = aSystem;
	this.init();
}
Monitor.prototype = {
	init : function() {
		this.timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
		this.timer.initWithCallback(this, this.interval, Ci.nsITimer.TYPE_REPEATING_SLACK);
	},
	destroy : function() {
		this.system.monitors.splice(this.system.monitors.indexOf(this), 1);
		this.timer.cancel();
		delete this.timer;
		delete this.topic;
		delete this.monitor;
		delete this.interval;
		delete this.owner;
		delete this.system;
	},
	equals : function(aTopic, aMonitor) {
		return this.topic == aTopic || this.monitor == aMonitor;
	},
	notify : function(aTimer) {
		if (this.owner && this.owner.closed) {
			this.destroy();
			return;
		}

		var value;
		switch (this.topic) {
			case 'cpu-usage':
				value = this.system.cpu.getUsage();
				break;
			case 'cpu-usages':
				value = this.system.cpu.getUsages();
				break;
			case 'cpu-time':
				value = this.system.cpu.getCurrentTime();
				break;
			case 'cpu-times':
				value = this.system.cpu.getCurrentTimes();
				break;
			case 'memory-usage':
				value = new clMemory();
				break;
		}
		if (value !== undefined) {
			if (this.monitor instanceof Ci.clISystemMonitor) {
				this.monitor.monitor(value);
			}
			else if (typeof this.monitor == 'function') {
				this.monitor.call(null, value);
			}
			return;
		}

		throw Components.results.NS_ERROR_FAILURE;
	},
	QueryInterface : XPCOMUtils.generateQI([ 
		Ci.nsITimerCallback
	])
};

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([clSystem, clCPU, clCPUTime, clMemory]);
