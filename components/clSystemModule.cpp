#include <mozilla/ModuleUtils.h>

#include <nsICategoryManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIClassInfoImpl.h>

#include <nsIScriptNameSpaceManager.h>

#include "clCPU.h"
#include "clSystem.h"
#include "clCPUTime.h"
#include "clMemory.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(clCPU)
NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR(clSystem, clSystem::GetService)
NS_GENERIC_FACTORY_CONSTRUCTOR(clCPUTime)
NS_GENERIC_FACTORY_CONSTRUCTOR(clMemory)

NS_DEFINE_NAMED_CID(CL_SYSTEM_CID)
NS_DEFINE_NAMED_CID(CL_CPU_CID)
NS_DEFINE_NAMED_CID(CL_CPU_TIME_CID)
NS_DEFINE_NAMED_CID(CL_MEMORY_CID)

static const mozilla::Module::CIDEntry kSystemCIDs[] = {
  { &kCL_SYSTEM_CID, false, NULL, clSystemConstructor },
  { &kCL_CPU_CID, false, NULL, clCPUConstructor },
  { &kCL_CPU_TIME_CID, false, NULL, clCPUTimeConstructor },
  { &kCL_MEMORY_CID, false, NULL, clMemoryConstructor },
  { NULL }
};

static const mozilla::Module::ContractIDEntry kSystemContracts[] = {
  { CL_SYSTEM_CONTRACT_ID, &kCL_SYSTEM_CID },
  { CL_CPU_CONTRACT_ID, &kCL_CPU_CID },
  { CL_CPU_TIME_CONTRACT_ID, &kCL_CPU_TIME_CID },
  { CL_MEMORY_CONTRACT_ID, &kCL_MEMORY_CID },
  { NULL }
};

static const mozilla::Module::CategoryEntry kSystemCategories[] = {
  { "JavaScript global property", "system", CL_SYSTEM_CID },
  { NULL }
};

static const mozilla::Module kSystemModule = {
  mozilla::Module::kVersion,
  kSystemCIDs,
  kSystemContracts,
  kSystemCategories
};

NSMODULE_DEFN(clSystemModule) = &kSystemModule;

NS_IMPL_MOZILLA192_NSGETMODULE(&kSystemModule)
