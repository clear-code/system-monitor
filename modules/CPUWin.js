var EXPORTED_SYMBOLS = ['getCount'];

const Cc = Components.classes;
const Ci = Components.interfaces;

// see http://source.winehq.org/source/include/winternl.h
const SystemBasicInformation = 0;
const SystemProcessorPerformanceInformation = 8;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/ctypes.jsm');

XPCOMUtils.defineLazyGetter(this, 'RESERVED1', function () {
	return ctypes.ArrayType(ctypes.int8_t, 24);
});

XPCOMUtils.defineLazyGetter(this, 'RESERVED2', function () {
	return ctypes.ArrayType(ctypes.voidptr_t, 4);
});

XPCOMUtils.defineLazyGetter(this, 'SYSTEM_BASIC_INFORMATION', function () {
	return new ctypes.StructType('SYSTEM_BASIC_INFORMATION', [
		{ Reserved1 : RESERVED1 },
		{ Reserved2 : RESERVED2 },
		{ NumberOfProcessors : ctypes.uint32_t },
	]);
});

var gNtdll = ctypes.open('ntdll.dll');

XPCOMUtils.defineLazyGetter(this, 'NtQuerySystemInformation_SystemBasicInformation', function () {
	var NtQuerySystemInformation = gNtdll.declare(
			'NtQuerySystemInformation',
			ctypes.default_abi,
			ctypes.uint32_t,
			ctypes.uint32_t,
			SYSTEM_BASIC_INFORMATION.ptr,
			ctypes.unsigned_long,
			ctypes.uint32_t
		);
	return function(aInfo) {
		return NtQuerySystemInformation(
			SystemBasicInformation,
			aInfo.address(),
			SYSTEM_BASIC_INFORMATION.size,
			0
		);
	};
});

XPCOMUtils.defineLazyGetter(this, 'NtQuerySystemInformation_SystemProcessorPerformanceInformation', function () {
	return gNtdll.declare(
			'NtQuerySystemInformation',
			ctypes.default_abi,
			ctypes.uint32_t,
			ctypes.uint32_t,
			SYSTEM_BASIC_INFORMATION.ptr,
			ctypes.unsigned_long,
			ctypes.uint32_t
	);
});

function createNewSystemBasicInfo() {
	var reserver1 = new RESERVED1();
	var reserver2 = new RESERVED2();
	return new SYSTEM_BASIC_INFORMATION(reserver1, reserver2, 0);
}

function getCount() {
	var info = createNewSystemBasicInfo();
	NtQuerySystemInformation_SystemBasicInformation(info);
	return info.NumberOfProcessors;
};


const ObserverService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
var shutdownListener = {
		type : 'quit-application-granted',
		observe : function(aSubject, aTopic, aData) {
			ObserverService.removeObserver(this, this.type);
			gNtdll.close();
		},
		init : function() {
			ObserverService.addObserver(this, this.type, false);
		}
	};
shutdownListener.init();
