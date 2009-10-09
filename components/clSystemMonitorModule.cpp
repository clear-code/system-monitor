#include <nsIGenericFactory.h>
#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

/* This header file is unstable. */
/* #include <nsIScriptNameSpaceManager.h> */
#ifndef JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY
#define JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY "JavaScript global property"
#endif

#include "clCPU.h"
#include "clSystem.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPU)
NS_GENERIC_FACTORY_CONSTRUCTOR(clSystem)

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
       clCPUConstructor
    }
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);
