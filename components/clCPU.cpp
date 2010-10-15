#include "clCPU.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>
#include <nsCOMPtr.h>

#include "clCPUTime.h"


CL_CPUTimeInfo::CL_CPUTimeInfo(PRUint64 user = 0,
                               PRUint64 system = 0,
                               PRUint64 nice = 0,
                               PRUint64 idle = 0,
                               PRUint64 IOWait = 0)
     : userTime(user)
     , systemTime(system)
     , niceTime(nice)
     , idleTime(idle)
     , IOWaitTime(IOWait)
{
}

CL_CPUTimeInfo::~CL_CPUTimeInfo()
{
}


CL_CPUTimeInfo
CL_SumCPUTimeInfoArray(nsAutoVoidArray *aCPUTimeInfos)
{
    CL_CPUTimeInfo info = CL_CPUTimeInfo();
    PRInt32 count = aCPUTimeInfos->Count();
    for (PRInt32 i = 0; i < count; i++) {
        CL_CPUTimeInfo *oneInfo = static_cast<CL_CPUTimeInfo*>(aCPUTimeInfos->ElementAt(i));
        info.userTime += oneInfo->userTime;
        info.systemTime += oneInfo->systemTime;
        info.niceTime += oneInfo->niceTime;
        info.idleTime += oneInfo->idleTime;
    }
    return info;
}


clCPU::clCPU()
     : mPreviousTimes(CL_GetCPUTimeInfoArray())
{
}

clCPU::~clCPU()
{
}

NS_IMPL_ISUPPORTS2_CI(clCPU,
                      clICPU,
                      nsISecurityCheckedComponent)

void
clCPU::UpdatePreviousTimes(nsAutoVoidArray *aCurrentTimes)
{
    PRInt32 count = mPreviousTimes->Count();
    for (PRInt32 i = 0; i < count; i++) {
        CL_CPUTimeInfo *oneInfo = static_cast<CL_CPUTimeInfo*>(mPreviousTimes->ElementAt(i));
        delete oneInfo;
        mPreviousTimes->RemoveElementAt(i);
    }
    delete mPreviousTimes;

    mPreviousTimes = aCurrentTimes;
}

NS_IMETHODIMP
clCPU::GetCurrentTime(clICPUTime **result NS_OUTPARAM)
{
    nsAutoVoidArray *currentTimes = CL_GetCPUTimeInfoArray();
    CL_CPUTimeInfo currentTime = CL_SumCPUTimeInfoArray(currentTimes);
    CL_CPUTimeInfo previousTime = CL_SumCPUTimeInfoArray(mPreviousTimes);
    UpdatePreviousTimes(currentTimes);

    nsCOMPtr<clICPUTime> cpuTime;
    nsresult rv = CL_GetCPUTime(&previousTime, &currentTime, getter_AddRefs(cpuTime));
    NS_ENSURE_SUCCESS(rv, rv);

    NS_ADDREF(*result = cpuTime);
    return rv;
}

NS_IMETHODIMP
clCPU::GetCurrentTimes(nsIVariant **_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
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

NS_IMETHODIMP
clCPU::GetUsages(nsIVariant * *aUsages)
{
    return NS_ERROR_NOT_IMPLEMENTED;
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
