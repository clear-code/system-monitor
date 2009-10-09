#ifndef __CL_SYSTEM_H__
#define __CL_SYSTEM_H__

#include "clISystem.h"

#define MOZILLA_INTERNAL_API
#include <nsIScriptObjectOwner.h>
#undef MOZILLA_INTERNAL_API
#include <nsIScriptContext.h>

#define CL_SYSTEM_CONTRACT_ID "@clear-code.com/system;1"
#define CL_SYSTEM_CID {0x726fc5c0, 0xb822, 0x435d, {0x82, 0x67, 0xdf, 0x2f, 0xfc, 0x7b, 0xa2, 0x78}}

class clSystem : public clISystem
               , public nsIScriptObjectOwner
{
public:
  clSystem();
  virtual ~clSystem();

  NS_DECL_ISUPPORTS
  NS_DECL_CLISYSTEM

  NS_IMETHOD GetScriptObject(nsIScriptContext *aContext, void** aScriptObject);
  NS_IMETHOD SetScriptObject(void* aScriptObject);

private:
  clICPU *mCPU;
  void *mScriptObject;
};

#endif /* __CL_SYSTEM_H__ */
