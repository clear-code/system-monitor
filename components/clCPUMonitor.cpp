#include "clCPUMonitor.h"

#include "clCPUTime.h"

#define HAVE_LIBGTOP
#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#endif

NS_IMPL_ISUPPORTS1(clCPUMonitor, clICPUMonitor)

clCPUMonitor::clCPUMonitor()
{
#ifdef HAVE_LIBGTOP
    glibtop_init();
    memset(&mPreviousCPUTime, 0, sizeof(mPreviousCPUTime));
    glibtop_get_cpu(&mPreviousCPUTime);
#endif /* HAVE_LIBGTOP */
}

clCPUMonitor::~clCPUMonitor()
{
}

/* clICPUTime measure (); */
NS_IMETHODIMP clCPUMonitor::Measure(clICPUTime **result NS_OUTPARAM)
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
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

