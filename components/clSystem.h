#ifndef __CL_SYSTEM_H__
#define __CL_SYSTEM_H__

#include <mozilla-config.h>

#include "clISystem.h"

#include <nsISecurityCheckedComponent.h>
#include <nsITimer.h>
#include <nsCOMPtr.h>
#include <nsCOMArray.h>

#define CL_SYSTEM_CONTRACT_ID "@clear-code.com/system;1"
#define CL_SYSTEM_CID {0x6f8ad6ae, 0x05d8, 0x441e, {0xa8, 0xe9, 0x51, 0x53, 0xfc, 0xa9, 0x4c, 0x48}}

class clSystem : public clISystem
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

  nsresult Init();

private:
  static clSystem *gSystem;
  nsCOMArray<nsITimerCallback> mMonitors;
  nsCOMPtr<clICPU> mCPU;
};

#endif /* __CL_SYSTEM_H__ */
