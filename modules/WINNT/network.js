var EXPORTED_SYMBOLS = ['getNetworkLoad'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/ctypes.jsm');
Components.utils.import('resource://system-monitor-modules/ShutdownListener.js');
Components.utils.import('resource://system-monitor-modules/lib/prmem.js');

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
        .getService(Ci.nsIXULAppInfo)
        .QueryInterface(Ci.nsIXULRuntime);

const is64bit = XULAppInfo.XPCOMABI.indexOf('_64') > -1;

// http://msdn.microsoft.com/en-us/library/aa383751%28v=vs.85%29.aspx
const NTSTATUS  = ctypes.uint32_t;
const WORD      = ctypes.unsigned_short;
const BYTE      = ctypes.uint8_t;
const DWORD     = ctypes.uint32_t;
const WCHAR     = ctypes.jschar;
const DWORDLONG = ctypes.uint64_t;
const BOOL      = ctypes.int;
const HANDLE    = ctypes.intptr_t;
const ULONG_PTR = ctypes.unsigned_long.ptr;
const PVOID     = ctypes.voidptr_t;
const LPVOID    = ctypes.voidptr_t;
const ULONG     = ctypes.unsigned_long;

const gIphlpapi = ctypes.open('iphlpapi.dll');
addShutdownListener(function() { gIphlpapi.close(); });

// http://msdn.microsoft.com/en-us/library/aa924241.aspx
const MIB_IPSTATS = new ctypes.StructType('MIB_IPSTATS', [
  { dwForwarding      : DWORD },
  { dwDefaultTTL      : DWORD },
  { dwInReceives      : DWORD },
  { dwInHdrErrors     : DWORD },
  { dwInAddrErrors    : DWORD },
  { dwForwDatagrams   : DWORD },
  { dwInUnknownProtos : DWORD },
  { dwInDiscards      : DWORD },
  { dwInDelivers      : DWORD },
  { dwOutRequests     : DWORD },
  { dwRoutingDiscards : DWORD },
  { dwOutDiscards     : DWORD },
  { dwOutNoRoutes     : DWORD },
  { dwReasmTimeout    : DWORD },
  { dwReasmReqds      : DWORD },
  { dwReasmOks        : DWORD },
  { dwReasmFails      : DWORD },
  { dwFragOks         : DWORD },
  { dwFragFails       : DWORD },
  { dwFragCreates     : DWORD },
  { dwNumIf           : DWORD },
  { dwNumAddr         : DWORD },
  { dwNumRoutes       : DWORD }
]);

// http://code.activestate.com/recipes/392572-using-the-win32-iphelper-api/
const MAX_INTERFACE_NAME_LEN = 256;
const MAXLEN_PHYSADDR        = 8;
const MAXLEN_IFDESCR         = 256;
const MIB_IFROW = new ctypes.StructType('MIB_IFROW', [
  { wszName                           : ctypes.ArrayType(WCHAR, MAX_INTERFACE_NAME_LEN) },
  { dwIndex                           : DWORD },
  { dwType                            : DWORD },
  { dwMtu                             : DWORD },
  { dwSpeed                           : DWORD },
  { dwPhysAddrLen                     : DWORD },
  { bPhysAddr                         : ctypes.ArrayType(BYTE, MAXLEN_PHYSADDR) },
  { dwAdminStatus                     : DWORD },
  { dwOperStatus                      : DWORD },
  { dwLastChange                      : DWORD },
  { dwInOctets                        : DWORD },
  { dwInUcastPkts                     : DWORD },
  { dwInNUcastPkts                    : DWORD },
  { dwInDiscards                      : DWORD },
  { dwInErrors                        : DWORD },
  { dwInUnknownProtos                 : DWORD },
  { dwOutOctets                       : DWORD },
  { dwOutUcastPkts                    : DWORD },
  { dwOutNUcastPkts                   : DWORD },
  { dwOutDiscards                     : DWORD },
  { dwOutErrors                       : DWORD },
  { dwOutQLen                         : DWORD },
  { dwDescrLen                        : DWORD },
  { bDescr                            : ctypes.ArrayType(BYTE, MAXLEN_IFDESCR) }
]);

const IF_TYPE_SOFTWARE_LOOPBACK = 24;

const MIB_IFTABLE = new ctypes.StructType('MIB_IFTABLE', [
  { dwNumEntries : DWORD },
  { table        : ctypes.ArrayType(MIB_IFROW.ptr, 1) /* MIB_IFROW table[ANY_SIZE]; */ }
]);

// http://msdn.microsoft.com/en-us/library/windows/desktop/aa365943%28v=vs.85%29.aspx
const GetIfTable = gIphlpapi.declare(
  'GetIfTable',
  ctypes.default_abi,
  // return type
  DWORD,
  // arguments
  MIB_IFTABLE.ptr,
  ULONG_PTR,
  BOOL
);

const GetIfEntry = gIphlpapi.declare(
  'GetIfEntry',
  ctypes.default_abi,
  // return type
  DWORD,
  // arguments
  MIB_IFROW.ptr
);

// Export
function getNetworkLoad() {
  var totalNetworkload = {
    downBytes : 0,
    upBytes   : 0
  };

  var dwSize = new ULONG(0);
  // Get proper dwSize
  GetIfTable(null, dwSize.address(), 0);
  // Allocate MIB_IFTABLE
  var ifTablePtr = ctypes.cast(PR_Calloc(1, dwSize), MIB_IFTABLE.ptr);

  // Get IF table
  GetIfTable(ifTablePtr, dwSize.address(), 0);

  var numberOfEntries = ifTablePtr.contents.dwNumEntries;
  if (numberOfEntries > 0) {
    let ifRow = new MIB_IFROW();
    for (let i = 1; i <= numberOfEntries; ++i) {
      ifRow.dwIndex = i;
      GetIfEntry(ifRow.address());
      if (ifRow.dwType === IF_TYPE_SOFTWARE_LOOPBACK)
        continue;
      // Aggregate loads
      totalNetworkload.downBytes += ifRow.dwInOctets;
      totalNetworkload.upBytes += ifRow.dwOutOctets;
    }
  }

  PR_Free(ifTablePtr);

  return totalNetworkload;
}
