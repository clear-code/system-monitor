var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

var gLibgtop2 = ctypes.open('libgtop-2.0.so');
addShutdownListener(function() { gLibgtop2.close(); });

var libgtop_init = gLibgtop2.declare(
		'glibtop_init',
		ctypes.default_abi,
		ctypes.void_t
	);
glibtop_init();

function getCount() {
	return 0;
}

function getCPUTimes() {
	return [];
}

function calculateCPUUsage(aPrevious, aCurrent) {
	return null;
}

function getMemory() {
	return null;
}
