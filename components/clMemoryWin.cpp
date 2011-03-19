#include "clMemory.h"

#include <windows.h>
#include <psapi.h>

#if (_WIN32_WINNT < 0x0501)
// for Windows 2000 - Windows XP SP1
typedef PROCESS_MEMORY_COUNTERS_EX PROCESS_MEMORY_COUNTERS_EX;
struct PROCESS_MEMORY_COUNTERS_EX {
    DWORD cb;
    DWORD PageFaultCount;
    SIZE_T PeakWorkingSetSize;
    SIZE_T WorkingSetSize;
    SIZE_T QuotaPeakPagedPoolUsage;
    SIZE_T QuotaPagedPoolUsage;
    SIZE_T QuotaPeakNonPagedPoolUsage;
    SIZE_T QuotaNonPagedPoolUsage;
    SIZE_T PagefileUsage;
    SIZE_T PeakPagefileUsage;
    SIZE_T PrivateUsage;
};
#endif

CL_Memory
CL_GetMemory()
{
    MEMORYSTATUSEX memory;
    memory.dwLength=sizeof(memory);
    GlobalMemoryStatusEx(&memory);

    PROCESS_MEMORY_COUNTERS_EX self;
    GetProcessMemoryInfo(GetCurrentProcess(),
                         (PROCESS_MEMORY_COUNTERS*) &self,
                         sizeof self);

    PRUint64 self_usage;
    if (self.PrivateUsage > 0) {
      self_usage = self.PrivateUsage;
    }
    else {
      self_usage = self.WorkingSetSize;
    }

    CL_Memory info = {
        memory.ullTotalPhys,                             // total
        memory.ullAvailPhys,                             // free
        memory.ullTotalPhys - memory.ullAvailPhys,       // used,
        memory.ullTotalVirtual - memory.ullAvailVirtual, // virtualUsed
        self_usage                                       // self
    };
    return info;
}
