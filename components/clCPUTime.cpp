#include "clCPUTime.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

clCPUTime::clCPUTime()
    : mUser(0),
      mNice(0),
      mSystem(0),
      mIdle(0),
      mIOWait(0)
{
}

clCPUTime::clCPUTime(double aUser, double aNice, double aSystem, double aIdle, double aIOWait)
    : mUser(aUser),
      mNice(aNice),
      mSystem(aSystem),
      mIdle(aIdle),
      mIOWait(aIOWait)
{
}

clCPUTime::~clCPUTime()
{
}

NS_IMPL_CLASSINFO(clCPUTime, NULL, 0, CL_CPU_TIME_CID)
NS_IMPL_ISUPPORTS2_CI(clCPUTime,
                      clICPUTime,
                      nsISecurityCheckedComponent)

/* readonly attribute double user; */
NS_IMETHODIMP
clCPUTime::GetUser(double *aUser)
{
    *aUser = mUser;
    return NS_OK;
}

/* readonly attribute double nice; */
NS_IMETHODIMP
clCPUTime::GetNice(double *aNice)
{
    *aNice = mNice;
    return NS_OK;
}

/* readonly attribute double system; */
NS_IMETHODIMP
clCPUTime::GetSystem(double *aSystem)
{
    *aSystem = mSystem;
    return NS_OK;
}

/* readonly attribute double idle; */
NS_IMETHODIMP
clCPUTime::GetIdle(double *aIdle)
{
    *aIdle = mIdle;
    return NS_OK;
}

/* readonly attribute double io_wait; */
NS_IMETHODIMP
clCPUTime::GetIo_wait(double *aIOWait)
{
    *aIOWait = mIOWait;
    return NS_OK;
}

static char *
cloneAllAccessString (void)
{
    static const char allAccessString[] = "allAccess";
    return (char*)nsMemory::Clone(allAccessString, sizeof(allAccessString));
}

NS_IMETHODIMP
clCPUTime::CanCreateWrapper(const nsIID * iid, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPUTime::CanCallMethod(const nsIID * iid, const PRUnichar *methodName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPUTime::CanGetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clCPUTime::CanSetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}
