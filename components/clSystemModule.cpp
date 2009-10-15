#include <nsIGenericFactory.h>
#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

#include <nsIScriptNameSpaceManager.h>

#include "clCPU.h"
#include "clSystem.h"
#include "clCPUTime.h"

NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clCPU, clCPU::GetService)
NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clSystem, clSystem::GetService)
NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUTime)

NS_DECL_CLASSINFO(clCPU)
NS_DECL_CLASSINFO(clSystem)
NS_DECL_CLASSINFO(clCPUTime)

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
       "CPUTime Property",
       CL_SYSTEM_CID,
       CL_SYSTEM_CONTRACT_ID,
       clCPUTimeConstructor,
       NULL,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clCPUTime),
       NULL,
       &NS_CLASSINFO_NAME(clCPUTime)
    },
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);
