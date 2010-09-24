#ifndef __CL_CPU_H__
#define __CL_CPU_H__

#include <mozilla-config.h>

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clICPU.h"

#include <nsISecurityCheckedComponent.h>

#define CL_CPU_CONTRACT_ID "@clear-code.com/system/cpu;1"
#define CL_CPU_CID {0x7465c6a6, 0xaa0d, 0x42b6, {0xb4, 0x44, 0x95, 0x24, 0xb7, 0x95, 0xd5, 0x0e}}

class clCPU : public clICPU
            , public nsISecurityCheckedComponent
{
public:
  clCPU();
  virtual ~clCPU();

  NS_DECL_ISUPPORTS
  NS_DECL_CLICPU
  NS_DECL_NSISECURITYCHECKEDCOMPONENT

private:
#ifdef HAVE_LIBGTOP2
  void setPreviousCPUTime(void *gtop_cpu);
#endif
  PRUint64 mPreviousUserTime;
  PRUint64 mPreviousNiceTime;
  PRUint64 mPreviousSystemTime;
  PRUint64 mPreviousIdleTime;
  PRUint64 mPreviousIOWaitTime;
};

#endif /* __CL_CPU_H__ */
