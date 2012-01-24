var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/ShutdownListener.js');
Components.utils.import('resource://system-monitor-modules/lib/prmem.js');


// see http://source.winehq.org/source/include/winternl.h
const SystemBasicInformation = 0;
const SystemProcessorPerformanceInformation = 8;

const MAX_COUNT = 32;
const NTSTATUS = ctypes.uint32_t;
const LARGE_INTEGER = ctypes.int64_t;

const SYSTEM_BASIC_INFORMATION = new ctypes.StructType('SYSTEM_BASIC_INFORMATION', [
		{ Reserved1 : ctypes.ArrayType(ctypes.int8_t, 24) },
		{ Reserved2 : ctypes.ArrayType(ctypes.voidptr_t, 4) },
		{ NumberOfProcessors : ctypes.uint32_t }
	]);

const SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION = new ctypes.StructType('SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION', [
		{ IdleTime   : LARGE_INTEGER },
		{ KernelTime : LARGE_INTEGER },
		{ UserTime   : LARGE_INTEGER },
		{ Reserved1  : ctypes.ArrayType(LARGE_INTEGER, 2) },
		{ Reserved2  : ctypes.unsigned_long }
	]);
const SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY = ctypes.ArrayType(SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION, MAX_COUNT);

const gNtdll = ctypes.open('ntdll.dll');
addShutdownListener(function() { gNtdll.close(); });

const NtQuerySystemInformation_SystemBasicInformation = gNtdll.declare(
		'NtQuerySystemInformation',
		ctypes.default_abi,
		NTSTATUS,
		ctypes.uint32_t,
		SYSTEM_BASIC_INFORMATION.ptr,
		ctypes.unsigned_long,
		ctypes.uint32_t
	);
const NtQuerySystemInformation_SystemProcessorPerformanceInformation = gNtdll.declare(
		'NtQuerySystemInformation',
		ctypes.default_abi,
		NTSTATUS,
		ctypes.uint32_t,
		SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.ptr,
		ctypes.unsigned_long,
		ctypes.uint32_t
	);


function getCount() {
	var info = PR_Calloc(1, SYSTEM_BASIC_INFORMATION.size);
	info = ctypes.cast(info, SYSTEM_BASIC_INFORMATION.ptr);
	NtQuerySystemInformation_SystemBasicInformation(
		SystemBasicInformation,
		info,
		SYSTEM_BASIC_INFORMATION.size,
		0
	);
	var count = info.contents.NumberOfProcessors;
	PR_Free(info);
	return count;
}

function getCPUTimes() {
	var infoArray = PR_Calloc(1, SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.size);
	infoArray = ctypes.cast(infoArray, SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.ptr);
	NtQuerySystemInformation_SystemProcessorPerformanceInformation(
		SystemProcessorPerformanceInformation,
		infoArray,
		SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.size,
		0
	);
	var times = [];
	var infos = infoArray.contents;
	for (let i = 0, maxi = getCount(); i < maxi; i++) {
		let info = infos[i];
		times.push({
			user   : parseInt(info.UserTime),
			system : parseInt(info.KernelTime),
			nice   : 0,
			idle   : parseInt(info.IdleTime),
			iowait : 0
		});
	}
	PR_Free(infoArray);
	return times;
}

function calculateCPUUsage(aPrevious, aCurrent) {
	var user   = aCurrent.user - aPrevious.user;
	var kernel = aCurrent.system - aPrevious.system;
	var idle   = aCurrent.idle - aPrevious.idle;
	var total  = user + kernel;

	/*
	  Trick!!
	  On windows, we can not calcurate kernel and user times without idle time respectively,
	  because the kernel and user times which returned by GetSystemTimes are including
	  idle times.
	  kernel time = (cpu usage time in kernel) + (cpu idle time in kernel)
	  user time = (cpu usage time in user space) + (cpu idle time in user space)
	  idle time = (cpu idle time in kernel) + (cpu idle time in user space)
	  So we set (cpu usage time in kernel) + (cpu usage time in user space) value as
	  kernel time for the convinience. This value is used in GetUsage.
	*/
	kernel = total - idle;

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
			user   : 0,
			system : kernel / total,
			nice   : 0,
			idle   : idle / total,
			iowait : 0
		};
	}
}
