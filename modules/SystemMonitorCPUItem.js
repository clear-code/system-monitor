var EXPORTED_SYMBOLS = ["SystemMonitorCPUItem"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var { SystemMonitorSimpleGraphItem } = Cu.import("resource://system-monitor-modules/SystemMonitorSimpleGraphItem.js", {});
var { SystemMonitorManager } = Cu.import("resource://system-monitor-modules/SystemMonitorManager.js", {});

function SystemMonitorCPUItem(window, config) {
  this.setWindow(window);
  this.setConfig(config);
}
SystemMonitorCPUItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,

  id       : "cpu-usage",
  type     : "cpu-usages",
  itemId   : "system-monitor-cpu-usage",
  multiplexed : true,
  get multiplexCount() {
    return this._multiplexCount || (this._multiplexCount = SystemMonitorManager.cpuCount);
  },
  get tooltip() {
    return document.getElementById("system-monitor-cpu-usage-tooltip-label");
  },
  // clISystemMonitor
  monitor : function SystemMonitorCPUMonitor_monitor(aValues) {
    this.valueArray.shift();
    this.valueArray.push(aValues);
    this.drawGraph();

    if (aValues.length > 1 && this.style & this.STYLE_UNIFIED)
      aValues = [this.getSum(aValues)];

    var parts = [];
    for (let i in aValues) {
      parts[i] = this.bundle.getFormattedString(
        "cpu_usage_tooltip_part",
        [parseInt(aValues[i] * 100)]
      );
    }
    parts = parts.join(this.bundle.getString("cpu_usage_tooltip_delimiter"));
    this.tooltip.textContent = this.bundle.getFormattedString(
      "cpu_usage_tooltip",
      [parts]
    );
  }
};
