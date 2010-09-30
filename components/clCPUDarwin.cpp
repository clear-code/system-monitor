#include "clCPU.h"
#include "clCPUTime.h"

#include <mach/mach_host.h>
#include <mach/vm_map.h>

CL_CPUTime
CL_GetCPUTime()
{
    CL_CPUTime info = {0, 0, 0, 0, 0};

    natural_t nProcessors;
    mach_msg_type_number_t nProcessorInfos;
    processor_cpu_load_info_data_t *processorInfos;

    if (host_processor_info(mach_host_self(),
                            PROCESSOR_CPU_LOAD_INFO,
                            &nProcessors,
                            (processor_info_array_t*)&processorInfos,
                            &nProcessorInfos)) {
        return info;
    }

    for (unsigned int i = 0; i < nProcessors; i++) {
        info.userTime += processorInfos[i].cpu_ticks[CPU_STATE_USER];
        info.systemTime += processorInfos[i].cpu_ticks[CPU_STATE_SYSTEM];
        info.niceTime += processorInfos[i].cpu_ticks[CPU_STATE_NICE];
        info.idleTime += processorInfos[i].cpu_ticks[CPU_STATE_IDLE];
    }
    return info;
}

CL_CPUTime
CL_GetCPUTime(CL_CPUTime *aPrevious, clICPUTime **aCPUTime)
{
    CL_CPUTime current = CL_GetCPUTime();

    PRUint64 user, nice, system, idle, total;
    user = current.userTime - aPrevious->userTime;
    nice = current.niceTime - aPrevious->niceTime;
    system = current.systemTime - aPrevious->systemTime;
    idle = current.idleTime - aPrevious->idleTime;

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
    return current;
}
