#include "clCPUTime.h"

NS_IMPL_ISUPPORTS1(clCPUTime, clICPUTime)

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

/* readonly attribute double user; */
NS_IMETHODIMP clCPUTime::GetUser(double *aUser)
{
    *aUser = mUser;
    return NS_OK;
}

/* readonly attribute double nice; */
NS_IMETHODIMP clCPUTime::GetNice(double *aNice)
{
    *aNice = mNice;
    return NS_OK;
}

/* readonly attribute double system; */
NS_IMETHODIMP clCPUTime::GetSystem(double *aSystem)
{
    *aSystem = mSystem;
    return NS_OK;
}

/* readonly attribute double idle; */
NS_IMETHODIMP clCPUTime::GetIdle(double *aIdle)
{
    *aIdle = mIdle;
    return NS_OK;
}

/* readonly attribute double io_wait; */
NS_IMETHODIMP clCPUTime::GetIo_wait(double *aIOWait)
{
    *aIOWait = mIOWait;
    return NS_OK;
}

