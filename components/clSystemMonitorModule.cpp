#include "nsIGenericFactory.h"

#include "clCPUMonitor.h"
#include "clCPUTime.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUMonitor)

static nsModuleComponentInfo cpuMonitorComponents[] =
{
    {
       "CPU Monitor",
       CL_CPU_MONITOR_CID,
       CL_CPU_MONITOR_CONTRACT_ID,
       clCPUMonitorConstructor
    }
};

NS_IMPL_NSGETMODULE(clCPUMonitorModule, cpuMonitorComponents);
