var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyGetter(this, 'Comparator', function () {
	return Cc['@mozilla.org/xpcom/version-comparator;1'].getService(Ci.nsIVersionComparator);
});

XPCOMUtils.defineLazyGetter(this, 'OSVERSION', function () {
	return Cc['@mozilla.org/system-info;1'].getService(Ci.nsIPropertyBag).getProperty('version');
});

// http://msdn.microsoft.com/en-us/library/aa383751%28v=vs.85%29.aspx
const NTSTATUS  = ctypes.uint32_t;
const DWORD     = ctypes.uint32_t;
const DWORDLONG = ctypes.uint64_t;
const BOOL      = ctypes.int;
const HANDLE    = ctypes.intptr_t;

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


const gKernel32 = ctypes.open('kernel32.dll');
addShutdownListener(function() { gKernel32.close(); });

var gPsapi = ctypes.open('psapi.dll');
addShutdownListener(function() { gKernel32.close(); });


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

function getMemory() {
	var info = new MEMORYSTATUSEX(MEMORYSTATUSEX.size, 0, 0, 0, 0, 0, 0, 0, 0);
	GlobalMemoryStatusEx(info.address());

	var process = GetCurrentProcess();
	var self = new processMemoryCounterType();
	GetProcessMemoryInfo(process, self.address(), processMemoryCounterType.size);

	return {
		total       : parseInt(info.ullTotalPhys),
		free        : parseInt(info.ullAvailPhys),
		used        : parseInt(info.ullTotalPhys) -
		              parseInt(info.ullAvailPhys),
		virtualUsed : parseInt(info.ullTotalVirtual) -
		              parseInt(info.ullAvailVirtual),
		self        : parseInt(self.PrivateUsage || self.WorkingSetSize)
	};
}
