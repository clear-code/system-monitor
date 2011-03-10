var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/i386/vm_types.h
const integer_t = ctypes.int;
const natural_t = ctypes.unsigned_int;
// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/i386/kern_return.h
const kern_return_t = ctypes.int;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/message.h
const mach_msg_type_number_t = natural_t;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/machine.h
const CPU_STATE_MAX    = 4;
const CPU_STATE_USER   = 0;
const CPU_STATE_SYSTEM = 1;
const CPU_STATE_IDLE   = 2;
const CPU_STATE_NICE   = 3;
const cpu_type_t = integer_t;
const cpu_subtype_t = integer_t;
const cpu_threadtype_t = integer_t;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/port.h
const mach_port_t = natural_t;

const vm_map_t = mach_port_t;
const vm_offset_t = ctypes.uintptr_t;
const vm_size_t = ctypes.uintptr_t;

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/processor_info.h
const processor_flavor_t = ctypes.int;
const PROCESSOR_CPU_LOAD_INFO = 2;
const processor_cpu_load_info = new ctypes.StructType('processor_cpu_load_info', [
		{ cpu_ticks : ctypes.ArrayType(ctypes.unsigned_int, CPU_STATE_MAX) }
	]);
const processor_info_array_t = ctypes.ArrayType(integer_t);

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

const host_processor_info = CoreFoundation.declare(
		'host_processor_info',
		ctypes.default_abi,
		kern_return_t,
		mach_port_t,
		processor_flavor_t,
		natural_t.ptr,
		processor_info_array_t.ptr.ptr,
		mach_msg_type_number_t.ptr
	);
const mach_task_self = CoreFoundation.declare(
		'mach_task_self',
		ctypes.default_abi,
		mach_port_t
	);
const vm_deallocate = CoreFoundation.declare(
		'vm_deallocate',
		ctypes.default_abi,
		kern_return_t,
		vm_map_t,
		vm_offset_t,
		vm_size_t
	);

const host_info = CoreFoundation.declare(
		'host_info',
		ctypes.default_abi,
		kern_return_t,
		mach_port_t,
		integer_t,
		host_basic_info.ptr,
		mach_msg_type_number_t.ptr
	);
const host_statistics = CoreFoundation.declare(
		'host_statistics',
		ctypes.default_abi,
		kern_return_t,
		mach_port_t,
		integer_t,
		vm_statistics.ptr,
		mach_msg_type_number_t.ptr
	);


function getCount() {
	var count = new natural_t();
	var infoCount = new mach_msg_type_number_t();
	var info = new processor_cpu_load_info.ptr();
	var infoArray = ctypes.cast(info.address(), processor_info_array_t.ptr);
	if (host_processor_info(mach_host_self(), PROCESSOR_CPU_LOAD_INFO, count.address(), infoArray.address(), infoCount.address())) {
		return 0;
	}
	return count.value;
}

function getCPUTimes() {
	var times = [];

	var count = new natural_t();
	var infoCount = new mach_msg_type_number_t();
	var info = new processor_cpu_load_info.ptr();
	var infoArray = ctypes.cast(info.address(), processor_info_array_t.ptr);
	if (host_processor_info(mach_host_self(), PROCESSOR_CPU_LOAD_INFO, count.address(), infoArray.address(), infoCount.address())) {
		return times;
	}

	// We cannot access ".contents" of flexible array via js-ctypes,
	// so, we have to define a fixed version of the array temporally.
	const fixed_size_processor_info_array_t = ctypes.ArrayType(processor_cpu_load_info, count.value);
	infoArray = ctypes.cast(infoArray, fixed_size_processor_info_array_t.ptr);

	for (var i = 0, count = count.value; i < count; i++) {
		let info = infoArray.contents[i];
		times.push({
			user   : parseInt(info.cpu_ticks[CPU_STATE_USER]),
			system : parseInt(info.cpu_ticks[CPU_STATE_SYSTEM]),
			nice   : parseInt(info.cpu_ticks[CPU_STATE_NICE]),
			idle   : parseInt(info.cpu_ticks[CPU_STATE_IDLE]),
			iowait : 0
		});
	}

	var address = ctypes.cast(infoArray, ctypes.uintptr_t);
	vm_deallocate(mach_task_self(), address, infoCount.value * processor_cpu_load_info.size);

	return times;
}

function calculateCPUUsage(aPrevious, aCurrent) {
	var user   = aCurrent.user - aPrevious.user;
	var system = aCurrent.system - aPrevious.system;
	var nice   = aCurrent.nice - aPrevious.nice;
	var idle   = aCurrent.idle - aPrevious.idle;

	var total  = user + system + nice + idle;
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
			iowait : 0
		};
	}
}

function getMemory() {
	var total_memory = new host_basic_info();
	var total_count = new mach_msg_type_number_t(HOST_BASIC_INFO_COUNT);
	host_info(mach_host_self(), HOST_BASIC_INFO, total_memory.address(), total_count.address());

	var total = parseInt(total_memory.max_mem);

	var memory = new vm_statistics();
	var count = new mach_msg_type_number_t(HOST_VM_INFO_COUNT);
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
