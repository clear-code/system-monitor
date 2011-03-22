#include "clMemory.h"

#include <stdlib.h>
#include <windows.h>
#include <psapi.h>

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

    DWORD enoughPagesCount = self[0] + 1024;
    ULONG_PTR *actualSelf = (ULONG_PTR *) calloc(enoughPagesCount, sizeof(ULONG_PTR));
    QueryWorkingSet(GetCurrentProcess(),
                    (PVOID*) actualSelf,
                    enoughPagesCount * sizeof(ULONG_PTR));

    PRUint64 selfUsage = 0;
    for (ULONG_PTR i = 1; i < enoughPagesCount; i++) {
      if (actualSelf[i] == 0) {
        break;
      }
      if (!(actualSelf[i] & 0x100)) {
        selfUsage++;
      }
    }

    free(actualSelf);

    CL_Memory info = {
        memory.ullTotalPhys,                             // total
        memory.ullAvailPhys,                             // free
        memory.ullTotalPhys - memory.ullAvailPhys,       // used,
        memory.ullTotalVirtual - memory.ullAvailVirtual, // virtualUsed
        selfUsage * systemInfo.dwPageSize               // self
    };
    return info;
}
