#ifndef __CL_CPU_MONITOR_H__
#define __CL_CPU_MONITOR_H__

#include "clICPUMonitor.h"
#define HAVE_LIBGTOP
#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#endif

#define CL_CPU_MONITOR_CONTRACT_ID "@clear-code.com/cpu/monitor;1"
#define CL_CPU_MONITOR_CID {0x196a04bc,0xaa08, 0x46c7, {0xaa, 0xe7, 0x96, 0x18, 0xad, 0x82, 0xdf, 0x40}}

class clCPUMonitor : public clICPUMonitor
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_CLICPUMONITOR

  clCPUMonitor();

  virtual ~clCPUMonitor();
private:
#ifdef HAVE_LIBGTOP
  glibtop_cpu mPreviousCPUTime;
#endif /* HAVE_LIBGTOP */
};

#endif /* __CL_CPU_MONITOR_H__ */
