#include "clCPU.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>
#include <nsCOMPtr.h>

#include "clCPUTime.h"

clCPU::clCPU()
{
#ifdef HAVE_LIBGTOP
    glibtop_init();
    memset(&mPreviousCPUTime, 0, sizeof(mPreviousCPUTime));
    glibtop_get_cpu(&mPreviousCPUTime);
#elif XP_WIN
    GetSystemTimes(&mPreviousIdleTime, &mPreviousKernelTime, &mPreviousUserTime);
#endif /* HAVE_LIBGTOP */
}

clCPU::~clCPU()
{
}

clCPU * clCPU::gCPU = nsnull;

clCPU *
clCPU::GetInstance()
{
    if (!clCPU::gCPU) {
        clCPU::gCPU = new clCPU();
    }

    return clCPU::gCPU;
}

clCPU *
clCPU::GetService()
{
    clCPU *cpu = clCPU::GetInstance();
    NS_IF_ADDREF(cpu);

    return cpu;
}

NS_IMPL_ISUPPORTS2_CI(clCPU,
                      clICPU,
                      nsISecurityCheckedComponent)

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

    *result = new clCPUTime((double)user / total,
                            (double)nice / total,
                            (double)system / total,
                            (double)idle / total,
                            (double)io_wait / total);

    NS_ADDREF(*result);
    memcpy(&mPreviousCPUTime, &cpu, sizeof(cpu));
    return NS_OK;
#elif XP_WIN
#define FILETIME_TO_UINT64(v) \
    (v.dwLowDateTime + ((UINT64)v.dwHighDateTime << 32))

    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);

    UINT64 user = FILETIME_TO_UINT64(userTime) - FILETIME_TO_UINT64(mPreviousUserTime);
    UINT64 kernel = FILETIME_TO_UINT64(kernelTime) - FILETIME_TO_UINT64(mPreviousKernelTime);
    UINT64 idle = FILETIME_TO_UINT64(idleTime) - FILETIME_TO_UINT64(mPreviousIdleTime);

    UINT64 total = user + kernel;

    /*
      Trick!!
      On windows, we can not calcurate kernel and user times without idle time respectively,
      because the kernel and user times which returned by GetSystemTimes are including
      idle times.
      kernel time = (cpu usage time in kernel) + (cpu idle time in kernel)
      user time = (cpu usage time in user space) + (cpu idle time in user space)
      idle time = (cpu idle time in kernel) + (cpu idle time in user space)
      So we set (cpu usage time in kernel) + (cpu usage time in user space) value as
      kernel time for the convinience. This value is used in GetUsage.
    */
    kernel = total - idle;

    mPreviousUserTime = userTime;
    mPreviousKernelTime = kernelTime;
    mPreviousIdleTime = idleTime;

    *result = new clCPUTime((double)0.0f,
                            (double)0.0f,
                            (double)kernel / total,
                            (double)idle / total,
                            (double)0.0f);

    NS_ADDREF(*result);

    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

NS_IMETHODIMP
clCPU::GetUsage(double *aUsage)
{
    nsCOMPtr<clICPUTime> cpuTime;
    nsresult rv = GetCurrentTime(getter_AddRefs(cpuTime));
    NS_ENSURE_SUCCESS(rv, rv);

    double user, system;
    cpuTime->GetUser(&user);
    cpuTime->GetSystem(&system);
    *aUsage = user + system;

    return NS_OK;
}

static char *
cloneAllAccessString (void)
{
    static const char allAccessString[] = "allAccess";
    return (char*)nsMemory::Clone(allAccessString, sizeof(allAccessString));
}

NS_IMETHODIMP
clCPU::CanCreateWrapper(const nsIID * iid, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPU::CanCallMethod(const nsIID * iid, const PRUnichar *methodName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPU::CanGetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPU::CanSetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}
