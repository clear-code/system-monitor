#include <nsIGenericFactory.h>
#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

/* This header file is unstable. */
/* #include <nsIScriptNameSpaceManager.h> */
#ifndef JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY
#define JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY "JavaScript global property"
#endif

#include "clCPUMonitor.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUMonitor)

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
#if 0
    nsCOMPtr<nsIComponentRegistrar> compReg(do_QueryInterface(aCompMgr));
    if (!compReg)
      return NS_ERROR_UNEXPECTED;

    PRBool registered;
    rv = compReg->IsContractIDRegistered(CL_CPU_MONITOR_CONTRACT_ID,
                                         &registered);
    NS_ENSURE_SUCCESS(rv, rv);

    if (registered) {
      return compReg->RegisterFactoryLocation(GetCID(),
                                              "CPU Monitor",
                                              nsnull, aPath, registryLocation, componentType);
    }

    return compReg->RegisterFactoryLocation(GetCID(),
                                            "CPU Monitor",
                                            CL_CPU_MONITOR_CONTRACT_ID,
                                            aPath, registryLocation, componentType);
#endif
    return NS_OK;
}

NS_DECL_CLASSINFO(clCPUMonitor)

static nsModuleComponentInfo systemComponents[] =
{
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
