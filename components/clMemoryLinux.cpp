#include "clMemory.h"

#include <glibtop/mem.h>
#include <glibtop/procmem.h>

CL_Memory
CL_GetMemory()
{
    glibtop_mem memory;
    glibtop_get_mem(&memory);

    glibtop_proc_mem self;
    glibtop_get_proc_mem(&self, getpid());

    CL_Memory info = {
        memory.total,                               // total
        memory.total - memory.used - memory.cached, // free
        memory.used - memory.cached,                // used,
        -1,                                         // virtualUsed
        self.resident                               // self
    };
    return info;
}
