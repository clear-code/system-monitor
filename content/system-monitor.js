const Cc = Components.classes;
const Ci = Components.interfaces;

var gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance().QueryInterface(Ci.clICPUMonitor);
dump(gCPU.idle + "\n");
