#include "clCPUMonitor.h"

#define HAVE_LIBGTOP
#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#endif

NS_IMPL_ISUPPORTS1(clCPUMonitor, clICPUMonitor)

clCPUMonitor::clCPUMonitor()
{
    glibtop_init();
}

clCPUMonitor::~clCPUMonitor()
{
}

/* readonly attribute float user; */
NS_IMETHODIMP clCPUMonitor::GetUser(float *aUser)
{
#ifdef HAVE_LIBGTOP
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    *aUser = cpu.user / cpu.total;

    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif /* HAVE_LIBGTOP */
}

/* readonly attribute float system; */
NS_IMETHODIMP clCPUMonitor::GetSystem(float *aSystem)
{
#ifdef HAVE_LIBGTOP
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    *aSystem = cpu.sys / cpu.total;

    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif /* HAVE_LIBGTOP */
}

/* readonly attribute float idle; */
NS_IMETHODIMP clCPUMonitor::GetIdle(float *aIdle)
{
#ifdef HAVE_LIBGTOP
    glibtop_cpu cpu;
    glibtop_get_cpu(&cpu);

    *aIdle = cpu.idle / cpu.total;

    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif /* HAVE_LIBGTOP */
}

