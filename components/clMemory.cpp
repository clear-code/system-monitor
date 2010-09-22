#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop/mem.h>
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

/* readonly attribute PRUint64 virtualUsed; */
NS_IMETHODIMP clMemory::GetVirtualUsed(PRUint64 *aVirtualUsed)
{
#ifdef HAVE_LIBGTOP2
    return NS_ERROR_NOT_IMPLEMENTED;
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
