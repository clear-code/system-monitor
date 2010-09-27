#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop/mem.h>
#elif defined(XP_WIN)
#include <windows.h>
#endif

NS_IMPL_ISUPPORTS2_CI(clMemory,
                      clIMemory,
                      nsISecurityCheckedComponent)

clMemory::clMemory()
{
  /* member initializers and constructor code */
#ifdef HAVE_LIBGTOP2
  glibtop_mem memory;
  glibtop_get_mem(&memory);

  mTotal = memory.total;
  mUsed = memory.used - memory.cached;
  mFree = mTotal - mUsed;
#elif defined(XP_WIN)
  MEMORYSTATUSEX memory;
  memory.dwLength=sizeof(memory);
  GlobalMemoryStatusEx(&memory);

  mTotal = memory.ullTotalPhys;
  mFree = memory.ullAvailPhys;
  mUsed = mTotal - mFree;
  mVirtualUsed = memory.ullTotalVirtual - memory.ullAvailVirtual;
#endif
}

clMemory::~clMemory()
{
  /* destructor code */
}

/* readonly attribute PRUint64 total; */
NS_IMETHODIMP clMemory::GetTotal(PRUint64 *aTotal)
{
#if defined(HAVE_LIBGTOP2) || defined(XP_WIN)
    *aTotal = mTotal;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 used; */
NS_IMETHODIMP clMemory::GetUsed(PRUint64 *aUsed)
{
#if defined(HAVE_LIBGTOP2) || defined(XP_WIN)
    *aUsed = mUsed;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 free; */
NS_IMETHODIMP clMemory::GetFree(PRUint64 *aFree)
{
#if defined(HAVE_LIBGTOP2) || defined(XP_WIN)
    *aFree = mFree;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 virtualUsed; */
NS_IMETHODIMP clMemory::GetVirtualUsed(PRUint64 *aVirtualUsed)
{
#ifdef XP_WIN
    *aVirtualUsed = mVirtualUsed;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

static char *
cloneAllAccessString (void)
{
    static const char allAccessString[] = "allAccess";
    return (char*)nsMemory::Clone(allAccessString, sizeof(allAccessString));
}

NS_IMETHODIMP
clMemory::CanCreateWrapper(const nsIID * iid, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanCallMethod(const nsIID * iid, const PRUnichar *methodName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanGetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanSetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}
