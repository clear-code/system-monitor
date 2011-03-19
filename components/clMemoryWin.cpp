#include "clMemory.h"

#include <windows.h>
#include <psapi.h>

CL_Memory
CL_GetMemory()
{
    MEMORYSTATUSEX memory;
    memory.dwLength=sizeof(memory);
    GlobalMemoryStatusEx(&memory);

    PROCESS_MEMORY_COUNTERS self;
    GetProcessMemoryInfo(GetCurrentProcess(), &self, sizeof self);

    CL_Memory info = {
        memory.ullTotalPhys,                             // total
        memory.ullAvailPhys,                             // free
        memory.ullTotalPhys - memory.ullAvailPhys,       // used,
        memory.ullTotalVirtual - memory.ullAvailVirtual, // virtualUsed
        self.WorkingSetSize                              // self
    };
    return info;
}
