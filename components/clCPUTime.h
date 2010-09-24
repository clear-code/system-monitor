#ifndef __CL_CPU_TIME_H__
#define __CL_CPU_TIME_H__

#ifndef MOZ_NO_MOZALLOC
#define MOZ_NO_MOZALLOC
#endif

#include <mozilla-config.h>

#include "clICPUTime.h"

#include <nsISecurityCheckedComponent.h>
#define CL_CPU_TIME_CONTRACT_ID "@clear-code.com/system/time;1"
#define CL_CPU_TIME_CID {0x7b5c3cbb, 0x0185, 0x4f6b, {0x8f, 0xc7, 0x9c, 0x12, 0x6c, 0xcc, 0x81, 0xb0}}

class clCPUTime : public clICPUTime
                , public nsISecurityCheckedComponent
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_CLICPUTIME
  NS_DECL_NSISECURITYCHECKEDCOMPONENT

  clCPUTime(double aUser, double aNice, double aSystem, double aIdle, double aIOWait);
  clCPUTime();
  virtual ~clCPUTime();

private:
  double mUser;
  double mNice;
  double mSystem;
  double mIdle;
  double mIOWait;
};

#endif /* __CL_CPU_TIME_H__ */
