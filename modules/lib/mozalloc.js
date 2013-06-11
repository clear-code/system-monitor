// http://mxr.mozilla.org/mozilla-central/source/memory/mozalloc/mozalloc.h

const EXPORTED_SYMBOLS = ['moz_malloc', 'moz_calloc', 'moz_realloc', 'moz_free',
                          'malloc', 'calloc', 'realloc', 'free'];

Components.utils.import('resource://gre/modules/ctypes.jsm');

const gMozalloc = ctypes.open(ctypes.libraryName('mozalloc'));

const moz_malloc = gMozalloc.declare(
		'moz_malloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t // size
	);

const moz_calloc = gMozalloc.declare(
		'moz_calloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.uint32_t, // nelem
		ctypes.uint32_t // elsize
	);

const moz_realloc = gMozalloc.declare(
		'moz_realloc',
		ctypes.default_abi,
		ctypes.voidptr_t,
		ctypes.voidptr_t, // ptr
		ctypes.uint32_t // elsize
	);

const moz_free = gMozalloc.declare(
		'moz_free',
		ctypes.default_abi,
		ctypes.void_t,
		ctypes.voidptr_t // ptr
	);

const malloc = moz_malloc;
const calloc = moz_calloc;
const realloc = moz_realloc;
const free = moz_free;
