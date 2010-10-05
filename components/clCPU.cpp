#include "clCPU.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>
#include <nsCOMPtr.h>

#include "clCPUTime.h"

clCPU::clCPU()
    : mPreviousTime(CL_GetCPUTime())
{
}

clCPU::~clCPU()
{
}

NS_IMPL_ISUPPORTS2_CI(clCPU,
                      clICPU,
                      nsISecurityCheckedComponent)

NS_IMETHODIMP
clCPU::GetCurrentTime(clICPUTime **result NS_OUTPARAM)
{
    nsCOMPtr<clICPUTime> cpuTime;
    CL_CPUTime current = CL_GetCPUTime(&mPreviousTime, getter_AddRefs(cpuTime));
    mPreviousTime = current;

    NS_ADDREF(*result = cpuTime);
    return NS_OK;
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
