// http://mxr.mozilla.org/mozilla-central/source/nsprpub/pr/include/prmem.h

var EXPORTED_SYMBOLS = ['PR_Malloc', 'PR_Calloc', 'PR_Realloc', 'PR_Free',
                          'malloc', 'calloc', 'realloc', 'free'];

Components.utils.import('resource://gre/modules/ctypes.jsm');

const gNspr4 = ctypes.open(ctypes.libraryName('nspr4'));

var PR_Malloc = gNspr4.declare(
		'PR_Malloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t // size
	);

var PR_Calloc = gNspr4.declare(
		'PR_Calloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t, // nelem
		ctypes.uint32_t // elsize
	);

var PR_Realloc = gNspr4.declare(
		'PR_Realloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.voidptr_t, // ptr
		ctypes.uint32_t // elsize
	);

var PR_Free = gNspr4.declare(
		'PR_Free',
		ctypes.default_abi,
		ctypes.void_t,
		ctypes.voidptr_t // ptr
	);

var malloc = PR_Malloc;
var calloc = PR_Calloc;
var realloc = PR_Realloc;
var free = PR_Free;
