// http://mxr.mozilla.org/mozilla-central/source/memory/mozalloc/mozalloc.h

var EXPORTED_SYMBOLS = ['moz_malloc', 'moz_calloc', 'moz_realloc', 'moz_free',
                          'malloc', 'calloc', 'realloc', 'free'];

Components.utils.import('resource://gre/modules/ctypes.jsm');

const gMozalloc = ctypes.open(ctypes.libraryName('mozalloc'));

var moz_malloc = gMozalloc.declare(
		'moz_malloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t // size
	);

var moz_calloc = gMozalloc.declare(
		'moz_calloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t, // nelem
		ctypes.uint32_t // elsize
	);

var moz_realloc = gMozalloc.declare(
		'moz_realloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.voidptr_t, // ptr
		ctypes.uint32_t // elsize
	);

var moz_free = gMozalloc.declare(
		'moz_free',
		ctypes.default_abi,
		ctypes.void_t,
		ctypes.voidptr_t // ptr
	);

var malloc = moz_malloc;
var calloc = moz_calloc;
var realloc = moz_realloc;
var free = moz_free;
