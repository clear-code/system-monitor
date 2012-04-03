(function () {
  var { SystemMonitorConfig }      = Components.utils.import("resource://system-monitor-modules/SystemMonitorConfig.js", {});
  var { SystemMonitorItemHandler } = Components.utils.import("resource://system-monitor-modules/SystemMonitorItemHandler.js", {});
  var { SystemMonitorMemoryItem }  = Components.utils.import("resource://system-monitor-modules/SystemMonitorMemoryItem.js", {});
  var { SystemMonitorCPUItem }     = Components.utils.import("resource://system-monitor-modules/SystemMonitorCPUItem.js", {});

  var config = new SystemMonitorConfig();
  config.setDomain();

  var memoryItem = new SystemMonitorMemoryItem(window, config);
  var cpuItem    = new SystemMonitorCPUItem(window, config);

  var memoryItemHandler = new SystemMonitorItemHandler(memoryItem);
  var cpuItemHandler    = new SystemMonitorItemHandler(cpuItem);

  window.addEventListener("load", memoryItemHandler, false);
  window.addEventListener("load", cpuItemHandler, false);
})();
