var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

const GLIBTOP_NCPU = 32;

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
		{ licked : ctypes.uint64_t }
	]);

const gLibgtop2 = ctypes.open('libgtop-2.0.so');
addShutdownListener(function() { gLibgtop2.close(); });

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
			user   : cpu.xcpu_user[i],
			system : cpu.xcpu_sys[i],
			nice   : cpu.xcpu_nice[i],
			idle   : cpu.xcpu_idle[i],
			iowait : cpu.xcpu_iowait[i] + cpu.xcpu_irq[i] + cpu.xcpu_softirq[i]
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
	return {
		total       : parseInt(memory.total),
		free        : parseInt(memory.total - memory.used - memory.cached),
		used        : parseInt(memory.used - memory.cached),
		virtualUsed : -1
	};
}

