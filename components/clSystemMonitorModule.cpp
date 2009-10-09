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
#include "clCPUMonitor.h"
#include "clSystem.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPU)
NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUMonitor)
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

static NS_METHOD
registerCPUMonitor(nsIComponentManager *aCompMgr,
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
                             "monitor",
                             CL_CPU_MONITOR_CONTRACT_ID,
                             PR_TRUE, PR_TRUE,
                             nsnull);
    return NS_OK;
}

NS_DECL_CLASSINFO(clCPUMonitor)

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
    },
    {
       "CPU Monitor",
       CL_CPU_MONITOR_CID,
       CL_CPU_MONITOR_CONTRACT_ID,
       clCPUMonitorConstructor,
       registerCPUMonitor,
       NULL,
       NULL,
       NS_CI_INTERFACE_GETTER_NAME(clCPUMonitor),
       NULL,
       &NS_CLASSINFO_NAME(clCPUMonitor)
    }
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);
