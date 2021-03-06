// var Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);

const PACKAGE_NAME = 'system-monitor';
const MODULES_ROOT = 'resource://system-monitor-modules/';
const DOMAIN = 'extensions.system-monitor@clear-code.com.';

const PERMISSION_NAME = 'system-monitor';
const PERMISSION_CONFIRM_ID = 'system-monitor-add-monitor';
const PERMISSION_CONFIRM_ICON = 'chrome://'+PACKAGE_NAME+'/content/icon.png';
const STRING_BUNDLE_URL = 'chrome://'+PACKAGE_NAME+'/locale/system-monitor.properties';

const PERMISSION_DENIED_TOPIC = 'system-monitor:permission-denied';
const PERMISSION_UNKNOWN_TOPIC = 'system-monitor:unknown-permission';

var EXPORTED_SYMBOLS = ['clSystem', 'clCPU'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import(MODULES_ROOT+'CachedAPI.js');

XPCOMUtils.defineLazyModuleGetter(this, 'Promise', 'resource://gre/modules/Promise.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services', 'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'confirmWithPopup', MODULES_ROOT+'lib/confirmWithPopup.js');
XPCOMUtils.defineLazyModuleGetter(this, 'prefs', MODULES_ROOT+'lib/prefs.js');
XPCOMUtils.defineLazyGetter(this, 'bundle', function () {
	var ns = {};
	Components.utils.import(MODULES_ROOT+'lib/stringBundle.js', ns);
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
	if (!aWindow ||
		typeof aWindow.Window != 'function' ||
		!(aWindow instanceof aWindow.Window))
		return null;

	return aWindow
			.top
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
}

XPCOMUtils.defineLazyGetter(this, 'gNativeCPU', function () {
	var utils = {};
	var OS = Services.appinfo.OS.toLowerCase();

	if (OS.indexOf('win') == 0)
		Components.utils.import(MODULES_ROOT+'WINNT/cpu.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import(MODULES_ROOT+'Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import(MODULES_ROOT+'Darwin/utils.js', utils);
	else
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

	utils.sumCPUTimes = function(aCPUTimes) {
		var total = {
			user   : 0,
			system : 0,
			nice   : 0,
			idle   : 0,
			iowait : 0
		};
		for (let [, time] in Iterator(aCPUTimes)) {
			total.user   += time.user;
			total.system += time.system;
			total.nice   += time.nice;
			total.idle   += time.idle;
			total.iowait += time.iowait;
		}
		return total;
	};

	var mPreviousTimesForTime = utils.getCPUTimes();
	utils.getCurrentTimeInternal = function() {
		var current = this.getCPUTimes();
		var time = this.calculateCPUUsage(this.sumCPUTimes(mPreviousTimesForTime), this.sumCPUTimes(current));
		mPreviousTimesForTime = current;
		return time;
	};

	var mPreviousTimesForTimes = mPreviousTimesForTime;
	utils.getCurrentTimesInternal = function() {
		var current = this.getCPUTimes();
		var times = [];
		for (let i in current) {
			times[i] = this.calculateCPUUsage(mPreviousTimesForTimes[i], current[i]);
		}
		mPreviousTimesForTimes = current;
		return times;
	};

	return utils;
});

XPCOMUtils.defineLazyGetter(this, 'gNativeMemory', function () {
	var utils = {};
	var OS = Services.appinfo.OS.toLowerCase();

	if (OS.indexOf('win') == 0)
		Components.utils.import(MODULES_ROOT+'WINNT/memory.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import(MODULES_ROOT+'Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import(MODULES_ROOT+'Darwin/utils.js', utils);
	else
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

	return utils;
});

XPCOMUtils.defineLazyGetter(this, 'gNativeNetwork', function () {
	var utils = {};
	var OS = Services.appinfo.OS.toLowerCase();

	if (OS.indexOf('win') == 0)
		Components.utils.import(MODULES_ROOT+'WINNT/network.js', utils);
	else if (OS.indexOf('linux') == 0)
		Components.utils.import(MODULES_ROOT+'Linux/utils.js', utils);
	else if (OS.indexOf('darwin') == 0)
		Components.utils.import(MODULES_ROOT+'Darwin/utils.js', utils);
	else
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

	return utils;
});

/**
 * On some environments, too frequently calls of system functions can
 * break the result. (For example, on Windows, CPU usage will be 100%
 * wrongly if there are two (or more) watchers.)
 * This version returns the cached (last) result for frequently calls.
 * Lifetime of caches can be customized by user preferences.
 */
var gCachedNativeAPI = {
	_definitions : {
		cpu : {
			get source() gNativeCPU,
			methods : [
				'getCPUTimes',
				'getCount',
				'getCurrentTimeInternal',
				'getCurrentTimesInternal'
			]
		},
		memory : {
			get source() gNativeMemory,
			methods : [
				'getMemory'
			]
		},
		network : {
			get source() gNativeNetwork,
			methods : [
				'getNetworkLoad'
			]
		}
	},

	_define : function(aKey) {
		var definition = this._definitions[aKey];
		if (!definition)
			return;

		delete this[aKey];
		XPCOMUtils.defineLazyGetter(this, aKey, function() new CachedAPI(
			definition.source,
			definition.methods,
			prefs.getPref(this.domain + aKey)
		));
	},

	init : function() {
		prefs.addPrefListener(this);
		for (let [key, ] in Iterator(this._definitions)) {
			this._define(key);
		}
	},

	domain : DOMAIN + 'lifetime.',
	observe : function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case 'nsPref:changed':
				return this._define(aData.replace(this.domain, ''));
		}
	}
};
gCachedNativeAPI.init();


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
		Ci.nsIObserver,
		Ci.nsIDOMGlobalPropertyInitializer
	]),

	toString : function() {
		return '[object System]';
	},

	addMonitor : function(aTopic, aMonitor, aInterval) {
		var caller = arguments.callee.caller;
		var owner = caller && Components.utils.getGlobalForObject(caller);
		if (owner &&
			!(typeof owner.Window == 'function' &&
			  owner instanceof owner.Window))
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
				Services.obs.notifyObservers(aOwner, PERMISSION_DENIED_TOPIC, null);
				return false;
			case Ci.nsIPermissionManager.ALLOW_ACTION:
				return this._addMonitorWithOwnerInternal(aTopic, aMonitor, aInterval, aOwner);
		}
		Services.obs.notifyObservers(aOwner, PERMISSION_UNKNOWN_TOPIC, null);
		var self = this;
		this._ensureAllowed(aOwner)
			.then(function() {
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
		var uri = Services.io.newURI(aOwner.location.href, null, null);
		// see also:
		//   https://github.com/clear-code/system-monitor/issues/9
		//   https://bugzilla.mozilla.org/show_bug.cgi?id=204285
		if (uri.scheme == 'file')
			return Promise.reject(new Error('Local files cannot have permission to monitor system informations.'));

		var siteName;
		try {
			// throws exception for special URLs (e.g., about:blank)
			siteName = uri.host;
		} catch (x) {
			siteName = uri.spec;
		}

		var self = this;
		return confirmWithPopup({
					browser : getOwnerFrameElement(aOwner),
					label   : bundle.getFormattedString('permission_confirm_text', [siteName]),
					value   : PERMISSION_CONFIRM_ID,
					image   : PERMISSION_CONFIRM_ICON,
					buttons : [
						bundle.getString('permission_confirm_yes'),
						bundle.getString('permission_confirm_yes_forever'),
						bundle.getString('permission_confirm_no_forever')
					]
				})
				.then(function(aButtonIndex) {
					var permission, expire;
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
							return;
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

	get owner() this.ownerID && this.ownerUtils.getOuterWindowWithId(this.ownerID),

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

		function property(value) {
			return {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value:        value
			};
		}

		function getter(getterFunction) {
			return {
				enumerable:   true,
				configurable: true,
				get:          getterFunction
			};
		}

		var self = this;
		var contentSystem = Components.utils.createObjectIn(aWindow);
		Object.defineProperties(contentSystem, {
			addMonitor:    property(this.addMonitor.bind(this)),
			removeMonitor: property(this.removeMonitor.bind(this)),
			toString:      property(this.toString.bind(this)),
			cpu:           getter(function () { return self.cpu; })
		});
		Components.utils.makeObjectPropsNormal(contentSystem);

		return contentSystem;
	}
};
clSystem.DOMAIN = clSystem.prototype.DOMAIN = DOMAIN;

var gCPU;
function clCPU() {
	if (gCPU)
		return gCPU;
	return gCPU = this;
}
clCPU.prototype = {
	toString : function() {
		return '[object CPU]';
	},

	getCurrentTime : function() {
		return gCachedNativeAPI.cpu.getCurrentTimeInternal();
	},

	getCurrentTimes : function() {
		return gCachedNativeAPI.cpu.getCurrentTimesInternal();
	},

	getUsage : function() {
		var time = this.getCurrentTime();
		return time.user + time.system;
	},

	getUsages : function() {
		return this.getCurrentTimes().map(function (time) time.user + time.system);
	},

	get count() gCachedNativeAPI.cpu.getCount()
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

	get owner() this.ownerID && this.ownerUtils.getOuterWindowWithId(this.ownerID),
	init : function(aOwner) {
		this.ownerUtils = getDOMWindowUtils(aOwner);
		this.ownerID = this.ownerUtils && this.ownerUtils.outerWindowID;
		this.innerID = this.ownerUtils && this.ownerUtils.currentInnerWindowID;
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
		delete this.innerID;
		delete this.ownerID;
		delete this.ownerUtils;
		delete this.system;
	},
	equals : function(aTopic, aMonitor) {
		return this.topic === aTopic && this.monitor === aMonitor;
	},
	isOwnerDestroyed : function() {
		// if this is not associated to any window, never stop automatically.
		if (!this.ownerID)
			return false;

		// when the tab or the window is closed, or the iframe is removed
		var owner = this.owner;
		if (!owner || owner.closed)
			return true;

		// when the content of the window is replaced
		return this.ownerUtils.currentInnerWindowID != this.innerID;
	},
	getMonitoringObject : function() {
		switch (this.topic) {
			case 'cpu-usage':
				return this.system.cpu.getUsage(); // this is just a primitive!
			case 'cpu-usages':
				return this.system.cpu.getUsages();

			case 'cpu-time':
				return this.export(this.system.cpu.getCurrentTime());
			case 'cpu-times':
				return this.system.cpu.getCurrentTimes().map(this.export, this);

			case 'memory-usage':
				return this.export(gCachedNativeAPI.memory.getMemory());

			case 'network-usage':
				return this.export(gCachedNativeAPI.network.getNetworkLoad());

			default:
				this.destroy();
				throw Components.results.NS_ERROR_FAILURE;
		}
	},
	export : function(aChromeObject, aType) {
		if (!this.owner)
			return aChromeObject;

		var contentObject = Components.utils.createObjectIn(this.owner) ;
		var descriptions = {};
		Object.keys(aChromeObject).forEach(function(key) {
			var value = aChromeObject[key];
			descriptions[key] = {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value:        value
			};
		});
		Object.defineProperties(contentObject, descriptions);
		Components.utils.makeObjectPropsNormal(contentObject);
		return contentObject;
	},

	// nsITimerCallback
	notify : function(aTimer) {
		if (this.isOwnerDestroyed()) {
			this.destroy();
			return;
		}

		var monitorArgumentValue = this.getMonitoringObject();

		try {
			if (typeof this.monitor == 'object' &&
			    this.monitor &&
			    typeof this.monitor.monitor == 'function') {
				this.monitor.monitor(monitorArgumentValue);
			}
			else if (typeof this.monitor == 'function') {
				this.monitor.call(null, monitorArgumentValue);
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

function applyPlatformDefaultPrefs() {
  const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
                       .getService(Ci.nsIXULAppInfo)
                       .QueryInterface(Ci.nsIXULRuntime);
  var OS = XULAppInfo.OS;
  var processed = {};
  var originalKeys = prefs.getDescendant(DOMAIN + 'platform.' + OS);
  for (let i = 0, maxi = originalKeys.length; i < maxi; i++) {
    let originalKey = originalKeys[i];
    let key = originalKey.replace('platform.' + OS + '.', '');
    prefs.setDefaultPref(key, prefs.getPref(originalKey));
    processed[key] = true;
  }
  originalKeys = prefs.getDescendant(DOMAIN + 'platform.default');
  for (let i = 0, maxi = originalKeys.length; i < maxi; i++) {
    let originalKey = originalKeys[i];
    let key = originalKey.replace('platform.default.', '');
    if (!(key in processed))
      prefs.setDefaultPref(key, prefs.getPref(originalKey));
  }
}

const PREFS_VERSION = 1;
function migratePrefs() {
  switch (prefs.getPref(DOMAIN + 'prefsVersion') || 0) {
    case 0:
      {
        let color = prefs.getPref(DOMAIN + 'memory-usage.color.self');
        let style = prefs.getPref(DOMAIN + 'memory-usage.style');
        if (color)
          prefs.setPref(DOMAIN + 'memory-usage.color.foreground.1', color);

        if (style & 128) {
          style ^= 128;
          style |= 256;
          prefs.setPref(DOMAIN + 'memory-usage.style', style);
        }

        prefs.clearPref(DOMAIN + 'memory-usage.color.self');
      }

      prefs.setPref(DOMAIN + 'prefsVersion', PREFS_VERSION);
      break;

    default:
      break;
  }
}

applyPlatformDefaultPrefs();
migratePrefs();

