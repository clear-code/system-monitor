#include "clCPUTime.h"

NS_IMPL_ISUPPORTS1(clCPUTime, clICPUTime)

clCPUTime::clCPUTime(float aUser, float aNice, float aSystem, float aIdle, float aIOWait)
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

/* readonly attribute float user; */
NS_IMETHODIMP clCPUTime::GetUser(float *aUser)
{
    *aUser = mUser;
    return NS_OK;
}

/* readonly attribute float nice; */
NS_IMETHODIMP clCPUTime::GetNice(float *aNice)
{
    *aNice = mNice;
    return NS_OK;
}

/* readonly attribute float system; */
NS_IMETHODIMP clCPUTime::GetSystem(float *aSystem)
{
    *aSystem = mSystem;
    return NS_OK;
}

/* readonly attribute float idle; */
NS_IMETHODIMP clCPUTime::GetIdle(float *aIdle)
{
    *aIdle = mIdle;
    return NS_OK;
}

/* readonly attribute float io_wait; */
NS_IMETHODIMP clCPUTime::GetIo_wait(float *aIOWait)
{
    *aIOWait = mIOWait;
    return NS_OK;
}

