#include "nsIGenericFactory.h"

#include "clCPUMonitor.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUMonitor)

static nsModuleComponentInfo components[] =
{
    {
       "CPU Monitor",
       CL_CPU_MONITOR_CID,
       CL_CPU_MONITOR_CONTRACT_ID,
       clCPUMonitorConstructor
    }
};

NS_IMPL_NSGETMODULE(clCPUMonitorModule, components);
