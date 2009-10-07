#include "clSystem.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

clSystem::clSystem()
    : mScriptObject(nsnull)
{
}

clSystem::~clSystem()
{
}

//NS_IMPL_ISUPPORTS2_CI(clSystem,
//                      nsIScriptObjectOwner,
//                      clISystem)
NS_IMPL_ISUPPORTS2(clSystem,
                      nsIScriptObjectOwner,
                      clISystem)

#if 1
NS_IMETHODIMP
clSystem::GetScriptObject(nsIScriptContext *aContext, void** aScriptObject)
{
    if (!mScriptObject) {
        //NewScriptJSClSystem(aContext,
        //                    (clISystem*)this,
        //                    (nsISupports*)aContext->GetGlobalObject(),
        //                    &mScriptObject);
    }

    *aScriptObject = mScriptObject;
    return NS_OK;
}

NS_IMETHODIMP
clSystem::SetScriptObject(void* aScriptObject)
{
    mScriptObject = aScriptObject;
    return NS_OK;
}
#endif

/* readonly attribute double clock; */
NS_IMETHODIMP
clSystem::GetClock(double *aClock)
{
    *aClock = 0.0;
    return NS_OK;
}
