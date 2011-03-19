var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/shutdown-listener.js');

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
const PROCESS_MEMORY_COUNTERS = new ctypes.StructType('PROCESS_MEMORY_COUNTERS', [
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
	]);


const gKernel32 = ctypes.open('kernel32.dll');
addShutdownListener(function() { gKernel32.close(); });

var gPsapi;
try {
	gPsapi = ctypes.open('psapi.dll');
	addShutdownListener(function() { gKernel32.close(); });
}
catch(e) {
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
var GetProcessMemoryInfoArgs = [
		'GetProcessMemoryInfo',
		ctypes.default_abi,
		BOOL,
		HANDLE,
		PROCESS_MEMORY_COUNTERS.ptr,
		DWORD
	];
try {
	// PSAPI_VERSION=1 on Windows 7 and Windows Server 2008 R2
	// on Windows Server 2008, Windows Vista, Windows Server 2003, and Windows XP/2000
	GetProcessMemoryInfo = gPsapi.declare.apply(gPsapi, GetProcessMemoryInfoArgs);
}
catch(e) {
	// on Windows 7 and Windows Server 2008 R2
	GetProcessMemoryInfo = gKernel32.declare.apply(gKernel32, GetProcessMemoryInfoArgs);
}

function getMemory() {
	var info = new MEMORYSTATUSEX(MEMORYSTATUSEX.size, 0, 0, 0, 0, 0, 0, 0, 0);
	GlobalMemoryStatusEx(info.address());

	var process = GetCurrentProcess();
	var counters = new PROCESS_MEMORY_COUNTERS(PROCESS_MEMORY_COUNTERS.size, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	GetProcessMemoryInfo(process, counters.address(), PROCESS_MEMORY_COUNTERS.size);

	return {
		total       : parseInt(info.ullTotalPhys),
		free        : parseInt(info.ullAvailPhys),
		used        : parseInt(info.ullTotalPhys) -
		              parseInt(info.ullAvailPhys),
		virtualUsed : parseInt(info.ullTotalVirtual) -
		              parseInt(info.ullAvailVirtual),
		self        : parseInt(counters.WorkingSetSize)
	};
}
