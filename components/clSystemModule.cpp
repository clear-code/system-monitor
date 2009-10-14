#include <nsIGenericFactory.h>
#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

#include <nsIScriptNameSpaceManager.h>

#include "clCPU.h"
#include "clSystem.h"

NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clCPU, clCPU::GetService)
NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clSystem, clSystem::GetService)

NS_DECL_CLASSINFO(clCPU)

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
       registerSystem
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
    }
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);