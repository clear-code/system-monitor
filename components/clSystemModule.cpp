#include <mozilla-config.h>

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include <nsIGenericFactory.h>
#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

#include <nsIScriptNameSpaceManager.h>

#include "clCPU.h"
#include "clCPUTime.h"
#include "clMemory.h"
#include "clSystem.h"

NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clCPU, clCPU::GetService)
NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUTime)
NS_GENERIC_FACTORY_CONSTRUCTOR(clMemory)
NS_GENERIC_FACTORY_CONSTRUCTOR(clSystem)

NS_DECL_CLASSINFO(clCPU)
NS_DECL_CLASSINFO(clSystem)
NS_DECL_CLASSINFO(clCPUTime)
NS_DECL_CLASSINFO(clMemory)

static NS_METHOD
registerSystem(nsIComponentManager *aCompMgr,
               nsIFile *aPath,
               const char *registryLocation,
               const char *componentType,
               const nsModuleComponentInfo *info)
{
    nsresult rv;
    nsCOMPtr<nsICategoryManager> catMan(do_GetService(NS_CATEGORYMANAGER_CONTRACTID, &rv));
    if (NS_FAILED(rv))
        return rv;

    catMan->AddCategoryEntry(JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY,
                             "system",
                             CL_SYSTEM_CONTRACT_ID,
                             PR_TRUE, PR_TRUE,
                             nsnull);
    return NS_OK;
}

static nsModuleComponentInfo systemComponents[] =
{
    {
       "System Property",
       CL_SYSTEM_CID,
       CL_SYSTEM_CONTRACT_ID,
       clSystemConstructor,
       registerSystem,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clSystem),
       NULL,
       &NS_CLASSINFO_NAME(clSystem)
    },
    {
       "CPU",
       CL_CPU_CID,
       CL_CPU_CONTRACT_ID,
       clCPUConstructor,
       NULL,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clCPU),
       NULL,
       &NS_CLASSINFO_NAME(clCPU)
    },
    {
       "CPUTime",
       CL_CPU_TIME_CID,
       CL_CPU_TIME_CONTRACT_ID,
       clCPUTimeConstructor,
       NULL,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clCPUTime),
       NULL,
       &NS_CLASSINFO_NAME(clCPUTime)
    },
    {
       "Memory",
       CL_MEMORY_CID,
       CL_MEMORY_CONTRACT_ID,
       clMemoryConstructor,
       NULL,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clMemory),
       NULL,
       &NS_CLASSINFO_NAME(clMemory)
    },
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);

