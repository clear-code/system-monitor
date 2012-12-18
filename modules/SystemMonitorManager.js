var EXPORTED_SYMBOLS = ["SystemMonitorManager"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const BRANCH_ROOT = "extensions.system-monitor@clear-code.com";
const DOMAIN = BRANCH_ROOT + ".";

const TOPIC_BASE = "SystemMonitor:";

const { prefs } = Cu.import('resource://system-monitor-modules/lib/prefs.js', {});

const { clSystem } = Cu.import("resource://system-monitor-modules/clSystem.js", {});
const system = new clSystem();

function log(str) {
  dump(str + "\n");
}

function SystemMonitorListener(type, id) {
  // TODO: preference listener
  this.type = type;
  this.id = id;
  this.start();
  prefs.addPrefListener(this);
}

SystemMonitorListener.prototype = {
  id: "",
  type: "",
  _interval: 1000,
  get interval() {
    return prefs.getPref(DOMAIN + this.id + ".interval") || this._interval;
  },

  start: function () {
    system.addMonitor(this.type, this, this.interval);
  },

  stop: function () {
    system.removeMonitor(this.name, this);
    // Prefs.removeObserver(DOMAIN, this, false);
  },

  restart: function () {
    try {
      this.stop();
    } catch (x) {}
    this.start();
  },

  // called by clSystem every interval msec
  monitor: function (aValue) {
    var container = {};
    container.wrappedJSObject = aValue;
    Services.obs.notifyObservers(container, TOPIC_BASE + this.type, "");
  },

  // nsIObserver
  domain : DOMAIN,
  observe: function (aSubject, aTopic, aData) {
    switch (aTopic) {
    case "nsPref:changed":
      this.onChangePref(aData);
      break;
    }
  },

  onChangePref: function (aData) {
    var part = aData.replace(DOMAIN + this.id + ".", "");

    switch (part) {
    case "interval":
      this.restart();
    }
  }
};

var SystemMonitorManager = {
  TOPIC_BASE : TOPIC_BASE,
  DOMAIN : DOMAIN,

  get _system() {
    return system;
  },

  get cpuCount() {
    return system.cpu.count;
  },

  _listeners: [],
  addListener: function (args) {
    this._listeners.push(new SystemMonitorListener(args.type, args.id));
  },

  init: function () {
    this.applyPlatformDefaultPrefs();

    this.addListener({
      type : "cpu-usages",
      id   : "cpu-usage"
    });

    this.addListener({
      type : "memory-usage",
      id   : "memory-usage"
    });

    this.addListener({
      type : "network-usage",
      id   : "network-usage"
    });
  },

  applyPlatformDefaultPrefs: function () {
    const XULAppInfo = Cc["@mozilla.org/xre/app-info;1"]
                         .getService(Ci.nsIXULAppInfo)
                         .QueryInterface(Ci.nsIXULRuntime);
    var OS = XULAppInfo.OS;
    var processed = {};
    var originalKeys = prefs.getDescendant(DOMAIN+"platform."+OS);
    for (let i = 0, maxi = originalKeys.length; i < maxi; i++) {
      let originalKey = originalKeys[i];
      let key = originalKey.replace("platform."+OS+".", "");
      prefs.setDefaultPref(key, prefs.getPref(originalKey));
      processed[key] = true;
    }
    originalKeys = prefs.getDescendant(DOMAIN+"platform.default");
    for (let i = 0, maxi = originalKeys.length; i < maxi; i++) {
      let originalKey = originalKeys[i];
      let key = originalKey.replace("platform.default.", "");
      if (!(key in processed))
        prefs.setDefaultPref(key, prefs.getPref(originalKey));
    }
  }
};
SystemMonitorManager.init();
