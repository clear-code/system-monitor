#include "clMemory.h"

#include <windows.h>
#include <psapi.h>
#include <prmem.h>

static ULONG_PTR gLastSelfUsage = 0;

CL_Memory
CL_GetMemory()
{
    MEMORYSTATUSEX memory;
    memory.dwLength=sizeof(memory);
    GlobalMemoryStatusEx(&memory);

    SYSTEM_INFO systemInfo;
    GetSystemInfo(&systemInfo);

    ULONG_PTR self[1];
    QueryWorkingSet(GetCurrentProcess(),
                    (PVOID*) &self,
                    sizeof(self));

    ULONG_PTR selfUsage = 0;
    DWORD enoughPagesCount = self[0] + 1;
    ULONG_PTR *actualSelf = (ULONG_PTR *) PR_Malloc(enoughPagesCount * sizeof(ULONG_PTR));
    if (QueryWorkingSet(GetCurrentProcess(),
                        (PVOID*) actualSelf,
                        enoughPagesCount * sizeof(ULONG_PTR)) != 0) {
      for (ULONG_PTR i = 1; i < enoughPagesCount; i++) {
        if (actualSelf[i] == 0) {
          break;
        }
        if (!(actualSelf[i] & 0x100)) {
          selfUsage++;
        }
      }
      selfUsage = selfUsage * systemInfo.dwPageSize;
      gLastSelfUsage = selfUsage;
    }
    else {
      selfUsage = gLastSelfUsage;
    }

    PR_Free(actualSelf);

    CL_Memory info = {
        memory.ullTotalPhys,                             // total
        memory.ullAvailPhys,                             // free
        memory.ullTotalPhys - memory.ullAvailPhys,       // used,
        memory.ullTotalVirtual - memory.ullAvailVirtual, // virtualUsed
        selfUsage                                        // self
    };
    return info;
}
