#include "clCPU.h"
#include "clCPUTime.h"

#include <windows.h>
#include <winternl.h>
#undef GetCurrentTime /* CAUTION! Use GetTickCount instead of GetCurrentTime*/
#undef AddMonitor /* CAUTION! Use AddMonitorW instead */
#define FILETIME_TO_UINT64(v) (v.dwLowDateTime + ((UINT64)v.dwHighDateTime << 32))
#define LARGE_INTEGER_TO_UINT64(v) (v.QuadPart)

const PRUnichar kNTLibraryName[] = L"ntdll.dll";
const unsigned int MAX_CPU_COUNT = 32;

nsresult
clCPU::InitInternal()
{
    mNTDLL = ::LoadLibraryW(kNTLibraryName);
    mNtQuerySystemInformation = (NtQuerySystemInformationPtr)
                                GetProcAddress(mNTDLL, "NtQuerySystemInformation");
    return NS_OK;
}

nsresult
clCPU::DestroyInternal()
{
    FreeLibrary(mNTDLL);
    mNTDLL = nsnull;
    mNtQuerySystemInformation = nsnull;
    return NS_OK;
}

/**
 * Fallback: this returns the total usage of all CPUs.
 */
nsAutoVoidArray*
GetCPUTimeInfoArrayTotal()
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

nsAutoVoidArray*
clCPU::GetCPUTimeInfoArray()
{
    SYSTEM_BASIC_INFORMATION system_basic_info;
    if (FAILED((*mNtQuerySystemInformation)(SystemBasicInformation,
                                            &system_basic_info,
                                            sizeof system_basic_info,
                                            0))) {
        return GetCPUTimeInfoArrayTotal();
    }

    unsigned int cpuCount = system_basic_info.NumberOfProcessors;

    SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION performance_info[MAX_CPU_COUNT];
    if (FAILED((*mNtQuerySystemInformation)(SystemProcessorPerformanceInformation,
                                            &performance_info,
                                            sizeof performance_info,
                                            0))) {
        return GetCPUTimeInfoArrayTotal();
    }

    nsAutoVoidArray *array = new nsAutoVoidArray();

    for (unsigned int i = 0; i < cpuCount; i++) {
        CL_CPUTimeInfo *info = new CL_CPUTimeInfo(
            LARGE_INTEGER_TO_UINT64(performance_info[i].UserTime),   // userTime
            LARGE_INTEGER_TO_UINT64(performance_info[i].KernelTime), // systemTime,
            0,                                                       // niceTime
            LARGE_INTEGER_TO_UINT64(performance_info[i].IdleTime),   // idleTime
            0                                                        // IOWaitTime
        );
        array->AppendElement(info);
    }

    return array;
}

nsresult
clCPU::GetCPUTime(CL_CPUTimeInfo *aPrevious, CL_CPUTimeInfo *aCurrent, clICPUTime **aCPUTime)
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
