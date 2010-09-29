#ifndef __CL_SYSTEM_H__
#define __CL_SYSTEM_H__

#include <mozilla-config.h>

#include "clISystem.h"

#define MOZILLA_INTERNAL_API
#include <nsIScriptObjectOwner.h>
#undef MOZILLA_INTERNAL_API
#include <nsComponentManagerUtils.h>
#include <nsISecurityCheckedComponent.h>
#include <nsCOMPtr.h>
#include <nsCOMArray.h>
#include <nsIDOMWindow.h>

#include "MonitorData.h"

#define CL_SYSTEM_CONTRACT_ID "@clear-code.com/system;1"
#define CL_SYSTEM_CID {0x6f8ad6ae, 0x05d8, 0x441e, {0xa8, 0xe9, 0x51, 0x53, 0xfc, 0xa9, 0x4c, 0x48}}

class clSystem : public clISystem
               , public nsIScriptObjectOwner
               , public nsISecurityCheckedComponent
{
public:
  static clSystem *GetInstance();
  static clSystem *GetService();

  clSystem();
  virtual ~clSystem();

  NS_DECL_ISUPPORTS
  NS_DECL_CLISYSTEM
  NS_DECL_NSISECURITYCHECKEDCOMPONENT

  NS_IMETHOD GetScriptObject(nsIScriptContext *aContext, void** aScriptObject);
  NS_IMETHOD SetScriptObject(void* aScriptObject);

private:
  static clSystem *gSystem;
  nsCOMArray<MonitorData> mMonitors;
  nsCOMPtr<clICPU> mCPU;

  nsresult Init();

  nsresult GetGlobal(nsIDOMWindow **aGlobal);

  void *mScriptObject;
};

extern nsresult CL_InitSystemClass(nsIScriptContext *aContext, void **aPrototype);
extern "C" nsresult CL_NewScriptSystem(nsIScriptContext *aContext, nsISupports *aSupports, nsISupports *aParent, void **aReturn);

#endif /* __CL_SYSTEM_H__ */
