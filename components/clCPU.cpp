#include "clCPU.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>
#include <nsCOMPtr.h>

#ifdef HAVE_LIBGTOP
#include <glibtop/cpu.h>
#elif defined(XP_WIN)
#include <windows.h>
#undef GetCurrentTime /* CAUTION! Use GetTickCount instead of GetCurrentTime*/
#undef AddMonitor /* CAUTION! Use AddMonitorW instead */
#define FILETIME_TO_UINT64(v) (v.dwLowDateTime + ((UINT64)v.dwHighDateTime << 32))
#elif defined(XP_MACOSX)
#include <mach/mach_host.h>
#include <mach/vm_map.h>
#endif

#include "clCPUTime.h"

#ifdef HAVE_LIBGTOP
void
clCPU::setPreviousCPUTime (void *gtop_cpu)
{
    glibtop_cpu *cpu = (glibtop_cpu*)gtop_cpu;
    mPreviousUserTime = cpu->user;
    mPreviousSystemTime = cpu->sys;
    mPreviousNiceTime = cpu->nice;
    mPreviousIdleTime = cpu->idle;
    mPreviousIOWaitTime = cpu->iowait + cpu->irq + cpu->softirq;
}

#endif /* HAVE_LIBGTOP */
clCPU::clCPU()
    : mPreviousUserTime(0)
    , mPreviousNiceTime(0)
    , mPreviousSystemTime(0)
    , mPreviousIdleTime(0)
    , mPreviousIOWaitTime(0)
{
#ifdef HAVE_LIBGTOP
    glibtop_cpu cpu;
    glibtop_init();
    glibtop_get_cpu(&cpu);
    setPreviousCPUTime(&cpu);
#elif defined(XP_WIN)
    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);
    mPreviousUserTime = FILETIME_TO_UINT64(userTime);
    mPreviousSystemTime = FILETIME_TO_UINT64(kernelTime);
    mPreviousIdleTime = FILETIME_TO_UINT64(idleTime);
    mPreviousNiceTime = 0;
    mPreviousIOWaitTime = 0;
#elif defined(XP_MACOSX)
    natural_t nProcessors;
    mach_msg_type_number_t nProcessorInfos;
    processor_cpu_load_info_data_t *processorInfos;

    if (host_processor_info(mach_host_self(),
                            PROCESSOR_CPU_LOAD_INFO,
                            &nProcessors,
                            (processor_info_array_t*)&processorInfos,
                            &nProcessorInfos)) {
        return;
    }

    for (unsigned int i = 0; i < nProcessors; i++) {
        mPreviousUserTime += processorInfos[i].cpu_ticks[CPU_STATE_USER];
        mPreviousNiceTime += processorInfos[i].cpu_ticks[CPU_STATE_NICE];
        mPreviousSystemTime += processorInfos[i].cpu_ticks[CPU_STATE_SYSTEM];
        mPreviousIdleTime += processorInfos[i].cpu_ticks[CPU_STATE_IDLE];
    }
#endif
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

    guint64 user = cpu.user - mPreviousUserTime;
    guint64 system = cpu.sys - mPreviousSystemTime;
    guint64 nice = cpu.nice - mPreviousNiceTime;
    guint64 idle = cpu.idle - mPreviousIdleTime;
    guint64 io_wait = cpu.iowait + cpu.irq + cpu.softirq - mPreviousIOWaitTime;

    guint64 total = user + system + nice + idle + io_wait;

    *result = new clCPUTime((double)user / total,
                            (double)nice / total,
                            (double)system / total,
                            (double)idle / total,
                            (double)io_wait / total);

    NS_ADDREF(*result);
    setPreviousCPUTime(&cpu);
    return NS_OK;
#elif defined(XP_WIN)
    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);

    UINT64 user = FILETIME_TO_UINT64(userTime) - mPreviousUserTime;
    UINT64 kernel = FILETIME_TO_UINT64(kernelTime) - mPreviousSystemTime;
    UINT64 idle = FILETIME_TO_UINT64(idleTime) - mPreviousIdleTime;

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

    mPreviousUserTime = FILETIME_TO_UINT64(userTime);
    mPreviousSystemTime = FILETIME_TO_UINT64(kernelTime);
    mPreviousIdleTime = FILETIME_TO_UINT64(idleTime);

    *result = new clCPUTime((double)0.0f,
                            (double)0.0f,
                            (double)kernel / total,
                            (double)idle / total,
                            (double)0.0f);

    NS_ADDREF(*result);

    return NS_OK;
#elif defined(XP_MACOSX)
    natural_t nProcessors;
    mach_msg_type_number_t nProcessorInfos;
    processor_cpu_load_info_data_t *processorInfos;

    if (host_processor_info(mach_host_self(),
                            PROCESSOR_CPU_LOAD_INFO,
                            &nProcessors,
                            (processor_info_array_t*)&processorInfos,
                            &nProcessorInfos)) {
        return NS_ERROR_FAILURE;
    }

    PRUint64 currentUser = 0;
    PRUint64 currentNice = 0;
    PRUint64 currentSystem = 0;
    PRUint64 currentIdle = 0;

    for (unsigned int i = 0; i < nProcessors; i++) {
        currentUser += processorInfos[i].cpu_ticks[CPU_STATE_USER];
        currentNice += processorInfos[i].cpu_ticks[CPU_STATE_NICE];
        currentSystem += processorInfos[i].cpu_ticks[CPU_STATE_SYSTEM];
        currentIdle += processorInfos[i].cpu_ticks[CPU_STATE_IDLE];
    }

    PRUint64 user, nice, system, idle, total;
    user = currentUser - mPreviousUserTime;
    nice = currentNice - mPreviousNiceTime;
    system = currentSystem - mPreviousSystemTime;
    idle = currentIdle - mPreviousIdleTime;

    mPreviousUserTime = currentUser;
    mPreviousNiceTime = currentNice;
    mPreviousSystemTime = currentSystem;
    mPreviousIdleTime = currentIdle;

    total = user + nice + system + idle;

    *result = new clCPUTime((double)user / total,
                            (double)nice / total,
                            (double)system / total,
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
