var EXPORTED_SYMBOLS = ['clSystem', 'clCPU', 'clCPUTime', 'clMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

const PERMISSION_NAME = 'system-monitor';
const PERMISSION_CONFIRM_ID = 'system-monitor-add-monitor';
const PERMISSION_CONFIRM_ICON = 'chrome://system-monitor/content/icon.png';
const PERMISSION_CONFIRM_ICON_WIDTH = 32;
const PERMISSION_CONFIRM_ICON_HEIGHT = 32;
const STRING_BUNDLE_URL = 'chrome://system-monitor/locale/system-monitor.properties';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyGetter(this, 'Services', function () {
	var ns = {};
	Components.utils.import('resource://gre/modules/Services.jsm', ns);
	return ns.Services;
});

XPCOMUtils.defineLazyGetter(this, 'Deferred', function () {
	var ns = {};
	Components.utils.import('resource://system-monitor-modules/lib/jsdeferred.js', ns);
	return ns.Deferred;
});

XPCOMUtils.defineLazyGetter(this, 'confirmWithPopup', function () {
	var ns = {};
	Components.utils.import('resource://system-monitor-modules/lib/confirmWithPopup.js', ns);
	return ns.confirmWithPopup;
});

XPCOMUtils.defineLazyGetter(this, 'bundle', function () {
	var ns = {};
	Components.utils.import('resource://system-monitor-modules/lib/stringBundle.js', ns);
	return ns.stringBundle.get(STRING_BUNDLE_URL);
});

function getDOMWindowUtils(aWindow) {
	try {
		var utils = aWindow
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIDOMWindowUtils);
		return utils;
	}
	catch(e) {
	}
	return null;
}

function getOwnerFrameElement(aWindow) {
	if (!aWindow || !(aWindow instanceof Ci.nsIDOMWindow))
		return null;

	return aWindow
			.top
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
}


function clSystem() {
	if (Services.vc.compare(Services.appinfo.platformVersion, '1.9.99') <= 0)
		throw new Error('initialization error: JavaScript implementations are available on Gecko 2.0 o later.');

	this.monitors = [];
	this.cpu = new clCPU();
	Services.obs.addObserver(this, this.type, false);
}
clSystem.prototype = {
	classDescription : 'clSystem',
	contractID : '@clear-code.com/system;2',
	classID : Components.ID('{12ae3fc0-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([
		Ci.clISystem,
		Ci.clISystemInternal,
		Ci.nsIObserver,
		Ci.nsIDOMGlobalPropertyInitializer
	]),

	toString : function() {
		return '[object System]';
	},

	addMonitor : function(aTopic, aMonitor, aInterval) {
		var caller = arguments.callee.caller;
		var owner = caller && Components.utils.getGlobalForObject(caller);
		if (owner && !(owner instanceof Ci.nsIDOMWindow))
			owner = null;
		return this.addMonitorWithOwner(aTopic, aMonitor, aInterval, owner || this.owner);
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
		switch (this.getPermission(aOwner)) {
			case Ci.nsIPermissionManager.DENY_ACTION:
				return false;
			case Ci.nsIPermissionManager.ALLOW_ACTION:
				return this._addMonitorWithOwnerInternal(aTopic, aMonitor, aInterval, aOwner);
		}
		var self = this;
		this._ensureAllowed(aOwner)
			.next(function() {
				self._addMonitorWithOwnerInternal(aTopic, aMonitor, aInterval, aOwner);
			});
		return true;
	},
	_addMonitorWithOwnerInternal : function(aTopic, aMonitor, aInterval, aOwner) {
		if (this.monitors.every(function(aExistingMonitor) {
				return !aExistingMonitor.equals(aTopic, aMonitor);
			})) {
			this.monitors.push(new MonitorData(aTopic, aMonitor, aInterval, aOwner, this));
			return true;
		}
		return false;
	},
	_ensureAllowed : function(aOwner) {
		var self = this;
		var uri  = Services.io.newURI(aOwner.location.href, null, null)
		return confirmWithPopup({
					browser     : getOwnerFrameElement(aOwner),
					label       : bundle.getFormattedString('permission_confirm_text', [uri.host]),
					value       : PERMISSION_CONFIRM_ID,
					image       : PERMISSION_CONFIRM_ICON,
					imageWidth  : PERMISSION_CONFIRM_ICON_WIDTH.
					imageHeight : PERMISSION_CONFIRM_ICON_HEIGHT,
					buttons     : [
						bundle.getString('permission_confirm_yes'),
						bundle.getString('permission_confirm_yes_forever'),
						bundle.getString('permission_confirm_no_forever')
					]
				})
				.next(function(aButtonIndex) {
					var permission , expire;
					switch (aButtonIndex) {
						case 0:
							permission = Ci.nsIPermissionManager.ALLOW_ACTION;
							expire = Ci.nsIPermissionManager.EXPIRE_SESSION;
							break;
						case 1:
							permission = Ci.nsIPermissionManager.ALLOW_ACTION;
							expire = Ci.nsIPermissionManager.EXPIRE_NEVER;
							break;
						case 2:
							permission = Ci.nsIPermissionManager.DENY_ACTION;
							expire = Ci.nsIPermissionManager.EXPIRE_NEVER;
							break;
						default:
							permission = Ci.nsIPermissionManager.DENY_ACTION;
							expire = Ci.nsIPermissionManager.EXPIRE_SESSION;
							break;
					}
					Services.perms.add(uri, PERMISSION_NAME, permission, expire);
				});
	},

	removeAllMonitors : function() {
		this.monitors.slice(0).forEach(function(aMonitor) {
			aMonitor.destroy();
		});
	},

	type : 'quit-application-granted',
	observe : function(aSubject, aTopic, aData) {
		Services.obs.removeObserver(this, this.type);
		this.removeAllMonitors();
		delete this.ownerUtils;
		delete this.ownerID;
	},

	get owner() {
		return this.ownerID && this.ownerUtils.getOuterWindowWithId(this.ownerID);
	},

	getPermission : function(aGlobal) {
		if (!aGlobal)
			return Ci.nsIPermissionManager.ALLOW_ACTION;

		var location = aGlobal.location;
		if (!location)
			return Ci.nsIPermissionManager.ALLOW_ACTION;

		var uri = Services.io.newURI(location.href, null, null);
		if (uri.schemeIs('chrome') || uri.schemeIs('resource'))
			return Ci.nsIPermissionManager.ALLOW_ACTION;

		return Services.perms.testExactPermission(uri, PERMISSION_NAME);
	},

	// nsIDOMGlobalPropertyInitializer
	init : function(aWindow) {
		this.ownerUtils = getDOMWindowUtils(aWindow);
		this.ownerID = this.ownerUtils && this.ownerUtils.outerWindowID;

		return Components.utils.evalInSandbox(<![CDATA[
				(function(aSystem) {
					return {
						addMonitor : Function.bind.call(aSystem.addMonitor, aSystem),
						removeMonitor : Function.bind.call(aSystem.removeMonitor, aSystem),
						toString : Function.bind.call(aSystem.toString, aSystem),
						get cpu() {
							return aSystem.cpu;
						}
					};
				})
			]]>.toString(), Components.utils.Sandbox(aWindow))(this);
	}
};

var gCPU;
function clCPU() {
	if (gCPU)
		return gCPU;

	clCPU.loadUtils();
	this.mPreviousTimes = this.utils.getCPUTimes();
	return gCPU = this;
}
clCPU.prototype = {
	classDescription : 'clCPU',
	contractID : '@clear-code.com/system/cpu;2',
	classID : Components.ID('{ae145a80-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([
		Ci.clICPU
	]),

	toString : function() {
		return '[object CPU]';
	},

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
		let times = this.getCurrentTimesInternal();
		for (let i in times) {
		  times[i] = new clCPUTime(times[i]);
		}
		return times;
	},
	getCurrentTimesInternal : function() {
		var current = this.utils.getCPUTimes();
		var times = [];
		for (let i in current) {
		  times[i] = this.utils.calculateCPUUsage(this.mPreviousTimes[i], current[i]);
		}
		this.mPreviousTimes = current;
		return times;
	},

	getUsage : function() {
		var time = this.getCurrentTimeInternal();
		return time.user + time.system;
	},

	getUsages : function() {
		var times = this.getCurrentTimesInternal();
		for (let i in times) {
		  times[i] = times[i].user + times[i].system;
		}
		return times;
	},

	get count() {
		return this.utils.getCount();
	}
};
clCPU.loadUtils = function() {
	if (this.prototype.utils)
		return;

	var utils = {};
	var OS = Services.appinfo.OS.toLowerCase();
	if (OS.indexOf('win') == 0)
		Components.utils.import('resource://system-monitor-modules/WINNT/cpu.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import('resource://system-monitor-modules/Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import('resource://system-monitor-modules/Darwin/utils.js', utils);
	else
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

	this.prototype.utils = utils;
};

function clCPUTime(aCPUTime) {
	this.user    = aCPUTime.user;
	this.nice    = aCPUTime.nice;
	this.system  = aCPUTime.system;
	this.idle    = aCPUTime.idle;
	this.io_wait = aCPUTime.iowait;
}
clCPUTime.prototype = {
	classDescription : 'clCPUTime',
	contractID : '@clear-code.com/system/time;2',
	classID : Components.ID('{eb5ea940-4883-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([
		Ci.clICPUTime
	]),

	toString : function() {
		return '[object CPUTime]';
	}
};

function clMemory() {
	clMemory.loadUtils();
	var memory = this.utils.getMemory();
	this.total       = memory.total;
	this.used        = memory.used;
	this.free        = memory.free;
	this.virtualUsed = memory.virtualUsed;
	this.self        = memory.self;
}
clMemory.prototype = {
	classDescription : 'clMemory',
	contractID : '@clear-code.com/system/memory;2',
	classID : Components.ID('{06c631d0-4884-11e0-9207-0800200c9a66}'),
	QueryInterface : XPCOMUtils.generateQI([
		Ci.clIMemory
	]),

	toString : function() {
		return '[object Memory]';
	}
};
clMemory.loadUtils = function() {
	if (this.prototype.utils)
		return;

	var utils = {};
	var OS = Services.appinfo.OS.toLowerCase();
	if (OS.indexOf('win') == 0)
		Components.utils.import('resource://system-monitor-modules/WINNT/memory.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import('resource://system-monitor-modules/Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import('resource://system-monitor-modules/Darwin/utils.js', utils);
	else
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

	this.prototype.utils = utils;
};

function MonitorData(aTopic, aMonitor, aInterval, aOwner, aSystem) {
	this.topic = aTopic;
	this.monitor = aMonitor;
	this.interval = aInterval;
	this.system = aSystem;
	this.init(aOwner);
}
MonitorData.prototype = {
	QueryInterface : XPCOMUtils.generateQI([
		Ci.nsITimerCallback
	]),

	get owner() {
		return this.ownerID && this.ownerUtils.getOuterWindowWithId(this.ownerID);
	},
	init : function(aOwner) {
		this.ownerUtils = getDOMWindowUtils(aOwner);
		this.ownerID = this.ownerUtils && this.ownerUtils.outerWindowID;
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
		delete this.ownerID;
		delete this.ownerUtils;
		delete this.system;
	},
	equals : function(aTopic, aMonitor) {
		return this.topic == aTopic || this.monitor == aMonitor;
	},
	isOwnerDestroyed : function() {
		if (!this.ownerID)
			return false;

		var owner = this.owner;
		return (!owner || owner.closed);
	},
	getMonitoringObject : function() {
		switch (this.topic) {
			case 'cpu-usage':
				return this.system.cpu.getUsage();
			case 'cpu-usages':
				return this.system.cpu.getUsages();
			case 'cpu-time':
				return this.system.cpu.getCurrentTime();
			case 'cpu-times':
				return this.system.cpu.getCurrentTimes();
			case 'memory-usage':
				return new clMemory();
			default:
				this.destroy();
				throw Components.results.NS_ERROR_FAILURE;
		}
	},

	// nsITimerCallback
	notify : function(aTimer) {
		if (this.isOwnerDestroyed()) {
			this.destroy();
			return;
		}

		var value = this.getMonitoringObject();

		try {
			if (this.monitor instanceof Ci.clISystemMonitor ||
			    typeof this.monitor.monitor == 'function') {
				this.monitor.monitor(value);
			}
			else if (typeof this.monitor == 'function') {
				this.monitor.call(null, value);
			}
		}
		catch(e) {
			// when the window was unloaded
			// http://mxr.mozilla.org/mozilla-central/source/js/src/js.msg#351
			if (e.message == 'attempt to run compile-and-go script on a cleared scope')
				this.destroy();
			else
				throw e;
		}
	}
};

