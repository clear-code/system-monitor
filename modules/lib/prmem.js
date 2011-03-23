// http://mxr.mozilla.org/mozilla-central/source/nsprpub/pr/include/prmem.h

var EXPORTED_SYMBOLS = ['PR_Malloc', 'PR_Calloc', 'PR_Realloc', 'PR_Free'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');

const OS = Cc['@mozilla.org/xre/app-info;1']
			.getService(Ci.nsIXULAppInfo)
			.QueryInterface(Ci.nsIXULRuntime)
			.OS.toLowerCase();

const gNspr4 = OS.indexOf('win') == 0 ?
				ctypes.open('nspr4.dll') :
			OS.indexOf('linux') == 0 ?
				ctypes.open('libnspr4.so') :
			OS.indexOf('darwin') == 0 ?
				ctypes.open('libnspr4.dylib') :
			undefined ;

if (typeof gNspr4 == 'undefined')
	throw new Error('unknown platform');

const PR_Malloc = gNspr4.declare(
		'PR_Malloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t // size
	);

const PR_Calloc = gNspr4.declare(
		'PR_Calloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t, // nelem
		ctypes.uint32_t // elsize
	);

const PR_Realloc = gNspr4.declare(
		'PR_Realloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.voidptr_t, // ptr
		ctypes.uint32_t // elsize
	);

const PR_Free = gNspr4.declare(
		'PR_Free',
		ctypes.default_abi,
		ctypes.void_t,
		ctypes.voidptr_t // ptr
	);

