var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/i386/vm_types.h
const integer_t = ctypes.int;
const natural_t = ctypes.unsigned_int;

const cpu_type_t = integer_t;
const cpu_subtype_t = integer_t;
const cpu_threadtype_t = integer_t;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/port.h
const mach_port_t = natural_t;       

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/host_info.h
const HOST_BASIC_INFO = 1;
const HOST_VM_INFO = 2;
const host_basic_info = new ctypes.StructType('host_basic_info', [
		{ max_cpus         : integer_t },
		{ avail_cpus       : integer_t },
		{ memory_size      : natural_t },
		{ cpu_type         : cpu_type_t },
		{ cpu_subtype      : cpu_subtype_t },
		{ cpu_threadtype   : cpu_threadtype_t },
		{ physical_cpu     : integer_t },
		{ physical_cpu_max : integer_t },
		{ logical_cpu      : integer_t },
		{ logical_cpu_max  : integer_t },
		{ max_mem          : ctypes.uint64_t }
	]);
const HOST_BASIC_INFO_COUNT = host_basic_info.size / integer_t.size;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/vm_statistics.h
const vm_statistics = new ctypes.StructType('vm_statistics', [
		{ free_count        : natural_t },
		{ active_count      : natural_t },
		{ inactive_count    : natural_t },
		{ wire_count        : natural_t },
		{ zero_fill_count   : natural_t },
		{ reactivations     : natural_t },
		{ pageins           : natural_t },
		{ pageouts          : natural_t },
		{ faults            : natural_t },
		{ cow_faults        : natural_t },
		{ lookups           : natural_t },
		{ hits              : natural_t },
		{ purgeable_count   : natural_t },
		{ purges            : natural_t },
		{ speculative_count : natural_t }
	]);
const HOST_VM_INFO_COUNT = vm_statistics.size / integer_t.size;

const CoreFoundation = ctypes.open('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
addShutdownListener(function() { CoreFoundation.close(); });

const mach_host_self = CoreFoundation.declare(
		'mach_host_self',
		ctypes.default_abi,
		mach_port_t
	);
const host_info = CoreFoundation.declare(
		'host_info',
		ctypes.default_abi,
		ctypes.void_t,
		mach_port_t,
		integer_t,
		host_basic_info.ptr,
		natural_t.ptr
	);
const host_statistics = CoreFoundation.declare(
		'host_statistics',
		ctypes.default_abi,
		ctypes.void_t,
		mach_port_t,
		integer_t,
		vm_statistics.ptr,
		natural_t.ptr
	);

function getMemory() {
	var total_memory = new host_basic_info();
	var total_count = new natural_t(HOST_BASIC_INFO_COUNT);
	host_info(mach_host_self(), HOST_BASIC_INFO, total_memory.address(), total_count.address());

	var total = parseInt(total_memory.max_mem);

	var memory = new vm_statistics();
	var count = new natural_t(HOST_VM_INFO_COUNT);
	host_statistics(mach_host_self(), HOST_VM_INFO, memory.address(), count.address());

	// We cannot get the value of the global variable "vm_page_size" via js-ctypes,
	// so calculate it from count of all pages.
	var vm_page_size = total /  (memory.free_count + memory.active_count + memory.inactive_count + memory.wire_count);
	var free = memory.free_count * parseInt(vm_page_size);

	return {
		total       : total,
		free        : free,
		used        : total - free,
		virtualUsed : -1
	};
}
