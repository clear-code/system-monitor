#include "clCPU.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

#include "clCPUTime.h"

clCPU::clCPU()
{
#ifdef HAVE_LIBGTOP
    glibtop_init();
    memset(&mPreviousCPUTime, 0, sizeof(mPreviousCPUTime));
    glibtop_get_cpu(&mPreviousCPUTime);
#elif CYGWIN
    GetSystemTimes(&mPreviousIdleTime, &mPreviousKernelTime, &mPreviosUserTime);
#endif /* HAVE_LIBGTOP */
}

clCPU::~clCPU()
{
}

NS_IMPL_ISUPPORTS1_CI(clCPU, clICPU)

NS_IMETHODIMP
clCPU::GetCurrentTime(clICPUTime **result NS_OUTPARAM)
{
#ifdef HAVE_LIBGTOP
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    guint64 user = cpu.user - mPreviousCPUTime.user;
    guint64 system = cpu.sys - mPreviousCPUTime.sys;
    guint64 nice = cpu.nice - mPreviousCPUTime.nice;
    guint64 idle = cpu.idle - mPreviousCPUTime.idle;
    guint64 io_wait = cpu.iowait + cpu.irq + cpu.softirq -
                      (mPreviousCPUTime.iowait + mPreviousCPUTime.irq + mPreviousCPUTime.softirq);

    guint64 total = user + system + nice + idle + io_wait;

    *result = new clCPUTime((float)user / total,
                            (float)nice / total,
                            (float)system / total,
                            (float)idle / total,
                            (float)io_wait / total);

    NS_ADDREF(*result);
    memcpy(&mPreviousCPUTime, &cpu, sizeof(cpu));
    return NS_OK;
#elif CYGWIN
    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);

    guint64 user = userTime - mPreviousUserTime;
    guint64 kernel = kernelTime - mPreviousKernelTime;
    guint64 idle = idleTime - mPreviousIdleTime;

    guint64 total = user + kernel + idle;

    mPreviosUserTime = user;
    mPreviosKernelTime = kernel;
    mPreviosIdleTime = idle;

    *result = new clCPUTime((float)user / total,
                            (float)0.0f,
                            (float)kernel / total,
                            (float)idle / total,
                            (float)0.0f);

    NS_ADDREF(*result);

    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

