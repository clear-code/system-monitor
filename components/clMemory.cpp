#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

NS_IMPL_ISUPPORTS1_CI(clMemory, clIMemory)

clMemory::clMemory()
{
  /* member initializers and constructor code */
}

clMemory::~clMemory()
{
  /* destructor code */
}

/* readonly attribute PRUint64 total; */
NS_IMETHODIMP clMemory::GetTotal(PRUint64 *aTotal)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 used; */
NS_IMETHODIMP clMemory::GetUsed(PRUint64 *aUsed)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 free; */
NS_IMETHODIMP clMemory::GetFree(PRUint64 *aFree)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 shared; */
NS_IMETHODIMP clMemory::GetShared(PRUint64 *aShared)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 buffer; */
NS_IMETHODIMP clMemory::GetBuffer(PRUint64 *aBuffer)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 cached; */
NS_IMETHODIMP clMemory::GetCached(PRUint64 *aCached)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 user; */
NS_IMETHODIMP clMemory::GetUser(PRUint64 *aUser)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute PRUint64 locked; */
NS_IMETHODIMP clMemory::GetLocked(PRUint64 *aLocked)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

