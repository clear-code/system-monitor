#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

NS_IMPL_ISUPPORTS2_CI(clMemory,
                      clIMemory,
                      nsISecurityCheckedComponent)

clMemory::clMemory()
    : mMemory(CL_GetMemory())
{
}

clMemory::~clMemory()
{
}

/* readonly attribute PRUint64 total; */
NS_IMETHODIMP clMemory::GetTotal(PRUint64 *aTotal)
{
    *aTotal = mMemory.total;
    return aTotal < 0 ? NS_ERROR_NOT_IMPLEMENTED : NS_OK;
}

/* readonly attribute PRUint64 used; */
NS_IMETHODIMP clMemory::GetUsed(PRUint64 *aUsed)
{
    *aUsed = mMemory.used;
    return aUsed < 0 ? NS_ERROR_NOT_IMPLEMENTED : NS_OK;
}

/* readonly attribute PRUint64 free; */
NS_IMETHODIMP clMemory::GetFree(PRUint64 *aFree)
{
    *aFree = mMemory.free;
    return aFree < 0 ? NS_ERROR_NOT_IMPLEMENTED : NS_OK;
}

/* readonly attribute PRUint64 virtualUsed; */
NS_IMETHODIMP clMemory::GetVirtualUsed(PRUint64 *aVirtualUsed)
{
    *aVirtualUsed = mMemory.virtualUsed;
    return aVirtualUsed < 0 ? NS_ERROR_NOT_IMPLEMENTED : NS_OK;
}

/* readonly attribute PRUint64 self; */
NS_IMETHODIMP clMemory::GetSelf(PRUint64 *aSelf)
{
    *aSelf = mMemory.self;
    return aSelf < 0 ? NS_ERROR_NOT_IMPLEMENTED : NS_OK;
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
