#include "clCPU.h"
#include "clCPUTime.h"

#include <windows.h>
#undef GetCurrentTime /* CAUTION! Use GetTickCount instead of GetCurrentTime*/
#undef AddMonitor /* CAUTION! Use AddMonitorW instead */
#define FILETIME_TO_UINT64(v) (v.dwLowDateTime + ((UINT64)v.dwHighDateTime << 32))

CL_CPUTime
CL_GetCPUTime()
{
    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);

    CL_CPUTime info = {
        FILETIME_TO_UINT64(userTime),   // userTime
        FILETIME_TO_UINT64(kernelTime), // systemTime,
        0,                              // niceTime
        FILETIME_TO_UINT64(idleTime),   // idleTime
        0                               // IOWaitTime
    };
    return info;
}

CL_CPUTime
CL_GetCPUTime(CL_CPUTime *aPrevious, clICPUTime **aCPUTime)
{
    CL_CPUTime current = CL_GetCPUTime();

    UINT64 user = current.userTime - aPrevious->userTime;
    UINT64 kernel = current.systemTime - aPrevious->systemTime;
    UINT64 idle = current.idleTime - aPrevious->idleTime;

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

    if (total == 0) {
        *aCPUTime = new clCPUTime(0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    } else {
        *aCPUTime = new clCPUTime((double)0.0f,
                                  (double)0.0f,
                                  (double)kernel / total,
                                  (double)idle / total,
                                  (double)0.0f);
    }

    NS_ADDREF(*aCPUTime);
    return current;
}
