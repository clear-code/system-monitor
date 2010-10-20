#include "clCPU.h"

#include <nsComponentManagerUtils.h>
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


clCPU::clCPU()
     : mPreviousTimes(nsnull)
{
#ifdef XP_WIN
    InitInternal();
#endif
    mPreviousTimes = GetCPUTimeInfoArray();
}

clCPU::~clCPU()
{
    DestroyPreviousTimes();
#ifdef XP_WIN
    DestroyInternal();
#endif
}

NS_IMPL_ISUPPORTS2_CI(clCPU,
                      clICPU,
                      nsISecurityCheckedComponent)

void
clCPU::DestroyPreviousTimes()
{
    PRInt32 count = mPreviousTimes->Count();
    for (PRInt32 i = 0; i < count; i++) {
        CL_CPUTimeInfo *oneInfo = static_cast<CL_CPUTimeInfo*>(mPreviousTimes->ElementAt(i));
        delete oneInfo;
        mPreviousTimes->RemoveElementAt(i);
    }
    delete mPreviousTimes;
}

void
clCPU::SetPreviousTimes(nsAutoVoidArray *aCurrentTimes)
{
    DestroyPreviousTimes();
    mPreviousTimes = aCurrentTimes;
}

CL_CPUTimeInfo
clCPU::SumCPUTimeInfoArray(nsAutoVoidArray *aCPUTimeInfos)
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

NS_IMETHODIMP
clCPU::GetCurrentTime(clICPUTime **result NS_OUTPARAM)
{
    nsAutoVoidArray *currentTimes = GetCPUTimeInfoArray();
    CL_CPUTimeInfo currentTime = SumCPUTimeInfoArray(currentTimes);
    CL_CPUTimeInfo previousTime = SumCPUTimeInfoArray(mPreviousTimes);
    SetPreviousTimes(currentTimes);

    nsCOMPtr<clICPUTime> cpuTime;
    nsresult rv = GetCPUTime(&previousTime, &currentTime, getter_AddRefs(cpuTime));
    NS_ENSURE_SUCCESS(rv, rv);

    NS_ADDREF(*result = cpuTime);
    return rv;
}

nsTArray<clICPUTime*>
clCPU::GetCurrentCPUTimesArray()
{
    nsresult rv;

    nsTArray<clICPUTime*> cpuTimes;

    nsAutoVoidArray *currentTimes = GetCPUTimeInfoArray();
    PRInt32 count = currentTimes->Count();
    for (PRInt32 i = 0; i < count; i++) {
        CL_CPUTimeInfo *previousTime = static_cast<CL_CPUTimeInfo*>(mPreviousTimes->ElementAt(i));
        CL_CPUTimeInfo *currentTime = static_cast<CL_CPUTimeInfo*>(currentTimes->ElementAt(i));

        nsCOMPtr<clICPUTime> cpuTime;
        rv = GetCPUTime(previousTime, currentTime, getter_AddRefs(cpuTime));
        NS_ADDREF(cpuTime);
        cpuTimes.AppendElement(cpuTime);
    }

    SetPreviousTimes(currentTimes);

    return cpuTimes;
}

NS_IMETHODIMP
clCPU::GetCurrentTimes(nsIVariant **_retval NS_OUTPARAM)
{
    nsTArray<clICPUTime*> cpuTimes = GetCurrentCPUTimesArray();

    nsCOMPtr<nsIWritableVariant> value = do_CreateInstance("@mozilla.org/variant;1");
    nsresult rv = value->SetAsArray(nsIDataType::VTYPE_INTERFACE,
                                    &NS_GET_IID(clICPUTime),
                                    cpuTimes.Length(),
                                    const_cast<void*>(static_cast<const void*>(cpuTimes.Elements())));
    NS_ENSURE_SUCCESS(rv, rv);
    NS_ADDREF(*_retval = value);
    return rv;
}

NS_IMETHODIMP
clCPU::GetUsage(double *aUsage NS_OUTPARAM)
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
clCPU::GetUsages(nsIVariant **aUsages NS_OUTPARAM)
{
    nsTArray<clICPUTime*> cpuTimes = GetCurrentCPUTimesArray();
    nsTArray<double> usages;
    PRInt32 count = cpuTimes.Length();
    for (PRInt32 i = 0; i < count; i++) {
        double user, system;
        cpuTimes[i]->GetUser(&user);
        cpuTimes[i]->GetSystem(&system);
        usages.AppendElement(user + system);
    }

    nsCOMPtr<nsIWritableVariant> value = do_CreateInstance("@mozilla.org/variant;1");
    nsresult rv = value->SetAsArray(nsIDataType::VTYPE_DOUBLE,
                                    nsnull,
                                    count,
                                    const_cast<void*>(static_cast<const void*>(usages.Elements())));
    NS_ENSURE_SUCCESS(rv, rv);
    NS_ADDREF(*aUsages = value);

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
