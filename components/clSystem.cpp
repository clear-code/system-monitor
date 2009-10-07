#include <jsapi.h>
#include <nsIScriptGlobalObject.h>

#include "clSystem.h"

clSystem::clSystem()
    : mScriptObject(nsnull)
{
}

clSystem::~clSystem()
{
}

static void
FinalizeJSSystemGlobal(JSContext *cx, JSObject *obj)
{
    nsISupports *nativeThis = (nsISupports*)JS_GetPrivate(cx, obj);

    if (nsnull != nativeThis) {
        // get the js object
        nsIScriptObjectOwner *owner = nsnull;
        if (NS_OK == nativeThis->QueryInterface(NS_GET_IID(nsIScriptObjectOwner),
                                                (void**)&owner)) {
            owner->SetScriptObject(nsnull);
            NS_RELEASE(owner);
        }

        // The addref was part of JSObject construction
        NS_RELEASE(nativeThis);
    }
}

NS_IMPL_THREADSAFE_ISUPPORTS2(clSystem,
                              nsIScriptObjectOwner,
                              clISystem)

JSClass JSSystemGlobalClass = {
  "System",
  JSCLASS_HAS_PRIVATE,
  JS_PropertyStub,
  JS_PropertyStub,
  JS_PropertyStub,
  JS_PropertyStub,
  JS_EnumerateStub,
  JS_ResolveStub,
  JS_ConvertStub,
  FinalizeJSSystemGlobal
};

static JSFunctionSpec JSSystemGlobalMethods[] =
{
  {nsnull,nsnull,0,0,0}
};

static nsresult
InitJSSystemGlobalClass(nsIScriptContext *aContext, void **aPrototype)
{
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    JSObject *proto = nsnull;
    JSObject *constructor = nsnull;
    JSObject *global = JS_GetGlobalObject(jscontext);
    jsval vp;

    if ((PR_TRUE != JS_LookupProperty(jscontext, global, "JSSystemGlobal", &vp)) ||
        !JSVAL_IS_OBJECT(vp) ||
        ((constructor = JSVAL_TO_OBJECT(vp)) == nsnull) ||
        (PR_TRUE != JS_LookupProperty(jscontext, JSVAL_TO_OBJECT(vp), "prototype", &vp)) ||
        !JSVAL_IS_OBJECT(vp)) {
        proto = JS_InitClass(jscontext,
                             global,
                             nsnull,
                             &JSSystemGlobalClass,
                             nsnull,
                             nsnull,
                             nsnull,
                             nsnull,
                             nsnull,
                             JSSystemGlobalMethods);


        if (nsnull == proto)
            return NS_ERROR_FAILURE;
    } else if ((nsnull != constructor) && JSVAL_IS_OBJECT(vp)) {
        proto = JSVAL_TO_OBJECT(vp);
    } else {
        return NS_ERROR_FAILURE;
    }

    if (aPrototype)
        *aPrototype = proto;

    return NS_OK;
}


NS_IMETHODIMP
clSystem::GetScriptObject(nsIScriptContext *aContext, void** aScriptObject)
{
    if (!mScriptObject) {
        nsresult rv;
        JSObject *proto;
        JSObject *parent = nsnull;
        JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
        nsISupports *aParent = aContext->GetGlobalObject();
        nsCOMPtr<nsIScriptObjectOwner> owner(do_QueryInterface(aParent));
        if (owner) {
            nsresult rv = owner->GetScriptObject(aContext, (void **)&parent);
            NS_ENSURE_SUCCESS(rv, rv);
        } else {
            nsCOMPtr<nsIScriptGlobalObject> sgo(do_QueryInterface(aParent, &rv));
            NS_ENSURE_SUCCESS(rv, rv);
            parent = sgo->GetGlobalJSObject();
        }

        rv = InitJSSystemGlobalClass(aContext, (void **)&proto);
        NS_ENSURE_SUCCESS(rv, rv);
        mScriptObject = JS_NewObject(jscontext, &JSSystemGlobalClass, proto, parent);
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

/* readonly attribute double clock; */
NS_IMETHODIMP
clSystem::GetClock(double *aClock)
{
    *aClock = 0.0;
    return NS_OK;
}
