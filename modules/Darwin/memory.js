var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

const integer_t = ctypes.uint64_t;
const natural_t = ctypes.uint64_t;
const host_basic_info = new ctypes.StructType('host_basic_info', [
		{ max_cpus         : integer_t },
		{ avail_cpus       : integer_t },
		{ memory_size      : natural_t },
		{ cpu_type         : ctypes.uint64_t },
		{ cpu_subtype      : ctypes.uint64_t },
		{ cpu_threadtype   : ctypes.uint64_t },
		{ physical_cpu     : integer_t },
		{ physical_cpu_max : integer_t },
		{ logical_cpu      : integer_t },
		{ logical_cpu_max  : integer_t },
		{ max_mem          : ctypes.uint64_t }
	]);

const XXX = ctypes.open('');
addShutdownListener(function() { XXX.close(); });

function getMemory() {
}
