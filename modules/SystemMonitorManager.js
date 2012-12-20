// var Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);

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
    system.removeMonitor(this.type, this);
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
  addListener: function (aArgs) {
    this._listeners.push(new SystemMonitorListener(aArgs.type, aArgs.id));
  },
  removeListener: function (aArgs) {
    this._listeners.some(function(aListener, aIndex) {
      if (aArgs.type == aListener.type && aArgs.id == aListener.id) {
        this._listeners[aIndex].stop();
        this._listeners.splice(aIndex, 1);
        return true;
      }
      return false;
    }, this);
  },

  _count: {},
  onStart: function(aListener) {
    var count = this._count[aListener.type] || 0;
    this._count[aListener.type] = count = count + 1;
    if (count > 1) return;
    this.addListener({
      type: aListener.type,
      id:   aListener.id
    });
  },
  onStop: function(aListener) {
    var count = this._count[aListener.type] || 0;
    this._count[aListener.type] = count = Math.max(0, count - 1);
    if (count > 0) return;
    this.removeListener({
      type: aListener.type,
      id:   aListener.id
    });
  }
};
