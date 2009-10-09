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

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPU)

static nsModuleComponentInfo systemComponents[] =
{
    {
       "CPU",
       CL_CPU_CID,
       CL_CPU_CONTRACT_ID,
       clCPUConstructor
    }
};

NS_IMPL_NSGETMODULE(clSystemMonitorModule, systemComponents);
