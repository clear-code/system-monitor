var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory', 'getNetworkLoad'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/ShutdownListener.js');
var { FileUtil } = Components.utils.import('resource://system-monitor-modules/lib/FileUtil.js', {});

const GLIBTOP_NCPU = 32;
const pid_t = ctypes.int;

const glibtop_cpu = new ctypes.StructType('glibtop_cpu', [
		{ flags     : ctypes.uint64_t },
		{ total     : ctypes.uint64_t },
		{ user      : ctypes.uint64_t },
		{ nice      : ctypes.uint64_t },
		{ sys       : ctypes.uint64_t },
		{ idle      : ctypes.uint64_t },
		{ iowait    : ctypes.uint64_t },
		{ irq       : ctypes.uint64_t },
		{ softirq   : ctypes.uint64_t },
		{ frequency : ctypes.uint64_t },
		{ xcpu_total   : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_user    : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_nice    : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_sys     : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_idle    : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_iowait  : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_irq     : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_softirq : ctypes.ArrayType(ctypes.uint64_t, GLIBTOP_NCPU) },
		{ xcpu_flags : ctypes.uint64_t }
	]);
const glibtop_mem = new ctypes.StructType('glibtop_mem', [
		{ flags  : ctypes.uint64_t },
		{ total  : ctypes.uint64_t },
		{ used   : ctypes.uint64_t },
		{ free   : ctypes.uint64_t },
		{ shared : ctypes.uint64_t },
		{ buffer : ctypes.uint64_t },
		{ cached : ctypes.uint64_t },
		{ user   : ctypes.uint64_t },
		{ locked : ctypes.uint64_t }
	]);
const glibtop_proc_mem = new ctypes.StructType('glibtop_proc_mem', [
		{ flags    : ctypes.uint64_t },
		{ size     : ctypes.uint64_t },
		{ vsize    : ctypes.uint64_t },
		{ resident : ctypes.uint64_t },
		{ share    : ctypes.uint64_t },
		{ rss      : ctypes.uint64_t },
		{ rss_rlim : ctypes.uint64_t }
	]);
const glibtop_netload = new ctypes.StructType('glibtop_netload', [
		{ flags         : ctypes.uint64_t },
		{ if_flags      : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_IF_FLAGS      */
		{ mtu           : ctypes.uint32_t }, /* GLIBTOP_NETLOAD_MTU           */
		{ subnet        : ctypes.uint32_t }, /* GLIBTOP_NETLOAD_SUBNET        */
		{ netaddress    : ctypes.uint32_t }, /* GLIBTOP_NETLOAD_ADDRESS       */
		{ packets_in    : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_PACKETS_IN    */
		{ packets_out   : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_PACKETS_OUT   */
		{ packets_total : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_PACKETS_TOTAL */
		{ bytes_in      : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_BYTES_IN      */
		{ bytes_out     : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_BYTES_OUT     */
		{ bytes_total   : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_BYTES_TOTAL   */
		{ errors_in     : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_ERRORS_IN     */
		{ errors_out    : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_ERRORS_OUT    */
		{ errors_total  : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_ERRORS_TOTAL  */
		{ collisions    : ctypes.uint64_t }, /* GLIBTOP_NETLOAD_COLLISIONS    */
		{ address6      : ctypes.ArrayType(ctypes.uint8_t, 16) },    /* GLIBTOP_NETLOAD_ADDRESS6      */
		{ prefix6       : ctypes.ArrayType(ctypes.uint8_t, 16) },    /* GLIBTOP_NETLOAD_PREXIF6       */
		{ scope6        : ctypes.uint8_t },    /* GLIBTOP_NETLOAD_SCOPE6        */
		{ hwaddress     : ctypes.ArrayType(ctypes.uint8_t, 8) }      /* GLIBTOP_NETLOAD_HWADDRESS     */
	]);


function openLibrary() {
	var names = Array.slice(arguments);
	for each (let name in names) {
		try {
			let library = ctypes.open(name);
			addShutdownListener(function() { library.close(); });
			return library;
		}
		catch(e) {
		}
	}
	throw new Error('no library found:\n'+names.join('\n'));
}

const gLibgtop2 = openLibrary(
		'libgtop-2.0.so.7',
		'libgtop-2.0.so'
	);
const gLibc = openLibrary(
		'libc.so.6',
		'libc.so'
	);


const glibtop_init = gLibgtop2.declare(
		'glibtop_init',
		ctypes.default_abi,
		ctypes.void_t
	);
const glibtop_get_cpu = gLibgtop2.declare(
		'glibtop_get_cpu',
		ctypes.default_abi,
		ctypes.void_t,
		glibtop_cpu.ptr
	);
const glibtop_get_mem = gLibgtop2.declare(
		'glibtop_get_mem',
		ctypes.default_abi,
		ctypes.void_t,
		glibtop_mem.ptr
	);
const glibtop_get_proc_mem = gLibgtop2.declare(
		'glibtop_get_proc_mem',
		ctypes.default_abi,
		ctypes.void_t,
		glibtop_proc_mem.ptr,
		pid_t
	);
const glibtop_get_netload = gLibgtop2.declare(
		'glibtop_get_netload',
		ctypes.default_abi,
		ctypes.void_t,
		glibtop_netload.ptr,
		ctypes.char.ptr
	);
const getpid = gLibc.declare(
		'getpid',
		ctypes.default_abi,
		pid_t
	);

glibtop_init();

function getCount() {
	var cpu = new glibtop_cpu();
	glibtop_get_cpu(cpu.address());
	var count = 0;
	for (var i = 0; i < GLIBTOP_NCPU && cpu.xcpu_total[i] != 0; i++) {
		count++;
	}
	return count;
}

function getCPUTimes() {
	var cpu = new glibtop_cpu();
	glibtop_get_cpu(cpu.address());

	var times = [];
	for (var i = 0; i < GLIBTOP_NCPU && cpu.xcpu_total[i] != 0; i++) {
		times.push({
			user   : parseInt(cpu.xcpu_user[i]),
			system : parseInt(cpu.xcpu_sys[i]),
			nice   : parseInt(cpu.xcpu_nice[i]),
			idle   : parseInt(cpu.xcpu_idle[i]),
			iowait : parseInt(cpu.xcpu_iowait[i]) +
			         parseInt(cpu.xcpu_irq[i]) +
			         parseInt(cpu.xcpu_softirq[i])
		});
	}
	return times;
}

function calculateCPUUsage(aPrevious, aCurrent) {
	var user   = aCurrent.user - aPrevious.user;
	var system = aCurrent.system - aPrevious.system;
	var nice   = aCurrent.nice - aPrevious.nice;
	var idle   = aCurrent.idle - aPrevious.idle;
	var iowait = aCurrent.iowait - aPrevious.iowait;

	var total  = user + system + nice + idle + iowait;
	if (total == 0) {
		return {
			user   : 0,
			system : 0,
			nice   : 0,
			idle   : 0,
			iowait : 0
		};
	}
	else {
		return {
			user   : user / total,
			system : system / total,
			nice   : nice / total,
			idle   : idle / total,
			iowait : iowait / total
		};
	}
}

function getMemory() {
	var memory = new glibtop_mem();
	glibtop_get_mem(memory.address());

	var self = new glibtop_proc_mem();
	glibtop_get_proc_mem(self.address(), getpid());

	return {
		total       : parseInt(memory.total),
		free        : parseInt(memory.total) -
		              parseInt(memory.used) -
		              parseInt(memory.cached),
		used        : parseInt(memory.used) -
		              parseInt(memory.cached),
		virtualUsed : -1,
		self        : parseInt(self.resident)
	};
}

function getNetworkLoad() {
	var totalNetworkload = {
		downBytes  : 0,
		upBytes    : 0,
		totalBytes : 0
	};

	for (let [, interfaceName] in Iterator(getNetworkInterfaceList())) {
		var networkLoadForInterface = getNetworkLoadForDevice(interfaceName);
		totalNetworkload.downBytes += networkLoadForInterface.downBytes;
		totalNetworkload.upBytes += networkLoadForInterface.upBytes;
		totalNetworkload.totalBytes += networkLoadForInterface.totalBytes;
	}

	return totalNetworkload;
}

function getNetworkLoadForDevice(interfaceName) {
	var netload = new glibtop_netload();
	glibtop_get_netload(netload.address(), interfaceName);

	return {
		downBytes  : netload.bytes_in,
		upBytes    : netload.bytes_out
	};
}

function getNetworkInterfaceList() {
	return FileUtil
		.readFile("/proc/net/dev")
		.split("\n")
		.filter(function (line) {
			return line.indexOf(":") >= 0;
		}).map(function (line) {
			return line.match(/^[ \t]*(.*):/)[1];
		});

}
