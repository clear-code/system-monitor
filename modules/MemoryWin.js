var EXPORTED_SYMBOLS = ['getMemory'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/ctypes.jsm');

const NTSTATUS  = ctypes.uint32_t;
const DWORD     = ctypes.uint32_t;
const DWORDLONG = ctypes.uint64_t;
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

var gKernel32 = ctypes.open('kernel32.dll');

var GlobalMemoryStatusEx = gKernel32.declare(
		'GlobalMemoryStatusEx',
		ctypes.default_abi,
		NTSTATUS,
		MEMORYSTATUSEX.ptr
	);

function getMemory() {
	var info = new MEMORYSTATUSEX(MEMORYSTATUSEX.size, 0, 0, 0, 0, 0, 0, 0, 0);
	GlobalMemoryStatusEx(info.address());
	return {
		total       : parseInt(info.ullTotalPhys),
		free        : parseInt(info.ullAvailPhys),
		used        : parseInt(info.ullTotalPhys - info.ullAvailPhys),
		virtualUsed : parseInt(info.ullTotalVirtual - info.ullAvailVirtual)
	};
}

const ObserverService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
var shutdownListener = {
		type : 'quit-application-granted',
		observe : function(aSubject, aTopic, aData) {
			ObserverService.removeObserver(this, this.type);
			gKernel32.close();
		},
		init : function() {
			ObserverService.addObserver(this, this.type, false);
		}
	};
shutdownListener.init();
