#include "clMemory.h"

#include <windows.h>

CL_Memory
CL_GetMemory()
{
    MEMORYSTATUSEX memory;
    memory.dwLength=sizeof(memory);
    GlobalMemoryStatusEx(&memory);

    CL_Memory info = {
        memory.ullTotalPhys,                            // total
        memory.ullAvailPhys,                            // free
        memory.ullTotalPhys - memory.ullAvailPhys,      // used,
        memory.ullTotalVirtual - memory.ullAvailVirtual // virtualUsed
    };
    return info;
}
