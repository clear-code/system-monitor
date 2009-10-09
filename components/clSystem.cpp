#include <jsapi.h>
#include <nsIScriptGlobalObject.h>

#include "clCPU.h"
#include "clSystem.h"
#include "clISystem.h"

clSystem::clSystem()
    : mCPU(nsnull),
      mScriptObject(nsnull)
{
}

clSystem::~clSystem()
{
    delete mCPU;
}

static void
FinalizeJSSystem(JSContext *cx, JSObject *obj)
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
    "system",
    JSCLASS_HAS_PRIVATE,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_EnumerateStub,
    JS_ResolveStub,
    JS_ConvertStub,
    FinalizeJSSystem
};

static clISystem *
getNative(JSContext *cx, JSObject *obj)
{
    if (!JS_InstanceOf(cx, obj, &JSSystemGlobalClass, nsnull))
        return nsnull;

    return (clISystem*)JS_GetPrivate(cx, obj);
}

static JSBool
clock(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    jsdouble value;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    nativeThis->GetClock(&value);

    *rval = DOUBLE_TO_JSVAL(&value);

    return JS_TRUE;
}

static JSBool
getCPU(JSContext *cx, JSObject *obj, jsval id, jsval *rval)
{
    clICPU *cpu;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    *rval = JSVAL_ONE;
    nativeThis->GetCpu(&cpu);
    *rval = OBJECT_TO_JSVAL(cpu);

    return JS_TRUE;
}

static JSFunctionSpec JSSystemMethods[] = {
    {"clock", clock, 0, 0, 0},
    JS_FS_END
};

static JSPropertySpec JSSystemProperties[] = {
    {"cpu", -1, JSPROP_READONLY | JSPROP_PERMANENT | JSPROP_SHARED, getCPU, nsnull},
    {nsnull, 0, 0, nsnull, nsnull}
};

static nsresult
InitJSSystemGlobalClass(nsIScriptContext *aContext, void **aPrototype)
{
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    JSObject *proto = nsnull;
    JSObject *constructor = nsnull;
    JSObject *global = JS_GetGlobalObject(jscontext);
    jsval vp;

    if ((PR_TRUE != JS_LookupProperty(jscontext, global, "system", &vp)) ||
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
                             JSSystemProperties,
                             JSSystemMethods);


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
        clISystem *system;

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
        rv = CallQueryInterface(this, &system);
        NS_ENSURE_SUCCESS(rv, rv);

        mScriptObject = JS_NewObject(jscontext, &JSSystemGlobalClass, proto, parent);
        if (!mScriptObject) {
            NS_RELEASE(system);
            return NS_ERROR_FAILURE;
        }
        JS_SetGlobalObject(jscontext, (JSObject *)mScriptObject);
        JS_SetPrivate(jscontext, (JSObject *)mScriptObject, system);
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

/* readonly attribute clICPU cpu; */
NS_IMETHODIMP
clSystem::GetCpu(clICPU * *aCPU)
{
    if (!mCPU)
        mCPU = new clCPU();

    *aCPU = mCPU;
    NS_ADDREF(*aCPU);

    return NS_OK;
}

/* readonly attribute double clock; */
NS_IMETHODIMP
clSystem::GetClock(double *aClock)
{
    *aClock = 0.0;
    return NS_OK;
}

