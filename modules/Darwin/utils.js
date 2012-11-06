var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage', 'getMemory', 'getNetworkLoad'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/ShutdownListener.js');

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

const is64bit = false; //XULAppInfo.XPCOMABI.indexOf('_64') > -1;


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
const mach_port_name_t = natural_t;
const mach_port_t = mach_port_name_t;

const vm_map_t = mach_port_t;
const vm_offset_t = is64bit ? ctypes.uintptr_t : natural_t;
const vm_size_t = is64bit ? ctypes.uintptr_t : natural_t;

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
const host_flavor_t = integer_t;
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
const task_info_t = integer_t;
const task_flavor_t = natural_t;
const policy_t = ctypes.int;
const TASK_BASIC_INFO_32 = 4;
const TASK_BASIC_INFO_64 = 5;
const time_value_t = new ctypes.StructType('time_value_t', [
		{ seconds      : integer_t },
		{ microseconds : integer_t }
	]);
const task_basic_info = new ctypes.StructType('task_basic_info', [
		{ suspend_count : integer_t },
		{ virtual_size  : vm_size_t },
		{ resident_size : vm_size_t },
		{ user_time     : time_value_t },
		{ system_time   : time_value_t },
		{ policy        : policy_t }
	]);
const TASK_BASIC_INFO_COUNT = task_basic_info.size / natural_t.size;
const TASK_BASIC_INFO = is64bit? TASK_BASIC_INFO_64 : TASK_BASIC_INFO_32 ;

// ------------------------------------------------------------
// sysctl
// ------------------------------------------------------------

// Types
const u_char    = ctypes.unsigned_char;
const char      = ctypes.char;
const u_short   = ctypes.unsigned_short;
const u_int32_t = ctypes.uint32_t;
const u_int64_t = ctypes.uint64_t;
const __int32_t = ctypes.int32_t;
const uint      = ctypes.uint32_t;
const int       = ctypes.int32_t;
const timeval_t = new ctypes.StructType('timeval_t', [
  { tv_sec  : __int32_t },         /* seconds */
  { tv_usec : __int32_t }          /* and microseconds */
]);
const IF_DATA_TIMEVAL = timeval_t;

// Constants
const CTL_NET        = 4;
const PF_ROUTE       = 17;
const NET_RT_IFLIST2 = 6;
const RTM_IFINFO2    = 0x12;

// Structs
const if_data = new ctypes.StructType('if_data', [
  /* generic interface information */
  { ifi_type       : u_char          }, /* ethernet, tokenring, etc */
  { ifi_typelen    : u_char          }, /* Length of frame type id */
  { ifi_physical   : u_char          }, /* e.g., AUI, Thinnet, 10base-T, etc */
  { ifi_addrlen    : u_char          }, /* media address length */
  { ifi_hdrlen     : u_char          }, /* media header length */
  { ifi_recvquota  : u_char          }, /* polling quota for receive intrs */
  { ifi_xmitquota  : u_char          }, /* polling quota for xmit intrs */
  { ifi_unused1    : u_char          }, /* for future use */
  { ifi_mtu        : u_int32_t       }, /* maximum transmission unit */
  { ifi_metric     : u_int32_t       }, /* routing metric (external only) */
  { ifi_baudrate   : u_int32_t       }, /* linespeed */
  /* volatile statistics */
  { ifi_ipackets   : u_int32_t       }, /* packets received on interface */
  { ifi_ierrors    : u_int32_t       }, /* input errors on interface */
  { ifi_opackets   : u_int32_t       }, /* packets sent on interface */
  { ifi_oerrors    : u_int32_t       }, /* output errors on interface */
  { ifi_collisions : u_int32_t       }, /* collisions on csma interfaces */
  { ifi_ibytes     : u_int32_t       }, /* total number of octets received */
  { ifi_obytes     : u_int32_t       }, /* total number of octets sent */
  { ifi_imcasts    : u_int32_t       }, /* packets received via multicast */
  { ifi_omcasts    : u_int32_t       }, /* packets sent via multicast */
  { ifi_iqdrops    : u_int32_t       }, /* dropped on input, this interface */
  { ifi_noproto    : u_int32_t       }, /* destined for unsupported protocol */
  { ifi_recvtiming : u_int32_t       }, /* usec spent receiving when timing */
  { ifi_xmittiming : u_int32_t       }, /* usec spent xmitting when timing */
  { ifi_lastchange : IF_DATA_TIMEVAL }, /* time of last administrative change */
  { ifi_unused2    : u_int32_t       }, /* used to be the default_proto */
  { ifi_hwassist   : u_int32_t       }, /* HW offload capabilities */
  { ifi_reserved1  : u_int32_t       }, /* for future use */
  { ifi_reserved2  : u_int32_t       }  /* for future use */
]);

const if_msghdr = new ctypes.StructType('if_msghdr', [
  { ifm_msglen  : u_short }, /* to skip over non-understood messages */
  { ifm_version : u_char  }, /* future binary compatability */
  { ifm_type    : u_char  }, /* message type */
  { ifm_addrs   : int     }, /* like rtm_addrs */
  { ifm_flags   : int     }, /* value of if_flags */
  { ifm_index   : u_short }, /* index for associated ifp */
  { ifm_data    : if_data }  /* statistics and other data about if */
]);

const if_data64 = new ctypes.StructType('if_data64', [
  /* generic interface information */
  { ifi_type       : u_char          }, /* ethernet, tokenring, etc */
  { ifi_typelen    : u_char          }, /* Length of frame type id */
  { ifi_physical   : u_char          }, /* e.g., AUI, Thinnet, 10base-T, etc */
  { ifi_addrlen    : u_char          }, /* media address length */
  { ifi_hdrlen     : u_char          }, /* media header length */
  { ifi_recvquota  : u_char          }, /* polling quota for receive intrs */
  { ifi_xmitquota  : u_char          }, /* polling quota for xmit intrs */
  { ifi_unused1    : u_char          }, /* for future use */
  { ifi_mtu        : u_int32_t       }, /* maximum transmission unit */
  { ifi_metric     : u_int32_t       }, /* routing metric (external only) */
  { ifi_baudrate   : u_int64_t       }, /* linespeed */
  /* volatile statistics */
  { ifi_ipackets   : u_int64_t       }, /* packets received on interface */
  { ifi_ierrors    : u_int64_t       }, /* input errors on interface */
  { ifi_opackets   : u_int64_t       }, /* packets sent on interface */
  { ifi_oerrors    : u_int64_t       }, /* output errors on interface */
  { ifi_collisions : u_int64_t       }, /* collisions on csma interfaces */
  { ifi_ibytes     : u_int64_t       }, /* total number of octets received */
  { ifi_obytes     : u_int64_t       }, /* total number of octets sent */
  { ifi_imcasts    : u_int64_t       }, /* packets received via multicast */
  { ifi_omcasts    : u_int64_t       }, /* packets sent via multicast */
  { ifi_iqdrops    : u_int64_t       }, /* dropped on input, this interface */
  { ifi_noproto    : u_int64_t       }, /* destined for unsupported protocol */
  { ifi_recvtiming : u_int32_t       }, /* usec spent receiving when timing */
  { ifi_xmittiming : u_int32_t       }, /* usec spent xmitting when timing */
  { ifi_lastchange : IF_DATA_TIMEVAL }  /* time of last administrative change */
]);

const if_msghdr2 = new ctypes.StructType('if_msghdr2', [
  { ifm_msglen     : u_short   }, /* to skip over non-understood messages */
  { ifm_version    : u_char    }, /* future binary compatability */
  { ifm_type       : u_char    }, /* message type */
  { ifm_addrs      : int       }, /* like rtm_addrs */
  { ifm_flags      : int       }, /* value of if_flags */
  { ifm_index      : u_short   }, /* index for associated ifp */
  { ifm_snd_len    : int       }, /* instantaneous length of send queue */
  { ifm_snd_maxlen : int       }, /* maximum length of send queue */
  { ifm_snd_drops  : int       }, /* number of drops in send queue */
  { ifm_timer      : int       }, /* time until if_watchdog called */
  { ifm_data       : if_data64 }  /* statistics and other data about if */
]);

var libMach,
	libc,
	// functions
	mach_host_self,
	host_processor_info,
	mach_task_self,
	vm_deallocate,
	host_info,
	host_statistics,
	task_info,
	sysctl;

function openLibrary(aPath) {
	var library = null;
	try {
		library = ctypes.open(aPath);
		addShutdownListener(function() { library.close(); });
	}
	catch(e) {
		if (library) {
			library.close();
			library = null;
		}
	}
	return library;
}

function declareFunctions() {
	mach_host_self = libMach.declare(
			'mach_host_self',
			ctypes.default_abi,
			mach_port_t
		);

	host_processor_info = libMach.declare(
			'host_processor_info',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			processor_flavor_t,
			natural_t.ptr,
			processor_info_array_t.ptr.ptr,
			mach_msg_type_number_t.ptr
		);
	mach_task_self = libMach.declare(
			'mach_task_self',
			ctypes.default_abi,
			mach_port_t
		);
	vm_deallocate = libMach.declare(
			'vm_deallocate',
			ctypes.default_abi,
			kern_return_t,
			vm_map_t,
			vm_offset_t,
			vm_size_t
		);

	host_info = libMach.declare(
			'host_info',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			host_flavor_t,
			host_basic_info.ptr,
			mach_msg_type_number_t.ptr
		);
	host_statistics = libMach.declare(
			'host_statistics',
			ctypes.default_abi,
			kern_return_t,
			mach_port_t,
			host_flavor_t,
			vm_statistics.ptr,
			mach_msg_type_number_t.ptr
		);
	task_info= libMach.declare(
			'task_info',
			ctypes.default_abi,
			kern_return_t,
			task_t,
			task_flavor_t,
			task_info_t.ptr,
			mach_msg_type_number_t.ptr
		);

	// sysctl(int *name, u_int namelen, void *oldp, size_t *oldlenp, void *newp, size_t newlen);
	sysctl = libc.declare(
		'sysctl',
		ctypes.default_abi,
		int,               /* -> int  */
		int.ptr,           /* name    */
		uint,              /* namelen */
		char.ptr,          /* oldp    */
		ctypes.size_t.ptr, /* oldlenp */
		char.ptr,          /* newp    */
		ctypes.size_t      /* newlen  */
	);
}

try {
	libMach = openLibrary('/System/Library/Frameworks/System.framework/System');
}
catch(e) {
	libMach = openLibrary('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
}
libc = openLibrary('libc.dylib');

declareFunctions();

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
	              ctypes.cast(infoArray, vm_offset_t),
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
	              ctypes.cast(infoArray, vm_offset_t),
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

	var self = new task_basic_info();
	count = new mach_msg_type_number_t(TASK_BASIC_INFO_COUNT);
	task_info(mach_task_self(),
	          TASK_BASIC_INFO,
	          ctypes.cast(self.address(), task_info_t.ptr),
	          count.address());

	return {
		total       : total,
		free        : free,
		used        : total - free,
		virtualUsed : -1,
		self        : parseInt(self.resident_size)
	};
}

function getNetworkLoad() {
	try {
		return getNetworkLoadImplementation();
	} catch (x) {
		throw x;
	}
}

// Get network loads from sysctl
// Current limitation: Though sysctl returns network loads in 64 bit integers,
// we only use lower 32 bits since JavaScript supports intergers up to 53 bit
function getNetworkLoadImplementation() {
	var totalNetworkload = {
		downBytes  : 0,
		upBytes    : 0,
		totalBytes : 0
	};

	/* Arrange the sysctl command that requests a network load */
	var mibArgsCount = 6;
	var mibArgsArray = int.array(mibArgsCount)([
		CTL_NET,
		PF_ROUTE,
		0,
		0,
		NET_RT_IFLIST2,
		0
	]);

	var bufferSize = ctypes.size_t(0);
	var zero = ctypes.size_t(0);
	var null_ptr = ctypes.voidptr_t.ptr(null);

	/* Get required buffer size */
	sysctl(mibArgsArray,                                  /* int.ptr              */
					mibArgsCount,         /* uint                 */
					null,                 /* ctypes.voidptr_t.ptr */
					bufferSize.address(), /* ctypes.size_t.ptr    */
					null,                 /* ctypes.voidptr_t.ptr */
					0);                   /* ctypes.size_t        */

	/* Allocate buffer and get sysctl response */
	var buffer = char.array(bufferSize.value)();
	sysctl(mibArgsArray,                                                     /* int.ptr               */
					mibArgsCount,                            /* uint                  */
					ctypes.cast(buffer.address(), char.ptr), /* ctypes.voidptr_t.ptr  */
					bufferSize.address(),                    /* ctypes.size_t.ptr     */
					null,                                    /* ctypes.voidptr_t.ptr  */
					0);                                      /* ctypes.size_t         */

	/* Iterate sysctl results (one result for an interface) */
	var limit = char.ptr(addINT64(buffer.address(), bufferSize));
	var next  = char.ptr(null);
	next = ctypes.cast(buffer.address(), char.ptr);
	for (; next < limit; ) {
		var ifm_ptr = ctypes.cast(next, if_msghdr.ptr);
		if (ifm_ptr.contents.ifm_type == RTM_IFINFO2) {
			var if2m_ptr = ctypes.cast(ifm_ptr, if_msghdr2.ptr);
			/* Get download bytes and upload bytes */
			/* TODO: Do not trash higher bits */
			totalNetworkload.downBytes = ctypes.UInt64.lo(if2m_ptr.contents.ifm_data.ifi_ibytes);
			totalNetworkload.upBytes = ctypes.UInt64.lo(if2m_ptr.contents.ifm_data.ifi_obytes);
		}
		next = char.ptr(addINT64(next, ctypes.uint64_t(ifm_ptr.contents.ifm_msglen)));
	}

	return totalNetworkload;
}

// Construct UInt64 from ctypes numeric values
// TODO: Do not use string manipulation
function extractUInt64(ctypeValue) {
	if (typeof ctypeValue !== "number") {
		var ctypeString = ctypeValue.toString();
		var matched = ctypeValue.toString().match(/UInt[0-9]+\("([0-9a-fx]+)"\)+$/);
		if (matched)
			ctypeValue = matched[1];
	}
	return new ctypes.UInt64(ctypeValue);
}

// Bigint addition
function addINT64(a, b) {
	a = extractUInt64(a);
	b = extractUInt64(b);

	const MAX_UINT = Math.pow(2, 32);

	var alo = ctypes.UInt64.lo(a);
	var ahi = ctypes.UInt64.hi(a);
	var blo = ctypes.UInt64.lo(b);
	var bhi = ctypes.UInt64.hi(b);

	var lo = alo + blo;
	var hi = 0;

	if (lo >= MAX_UINT) {
		hi = lo - MAX_UINT;
		lo -= MAX_UINT;
	}

	hi += (ahi + bhi);

	return ctypes.UInt64.join(hi, lo);
}
