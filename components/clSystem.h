#ifndef __CL_SYSTEM_H__
#define __CL_SYSTEM_H__

#include "clISystem.h"

#define MOZILLA_INTERNAL_API
#include <nsIScriptObjectOwner.h>
#undef MOZILLA_INTERNAL_API
#include <nsIScriptContext.h>
#include <nsVoidArray.h>
#include <nsITimer.h>

#define CL_SYSTEM_CONTRACT_ID "@clear-code.com/system;1"
#define CL_SYSTEM_CID {0x6f8ad6ae, 0x05d8, 0x441e, {0xa8, 0xe9, 0x51, 0x53, 0xfc, 0xa9, 0x4c, 0x48}}

class clSystem : public clISystem
               , public nsIScriptObjectOwner
{
public:
  static clSystem *GetInstance();
  static clSystem *GetService();
  static void Timeout(nsITimer *aTimer, void *aClosure);

  clSystem();
  virtual ~clSystem();

  NS_DECL_ISUPPORTS
  NS_DECL_CLISYSTEM

  NS_IMETHOD GetScriptObject(nsIScriptContext *aContext, void** aScriptObject);
  NS_IMETHOD SetScriptObject(void* aScriptObject);

  NS_IMETHOD AddMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval);
  NS_IMETHOD RemoveMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor);

  nsCOMPtr<clICPU> mCPU;

private:
  static clSystem *gSystem;
  void *mScriptObject;
  nsAutoVoidArray *mMonitors;

  nsresult Init();
};

#endif /* __CL_SYSTEM_H__ */
