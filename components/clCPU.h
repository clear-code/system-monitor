#ifndef __CL_CPU_H__
#define __CL_CPU_H__

#include "clICPU.h"

#include <nsISecurityCheckedComponent.h>
#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#elif XP_WIN
#include <windows.h>
#endif

#define CL_CPU_CONTRACT_ID "@clear-code.com/system/cpu;1"
#define CL_CPU_CID {0x7465c6a6, 0xaa0d, 0x42b6, {0xb4, 0x44, 0x95, 0x24, 0xb7, 0x95, 0xd5, 0x0e}}

class clCPU : public clICPU
            , public nsISecurityCheckedComponent
{
public:
  static clCPU *GetInstance();
  static clCPU *GetService();

  clCPU();
  virtual ~clCPU();

  NS_DECL_ISUPPORTS
  NS_DECL_CLICPU
  NS_DECL_NSISECURITYCHECKEDCOMPONENT

private:
  static clCPU *gCPU;
#ifdef HAVE_LIBGTOP
  glibtop_cpu mPreviousCPUTime;
#elif XP_WIN
  FILETIME mPreviousIdleTime;
  FILETIME mPreviousKernelTime;
  FILETIME mPreviousUserTime;
#endif /* HAVE_LIBGTOP */
};

#endif /* __CL_CPU_H__ */
