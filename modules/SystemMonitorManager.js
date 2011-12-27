var EXPORTED_SYMBOLS = ["SystemMonitorManager"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const BRANCH_ROOT = "extensions.system-monitor@clear-code.com";
const DOMAIN = BRANCH_ROOT + ".";

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
    Services.obs.notifyObservers(container, this.type, "");
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
  get _system() {
    return system;
  },

  get cpuCount() {
    return system.cpu.count;
  },

  _listeners: [],
  addListener: function (args) {
    this._listeners.push(new SystemMonitorListener(args.type, args.id));
  }
};

SystemMonitorManager.addListener({
  type : "cpu-usages",
  id   : "cpu-usage"
});

SystemMonitorManager.addListener({
  type : "memory-usage",
  id   : "memory-usage"
});
