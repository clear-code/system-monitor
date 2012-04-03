var EXPORTED_SYMBOLS = ["SystemMonitorMemoryItem"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var { SystemMonitorSimpleGraphItem } = Cu.import("resource://system-monitor-modules/SystemMonitorSimpleGraphItem.js", {});
var { prefs } = Cu.import("resource://system-monitor-modules/lib/prefs.js", {});

function SystemMonitorMemoryItem(window, config) {
  this.setWindow(window);
  this.setConfig(config);
}
SystemMonitorMemoryItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,

  id       : "memory-usage",
  type     : "memory-usage",
  itemId   : "system-monitor-memory-usage",
  get tooltip() {
    return document.getElementById("system-monitor-memory-usage-tooltip-label");
  },
  self              : "#FFEE00",
  selfGradient      : ["#FFEE00", "#FFEE00"],
  selfGradientStyle : null,
  selfGlobalAlpha   : 1,
  start : function SystemMonitorMemoryMonitor_start() {
    this.__proto__.__proto__.start.apply(this, arguments);
    if (this.item) {
      this.onChangePref(this.domain+this.id+".color.selfGlobalAlpha");
      this.onChangePref(this.domain+this.id+".color.self");
    }
  },
  drawGraph : function SystemMonitorMemoryMonitor_drawGraph() {
    this.__proto__.__proto__.drawGraph.apply(this, arguments);

    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var h = canvas.height;
    var values = this.valueArray;
    if (this.style & this.STYLE_POLYGONAL) {
      let graphValues = [];
      for (let i in values) {
        graphValues[i] = values[i] && values[i][1] || 0;
      }
      this.drawGraphPolygon(graphValues || 0, h, this.self);
    } else { // bar graph
      let x = 0;
      context.save();
      context.globalAlpha = this.selfGlobalAlpha;
      for each (let value in values) {
        if (value) {
          this.drawGraphBar(this.selfGradientStyle, x, h, h * (value[0] - value[1]), h * value[0]);
        }
        x += this.unit;
      }
      context.restore();
    }
  },
  onChangePref : function SystemMonitorMemoryMonitor_onChangePref(aData) {
    var part = aData.replace(this.domain+this.id+".", "");
    switch (part) {
    case "color.selfGlobalAlpha":
      this.selfGlobalAlpha = Number(prefs.getPref(aData));
      if (this.listening)
        this.drawGraph(true);
      return;
    default:
      return this.__proto__.__proto__.onChangePref.apply(this, arguments);
    }
  },
  // clISystemMonitor
  monitor : function SystemMonitorMemoryMonitor_monitor(aValue) {
    var hasSelfValue = "self" in aValue && aValue.self > -1;
    this.valueArray.shift();
    var value = [aValue.used / aValue.total,
                 0];
    if (hasSelfValue)
      value[1] = aValue.self / aValue.total;
    this.valueArray.push(value);

    this.drawGraph();

    var params = [parseInt(aValue.total / 1024 / 1024),
                  parseInt(aValue.used / 1024 / 1024),
                  parseInt(aValue.used / aValue.total * 100)];
    this.tooltip.textContent = hasSelfValue ?
      this.bundle.getFormattedString("memory_usage_self_tooltip",
                                     params.concat([
                                       parseInt(aValue.self / 1024 / 1024),
                                       parseInt(aValue.self / aValue.total * 100)
                                     ])) :
      this.bundle.getFormattedString("memory_usage_tooltip", params) ;
  }
};
