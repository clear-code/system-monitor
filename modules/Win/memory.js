var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

const Comparator = Cc['@mozilla.org/xpcom/version-comparator;1']
					.getService(Ci.nsIVersionComparator);
const OSVERSION = Cc['@mozilla.org/system-info;1']
					.getService(Ci.nsIPropertyBag)
					.getProperty('version');
const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);
const Prefs = Cc['@mozilla.org/preferences;1']
					.getService(Ci.nsIPrefBranch);

const is64bit = XULAppInfo.XPCOMABI.indexOf('_64') > -1;

const usePrivateWorkingSetPref = 'extensions.system-monitor@clear-code.com.memory-usage.WINNT.usePrivateWorkingSet';


// http://msdn.microsoft.com/en-us/library/aa383751%28v=vs.85%29.aspx
const NTSTATUS  = ctypes.uint32_t;
const WORD      = ctypes.unsigned_short;
const DWORD     = ctypes.uint32_t;
const DWORDLONG = ctypes.uint64_t;
const BOOL      = ctypes.int;
const HANDLE    = ctypes.intptr_t;
const ULONG_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_long ;
const PVOID     = ctypes.voidptr_t;
const LPVOID    = ctypes.voidptr_t;
const DWORD_PTR = ULONG_PTR;


const MEMORYSTATUSEX = new ctypes.StructType('MEMORYSTATUSEX', [
		{ dwLength                : DWORD },
		{ dwMemoryLoad            : DWORD },
		{ ullTotalPhys            : DWORDLONG },
		{ ullAvailPhys            : DWORDLONG },
		{ ullTotalPageFile        : DWORDLONG },
		{ ullAvailPageFile        : DWORDLONG },
		{ ullTotalVirtual         : DWORDLONG },
		{ ullAvailVirtual         : DWORDLONG },
		{ ullAvailExtendedVirtual : DWORDLONG }
	]);

// http://msdn.microsoft.com/en-us/library/ms684877%28v=vs.85%29.aspx
const PROCESS_MEMORY_COUNTERS_FIELDS = [
		{ cb                         : DWORD },
		{ PageFaultCount             : DWORD },
		{ PeakWorkingSetSize         : ctypes.size_t },
		{ WorkingSetSize             : ctypes.size_t },
		{ QuotaPeakPagedPoolUsage    : ctypes.size_t },
		{ QuotaPagedPoolUsage        : ctypes.size_t },
		{ QuotaPeakNonPagedPoolUsage : ctypes.size_t },
		{ QuotaNonPagedPoolUsage     : ctypes.size_t },
		{ PagefileUsage              : ctypes.size_t },
		{ PeakPagefileUsage          : ctypes.size_t }
	];
const PROCESS_MEMORY_COUNTERS = new ctypes.StructType('PROCESS_MEMORY_COUNTERS',
	PROCESS_MEMORY_COUNTERS_FIELDS);
const PROCESS_MEMORY_COUNTERS_EX = new ctypes.StructType('PROCESS_MEMORY_COUNTERS_EX',
	PROCESS_MEMORY_COUNTERS_FIELDS.concat([
		{ PrivateUsage               : ctypes.size_t }
	]));

// http://msdn.microsoft.com/en-us/library/ms724958%28v=vs.85%29.aspx
const SYSTEM_INFO = new ctypes.StructType('SYSTEM_INFO', [
		{ dwOemID    : DWORD },
		{ dwPageSize : DWORD },
		{ lpMinimumApplicationAddress : LPVOID },
		{ lpMaximumApplicationAddress : LPVOID },
		{ dwActiveProcessorMask   : DWORD_PTR },
		{ dwNumberOfProcessors    : DWORD },
		{ dwProcessorType         : DWORD },
		{ dwAllocationGranularity : DWORD },
		{ wProcessorLevel         : WORD },
		{ wProcessorRevision      : WORD }
	]);

// http://msdn.microsoft.com/en-us/library/ms684902%28v=vs.85%29.aspx
const SHARED_FLAG = 0x100;
// http://msdn.microsoft.com/en-us/library/ms684910%28v=vs.85%29.aspx
const PSAPI_WORKING_SET_INFORMATION_FIRST = new ctypes.StructType('PSAPI_WORKING_SET_INFORMATION_FIRST', [
		{ NumberOfEntries : ULONG_PTR },
		{ WorkingSetInfo  : ctypes.ArrayType(ULONG_PTR, 1) }
	]);


const gKernel32 = ctypes.open('kernel32.dll');
addShutdownListener(function() { gKernel32.close(); });

try {
	const gPsapi = ctypes.open('psapi.dll');
	addShutdownListener(function() { gPsapi.close(); });
}
catch(e) {
	// on Windows 7 and Windows Server 2008 R2
}

const GlobalMemoryStatusEx = gKernel32.declare(
		'GlobalMemoryStatusEx',
		ctypes.default_abi,
		NTSTATUS,
		MEMORYSTATUSEX.ptr
	);

// http://msdn.microsoft.com/en-us/library/ms683179%28v=vs.85%29.aspx
const GetCurrentProcess = gKernel32.declare(
		'GetCurrentProcess',
		ctypes.default_abi,
		HANDLE
	);
// http://msdn.microsoft.com/en-us/library/ms683219%28v=vs.85%29.aspx
var GetProcessMemoryInfo;
var processMemoryCounterType;
function declareGetProcessMemoryInfo(aLibrary, aCounterType) {
	GetProcessMemoryInfo = aLibrary.declare.apply(gPsapi, [
		'GetProcessMemoryInfo',
		ctypes.default_abi,
		BOOL,
		HANDLE,
		aCounterType.ptr,
		DWORD
	]);
	processMemoryCounterType = aCounterType;
}
try {
	// PSAPI_VERSION=1 on Windows 7 and Windows Server 2008 R2
	// on Windows Server 2008, Windows Vista, Windows Server 2003, and Windows XP SP2
	if (Comparator.compare(OSVERSION, '5.1') >= 0)
		declareGetProcessMemoryInfo(gPsapi, PROCESS_MEMORY_COUNTERS_EX);
	else // on Windows XP SP1/2000
		declareGetProcessMemoryInfo(gPsapi, PROCESS_MEMORY_COUNTERS);
}
catch(e) {
	// on Windows 7 and Windows Server 2008 R2
	declareGetProcessMemoryInfo(gKernel32, PROCESS_MEMORY_COUNTERS_EX);
}

// http://msdn.microsoft.com/ja-jp/library/cc429808.aspx
const GetSystemInfo = gKernel32.declare(
		'GetSystemInfo',
		ctypes.default_abi,
		ctypes.void_t,
		SYSTEM_INFO.ptr
	);
// http://msdn.microsoft.com/en-us/library/ms684946%28v=vs.85%29.aspx
var QueryWorkingSet;
function declareQueryWorkingSet(aLibrary) {
	QueryWorkingSet = aLibrary.declare.apply(gPsapi, [
		'QueryWorkingSet',
		ctypes.default_abi,
		BOOL,
		HANDLE,
		PVOID,
		DWORD
	]);
}
try {
	// PSAPI_VERSION=1 on Windows 7 and Windows Server 2008 R2
	// on Windows Server 2008, Windows Vista, Windows Server 2003, and Windows XP/2000
	declareQueryWorkingSet(gPsapi);
}
catch(e) {
	// on Windows 7 and Windows Server 2008 R2
	declareQueryWorkingSet(gKernel32);
}

function getMemory() {
	var info = new MEMORYSTATUSEX(MEMORYSTATUSEX.size, 0, 0, 0, 0, 0, 0, 0, 0);
	GlobalMemoryStatusEx(info.address());

	var process = GetCurrentProcess();
	var selfUsed;
	if (Prefs.getBoolPref(usePrivateWorkingSetPref)) {
		// http://msdn.microsoft.com/en-us/library/aa965225%28v=vs.85%29.aspx#1
		let systemInfo = new SYSTEM_INFO;
		GetSystemInfo(systemInfo.address());

		let self = new PSAPI_WORKING_SET_INFORMATION_FIRST();
		if (QueryWorkingSet(process,
		                    ctypes.cast(self.address(), PVOID),
		                    PSAPI_WORKING_SET_INFORMATION_FIRST.size) == 0) {
			let PSAPI_WORKING_SET_INFORMATION_ACTUAL = new ctypes.StructType('PSAPI_WORKING_SET_INFORMATION_ACTUAL', [
					{ NumberOfEntries : ULONG_PTR },
					{ WorkingSetInfo  : ctypes.ArrayType(ULONG_PTR, parseInt(self.NumberOfEntries) + 1024) } // enough to get all info
				]);
			self = new PSAPI_WORKING_SET_INFORMATION_ACTUAL();
			if (QueryWorkingSet(process,
		                        ctypes.cast(self.address(), PVOID),
		                        PSAPI_WORKING_SET_INFORMATION_ACTUAL.size) == 0)
				throw new Error('could not get the size of working pages');
		}

		let sharedPages = 0;
		let pages = self.WorkingSetInfo;
		for (let i = 0, maxi = pages.length; i < maxi; i++) {
			let flags = pages[i];
			if (flags === 0)
				break;
			if (flags & SHARED_FLAG)
				sharedPages++;
		}

		selfUsed = (pages.length - sharedPages) * systemInfo.dwPageSize;
	}
	else {
		let self = new processMemoryCounterType();
		GetProcessMemoryInfo(process, self.address(), processMemoryCounterType.size);
		selfUsed = parseInt(self.PrivateUsage || self.WorkingSetSize);
	}

	return {
		total       : parseInt(info.ullTotalPhys),
		free        : parseInt(info.ullAvailPhys),
		used        : parseInt(info.ullTotalPhys - info.ullAvailPhys),
		virtualUsed : parseInt(info.ullTotalVirtual - info.ullAvailVirtual),
		self        : selfUsed
	};
}
