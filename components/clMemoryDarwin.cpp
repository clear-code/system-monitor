#include "clMemory.h"

#include <mach/mach_init.h>
#include <mach/host_info.h>
#include <mach/mach_host.h>

CL_Memory
CL_GetMemory()
{
    host_basic_info total_memory;
    mach_msg_type_number_t total_count = HOST_BASIC_INFO_COUNT;
    host_info(mach_host_self(), HOST_BASIC_INFO, (host_info_t) &total_memory, &total_count);

    PRUint64 total = total_memory.max_mem;

    vm_statistics memory;
    mach_msg_type_number_t count = HOST_VM_INFO_COUNT;
    host_statistics(mach_host_self(), HOST_VM_INFO, (host_info_t) &memory, &count);

    PRUint64 free = memory.free_count * vm_page_size;

    CL_Memory info = {
        total,        // total
        free,         // free
        total - free, // used,
        -1,           // virtualUsed
        -1            // self
    };
    return info;
}


