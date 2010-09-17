#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop/mem.h>
#endif

NS_IMPL_ISUPPORTS1_CI(clMemory, clIMemory)

clMemory::clMemory()
{
  /* member initializers and constructor code */
#ifdef HAVE_LIBGTOP2
  glibtop_mem memory;
  glibtop_get_mem(&memory);

  mTotal = memory.total;
  mUsed = memory.used;
  mShared = memory.shared;
  mBuffer = memory.buffer;
  mCached = memory.cached;
  mUser = memory.user;
  mLocked = memory.locked;
#endif
}

clMemory::~clMemory()
{
  /* destructor code */
}

/* readonly attribute PRUint64 total; */
NS_IMETHODIMP clMemory::GetTotal(PRUint64 *aTotal)
{
#ifdef HAVE_LIBGTOP2    
    *aTotal = mTotal;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 used; */
NS_IMETHODIMP clMemory::GetUsed(PRUint64 *aUsed)
{
#ifdef HAVE_LIBGTOP2
    *aUsed = mUsed;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 free; */
NS_IMETHODIMP clMemory::GetFree(PRUint64 *aFree)
{
#ifdef HAVE_LIBGTOP2
    *aFree = mFree;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 shared; */
NS_IMETHODIMP clMemory::GetShared(PRUint64 *aShared)
{
#ifdef HAVE_LIBGTOP2
    *aShared = mShared;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 buffer; */
NS_IMETHODIMP clMemory::GetBuffer(PRUint64 *aBuffer)
{
#ifdef HAVE_LIBGTOP2
    *aBuffer = mBuffer;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 cached; */
NS_IMETHODIMP clMemory::GetCached(PRUint64 *aCached)
{
#ifdef HAVE_LIBGTOP2
    *aCached = mCached;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 user; */
NS_IMETHODIMP clMemory::GetUser(PRUint64 *aUser)
{
#ifdef HAVE_LIBGTOP2
    *aUser = mUser;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 locked; */
NS_IMETHODIMP clMemory::GetLocked(PRUint64 *aLocked)
{
#ifdef HAVE_LIBGTOP2
    *aLocked = mLocked;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

