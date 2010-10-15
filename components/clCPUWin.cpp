#include "clCPU.h"
#include "clCPUTime.h"

#include <windows.h>
#undef GetCurrentTime /* CAUTION! Use GetTickCount instead of GetCurrentTime*/
#undef AddMonitor /* CAUTION! Use AddMonitorW instead */
#define FILETIME_TO_UINT64(v) (v.dwLowDateTime + ((UINT64)v.dwHighDateTime << 32))

nsAutoVoidArray*
CL_GetCPUTimeInfoArray()
{
    nsAutoVoidArray *array = new nsAutoVoidArray();

    FILETIME idleTime, kernelTime, userTime;
    GetSystemTimes(&idleTime, &kernelTime, &userTime);

    CL_CPUTimeInfo *info = new CL_CPUTimeInfo(
        FILETIME_TO_UINT64(userTime),   // userTime
        FILETIME_TO_UINT64(kernelTime), // systemTime,
        0,                              // niceTime
        FILETIME_TO_UINT64(idleTime),   // idleTime
        0                               // IOWaitTime
    );
    array->AppendElement(info);

    return array;
}

nsresult
CL_GetCPUTime(CL_CPUTimeInfo *aPrevious, CL_CPUTimeInfo *aCurrent, clICPUTime **aCPUTime)
{
    UINT64 user = aCurrent->userTime - aPrevious->userTime;
    UINT64 kernel = aCurrent->systemTime - aPrevious->systemTime;
    UINT64 idle = aCurrent->idleTime - aPrevious->idleTime;

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
    return NS_OK;
}
