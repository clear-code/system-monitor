#ifndef __CL_CPU_H__
#define __CL_CPU_H__

#include "clICPU.h"

#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#endif

#define CL_CPU_CONTRACT_ID "@clear-code.com/system/cpu;1"
#define CL_CPU_CID {0x7465c6a6, 0xaa0d, 0x42b6, {0xb4, 0x44, 0x95, 0x24, 0xb7, 0x95, 0xd5, 0x0e}}

class clCPU : public clICPU
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_CLICPU

  clCPU();

  virtual ~clCPU();
private:
#ifdef HAVE_LIBGTOP
  glibtop_cpu mPreviousCPUTime;
#endif /* HAVE_LIBGTOP */
};

#endif /* __CL_CPU_H__ */
