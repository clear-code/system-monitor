#include "clCPU.h"
#include "clCPUTime.h"

#include <glibtop/cpu.h>

CL_CPUTime
CL_GetCPUTime()
{
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    CL_CPUTime info = {
        cpu.user,                          // userTime
        cpu.sys,                           // systemTime,
        cpu.nice,                          // niceTime
        cpu.idle,                          // idleTime
        cpu.iowait + cpu.irq + cpu.softirq // IOWaitTime
    };
    return info;
}

CL_CPUTime
CL_GetCPUTime(CL_CPUTime *aPrevious, clICPUTime **aCPUTime)
{
    CL_CPUTime current = CL_GetCPUTime();

    guint64 user = current.userTime - aPrevious->userTime;
    guint64 system = current.systemTime - aPrevious->systemTime;
    guint64 nice = current.niceTime - aPrevious->niceTime;
    guint64 idle = current.idleTime - aPrevious->idleTime;
    guint64 io_wait = current.IOWaitTime - aPrevious->IOWaitTime;

    guint64 total = user + system + nice + idle + io_wait;

    if (total == 0) {
        *aCPUTime = new clCPUTime(0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    } else {
        *aCPUTime = new clCPUTime((double)user / total,
                                  (double)nice / total,
                                  (double)system / total,
                                  (double)idle / total,
                                  (double)io_wait / total);
    }

    NS_ADDREF(*aCPUTime);
    return current;
}
