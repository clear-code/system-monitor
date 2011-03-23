Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://system-monitor-modules/clSystem.js');

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([clSystem, clCPU, clCPUTime, clMemory]);
