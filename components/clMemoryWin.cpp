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

    DWORD pagesCount = self[0];
    ULONG_PTR *actualSelf = (ULONG_PTR *) calloc(pagesCount + 1, sizeof(ULONG_PTR));
    QueryWorkingSet(GetCurrentProcess(),
                    (PVOID*) actualSelf,
                    (pagesCount + 1) * sizeof(ULONG_PTR));

    PRUint64 selfUsage = 0;
    for (ULONG_PTR i = 1; i < pagesCount; i++) {
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
