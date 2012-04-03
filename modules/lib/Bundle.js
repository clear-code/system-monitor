var EXPORTED_SYMBOLS = ["Bundle"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
const { XPCOMUtils } = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

var Bundle = {};

function defineLazyBundle(target, name, path) {
  target.__defineGetter__(name, function () {
    var privateName = "_" + name;
    if (!target[privateName])
      target[privateName] = Services.strings.createBundle(path);
    return target[privateName];
  });
}

defineLazyBundle(Bundle, "systemMonitor", "chrome://system-monitor/locale/system-monitor.properties");
