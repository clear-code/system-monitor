var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

XPCOMUtils.defineLazyGetter(this, 'XULAppInfo', function () {
	return Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime);
});

XPCOMUtils.defineLazyGetter(this, 'is64bit', function () {
	return XULAppInfo.XPCOMABI.indexOf('_64') > -1;
});

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

// /Developer/SDKs/MacOSX10.6.sdk/usr/include/mach/task_info.h
const task_t = natural_t;
const task_flavor_t = natural_t;
const mach_vm_size_t = ctypes.uint64_t;
const TASK_BASIC_INFO_32 = 4;
const TASK_BASIC_INFO_64 = 5;
const time_value_t = new ctypes.StructType('time_value_t', [
		{ seconds      : integer_t },
		{ microseconds : integer_t }
	]);
const task_basic_info_32 = new ctypes.StructType('task_basic_info_32', [
		{ suspend_count : integer_t },
		{ virtual_size  : natural_t },
		{ resident_size : natural_t },
		{ user_time     : time_value_t },
		{ system_time   : time_value_t },
		{ policy        : policy_t }
	]);
const task_basic_info_64 = new ctypes.StructType('task_basic_info_64', [
		{ suspend_count : integer_t },
		{ virtual_size  : mach_vm_size_t },
		{ resident_size : mach_vm_size_t },
		{ user_time     : time_value_t },
		{ system_time   : time_value_t },
		{ policy        : policy_t }
	]);
const TASK_BASIC_INFO = is64bit ? TASK_BASIC_INFO_64 : TASK_BASIC_INFO_32;
const task_info_t     = is64bit ? task_basic_info_64 : task_basic_info_32;
const TASK_BASIC_INFO_COUNT = task_info_t.size / natural_t.size;


var gLibrary,
	mach_host_self,
	host_processor_info,
	mach_task_self,
	vm_deallocate,
	host_info,
	host_statistics,
	task_info;

function openLibrary(aPath) {
	try {
		gLibrary = ctypes.open(aPath);
		declareFunctions();
		addShutdownListener(function() { gLibrary.close(); });
	}
	catch(e) {
		if (gLibrary) {
			gLibrary.close();
			gLibrary = null;
		}
	}
}

function declareFunctions() {
	mach_host_self = gLibrary.declare(
			'mach_host_self',
			ctypes.default_abi,
			mach_port_t
		);

	host_processor_info = gLibrary.declare(
			'host_processor_info',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			processor_flavor_t,
			natural_t.ptr,
			processor_info_array_t.ptr.ptr,
			mach_msg_type_number_t.ptr
		);
	mach_task_self = gLibrary.declare(
			'mach_task_self',
			ctypes.default_abi,
			mach_port_t
		);
	vm_deallocate = gLibrary.declare(
			'vm_deallocate',
			ctypes.default_abi,
			kern_return_t,
			vm_map_t,
			vm_offset_t,
			vm_size_t
		);

	host_info = gLibrary.declare(
			'host_info',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			integer_t,
			host_basic_info.ptr,
			mach_msg_type_number_t.ptr
		);
	host_statistics = gLibrary.declare(
			'host_statistics',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			integer_t,
			vm_statistics.ptr,
			mach_msg_type_number_t.ptr
		);
	task_info= gLibrary.declare(
			'task_info',
			ctypes.default_abi,
			kern_return_t,
			task_t,
			task_flavor_t,
			task_info_t.ptr,
			mach_msg_type_number_t.ptr
		);
}

try {
	openLibrary('/System/Library/Frameworks/System.framework/System');
}
catch(e) {
	openLibrary('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
}


function getCount() {
	var count = new natural_t();
	var infoCount = new mach_msg_type_number_t();
	var info = new processor_cpu_load_info.ptr();
	var infoArray = ctypes.cast(info.address(), processor_info_array_t.ptr);
	if (host_processor_info(mach_host_self(),
	                        PROCESSOR_CPU_LOAD_INFO,
	                        count.address(),
	                        infoArray.address(),
	                        infoCount.address())) {
		return 0;
	}

	vm_deallocate(mach_task_self(),
	              ctypes.cast(infoArray, ctypes.uintptr_t),
	              infoCount.value * processor_cpu_load_info.size);

	return count.value;
}

function getCPUTimes() {
	var times = [];

	var count = new natural_t();
	var infoCount = new mach_msg_type_number_t();
	var info = new processor_cpu_load_info.ptr();
	var infoArray = ctypes.cast(info.address(), processor_info_array_t.ptr);
	if (host_processor_info(mach_host_self(),
	                        PROCESSOR_CPU_LOAD_INFO,
	                        count.address(),
	                        infoArray.address(),
	                        infoCount.address())) {
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

	vm_deallocate(mach_task_self(),
	              ctypes.cast(infoArray, ctypes.uintptr_t),
	              infoCount.value * processor_cpu_load_info.size);

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
	host_info(mach_host_self(),
	          HOST_BASIC_INFO,
	          total_memory.address(),
	          total_count.address());

	var total = parseInt(total_memory.max_mem);

	var memory = new vm_statistics();
	var count = new mach_msg_type_number_t(HOST_VM_INFO_COUNT);
	host_statistics(mach_host_self(),
	                HOST_VM_INFO,
	                memory.address(),
	                count.address());

	// We cannot get the value of the global variable "vm_page_size" via js-ctypes,
	// so calculate it from count of all pages.
	var vm_total_pages_count = parseInt(memory.free_count) +
	                           parseInt(memory.active_count) +
	                           parseInt(memory.inactive_count) +
	                           parseInt(memory.wire_count);
	var vm_page_size = total / vm_total_pages_count;
	var free = parseInt(memory.free_count) * parseInt(vm_page_size);

	var self = new task_info_t();
	count = new mach_msg_type_number_t(TASK_BASIC_INFO_COUNT);
	task_info(mach_task_self(), TASK_BASIC_INFO, self.address(), count.address());


	return {
		total       : total,
		free        : free,
		used        : total - free,
		virtualUsed : -1,
		self        : self.resident_size
	};
}
