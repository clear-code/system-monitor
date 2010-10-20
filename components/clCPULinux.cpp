#include "clCPU.h"
#include "clCPUTime.h"

#include <glibtop/cpu.h>

NS_IMETHODIMP
clCPU::GetCount(PRUint32 *aCount)
{
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);
    for (unsigned int i = 0; i < GLIBTOP_NCPU && cpu.xcpu_total[i] != 0; i++) {
        *aCount = i+1;
    }
    return NS_OK;
}

nsAutoVoidArray*
clCPU::GetCPUTimeInfoArray()
{
    nsAutoVoidArray *array = new nsAutoVoidArray();

    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    for (unsigned int i = 0; i < GLIBTOP_NCPU && cpu.xcpu_total[i] != 0; i++) {
        CL_CPUTimeInfo *info = new CL_CPUTimeInfo(
            cpu.xcpu_user[i],                          // userTime
            cpu.xcpu_sys[i],                           // systemTime,
            cpu.xcpu_nice[i],                          // niceTime
            cpu.xcpu_idle[i],                          // idleTime
            cpu.xcpu_iowait[i] + cpu.xcpu_irq[i] + cpu.xcpu_softirq[i] // IOWaitTime
        );
        array->AppendElement(info);
    }

    return array;
}

nsresult
clCPU::GetCPUTime(CL_CPUTimeInfo *aPrevious, CL_CPUTimeInfo *aCurrent, clICPUTime **aCPUTime)
{
    guint64 user = aCurrent->userTime - aPrevious->userTime;
    guint64 system = aCurrent->systemTime - aPrevious->systemTime;
    guint64 nice = aCurrent->niceTime - aPrevious->niceTime;
    guint64 idle = aCurrent->idleTime - aPrevious->idleTime;
    guint64 io_wait = aCurrent->IOWaitTime - aPrevious->IOWaitTime;

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
    return NS_OK;
}
