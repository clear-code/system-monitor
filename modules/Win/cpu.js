var EXPORTED_SYMBOLS = ['getCount', 'getCPUTimes', 'calculateCPUUsage'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');


// see http://source.winehq.org/source/include/winternl.h
const SystemBasicInformation = 0;
const SystemProcessorPerformanceInformation = 8;

const MAX_COUNT = 32;
const NTSTATUS = ctypes.uint32_t;

const SYSTEM_BASIC_INFORMATION_RESERVED1 = ctypes.ArrayType(ctypes.int8_t, 24);
const SYSTEM_BASIC_INFORMATION_RESERVED2 = ctypes.ArrayType(ctypes.voidptr_t, 4);
const SYSTEM_BASIC_INFORMATION = new ctypes.StructType('SYSTEM_BASIC_INFORMATION', [
		{ Reserved1 : SYSTEM_BASIC_INFORMATION_RESERVED1 },
		{ Reserved2 : SYSTEM_BASIC_INFORMATION_RESERVED2 },
		{ NumberOfProcessors : ctypes.uint32_t }
	]);

const LARGE_INTEGER = ctypes.int64_t;
const SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_RESERVED1 = ctypes.ArrayType(LARGE_INTEGER, 2);
const SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION = new ctypes.StructType('SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION', [
		{ IdleTime   : LARGE_INTEGER },
		{ KernelTime : LARGE_INTEGER },
		{ UserTime   : LARGE_INTEGER },
		{ Reserved1  : SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_RESERVED1 },
		{ Reserved2  : ctypes.unsigned_long }
	]);

const SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY = ctypes.ArrayType(SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION, MAX_COUNT);

var gNtdll = ctypes.open('ntdll.dll');
addShutdownListener(function() { gNtdll.close(); });

var NtQuerySystemInformation_SystemBasicInformation = gNtdll.declare(
		'NtQuerySystemInformation',
		ctypes.default_abi,
		NTSTATUS,
		ctypes.uint32_t,
		SYSTEM_BASIC_INFORMATION.ptr,
		ctypes.unsigned_long,
		ctypes.uint32_t
	);

var NtQuerySystemInformation_SystemProcessorPerformanceInformation = gNtdll.declare(
		'NtQuerySystemInformation',
		ctypes.default_abi,
		NTSTATUS,
		ctypes.uint32_t,
		SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.ptr,
		ctypes.unsigned_long,
		ctypes.uint32_t
	);


function getCount() {
	var reserver1 = new SYSTEM_BASIC_INFORMATION_RESERVED1();
	var reserver2 = new SYSTEM_BASIC_INFORMATION_RESERVED2();
	var info = new SYSTEM_BASIC_INFORMATION(reserver1, reserver2, 0);
	NtQuerySystemInformation_SystemBasicInformation(
		SystemBasicInformation,
		info.address(),
		SYSTEM_BASIC_INFORMATION.size,
		0
	);
	return info.NumberOfProcessors;
}

function getCPUTimes() {
	var infoArray = new SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY();
	NtQuerySystemInformation_SystemProcessorPerformanceInformation(
		SystemProcessorPerformanceInformation,
		infoArray.address(),
		SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION_ARRAY.size,
		0
	);
	var array = [];
	for (var i = 0, maxi = getCount(); i < maxi; i++) {
		array.push({
			userTime   : parseInt(infoArray[i].UserTime),
			systemTime : parseInt(infoArray[i].KernelTime),
			niceTime   : 0,
			idleTime   : parseInt(infoArray[i].IdleTime),
			IOWaitTime : 0
		});
	}
	return array;
}

function calculateCPUUsage(aPrevious, aCurrent) {
	var user   = aCurrent.userTime - aPrevious.userTime;
	var kernel = aCurrent.systemTime - aPrevious.systemTime;
	var idle   = aCurrent.idleTime - aPrevious.idleTime;
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
			IOWait : 0
		}
	}
	else {
		return {
			user   : 0,
			system : kernel / total,
			nice   : 0,
			idle   : idle / total,
			IOWait : 0
		}
	}
}
