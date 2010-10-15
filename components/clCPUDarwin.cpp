#include "clCPU.h"
#include "clCPUTime.h"

#include <mach/mach_host.h>
#include <mach/vm_map.h>

nsAutoVoidArray*
CL_GetCPUTimeInfoArray()
{
    nsAutoVoidArray *array = new nsAutoVoidArray();

    natural_t nProcessors;
    mach_msg_type_number_t nProcessorInfos;
    processor_cpu_load_info_data_t *processorInfos;

    if (host_processor_info(mach_host_self(),
                            PROCESSOR_CPU_LOAD_INFO,
                            &nProcessors,
                            (processor_info_array_t*)&processorInfos,
                            &nProcessorInfos)) {
        return array;
    }

    for (unsigned int i = 0; i < nProcessors; i++) {
        CL_CPUTimeInfo *info = new CL_CPUTimeInfo(
            processorInfos[i].cpu_ticks[CPU_STATE_USER],
            processorInfos[i].cpu_ticks[CPU_STATE_SYSTEM],
            processorInfos[i].cpu_ticks[CPU_STATE_NICE],
            processorInfos[i].cpu_ticks[CPU_STATE_IDLE],
            0
        );
        array->AppendElement(info);
    }
    return array;
}

nsresult
CL_GetCPUTime(CL_CPUTimeInfo *aPrevious, CL_CPUTimeInfo *aCurrent, clICPUTime **aCPUTime)
{
    PRUint64 user, nice, system, idle, total;
    user = aCurrent->userTime - aPrevious->userTime;
    nice = aCurrent->niceTime - aPrevious->niceTime;
    system = aCurrent->systemTime - aPrevious->systemTime;
    idle = aCurrent->idleTime - aPrevious->idleTime;

    total = user + nice + system + idle;

    if (total == 0) {
        *aCPUTime = new clCPUTime(0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    } else {
        *aCPUTime = new clCPUTime((double)user / total,
                                  (double)nice / total,
                                  (double)system / total,
                                  (double)idle / total,
                                  (double)0.0f);
    }

    NS_ADDREF(*aCPUTime);
    return NS_OK;
}
