#include "clMemory.h"

#include <glibtop/mem.h>

CL_Memory
CL_GetMemory()
{
    glibtop_mem memory;
    glibtop_get_mem(&memory);

    CL_Memory info = {
        memory.total,                               // total
        memory.total - memory.used - memory.cached, // free
        memory.used - memory.cached,                // used,
        -1,                                         // virtualUsed
        -1                                          // self
    };
    return info;
}
