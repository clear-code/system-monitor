var EXPORTED_SYMBOLS = ["StringBundle"];

var StringBundle = {};

StringBundle.systemMonitor = Components.classes["@mozilla.org/intl/stringbundle;1"]
  .getService(Components.interfaces.nsIStringBundleService)
  .createBundle("chrome://system-monitor/locale/system-monitor.properties");
