#include "clSystem.h"

#include <jsapi.h>
#include <nsIScriptGlobalObject.h>
#include <nsIXPConnect.h>
#include <nsIClassInfoImpl.h>
#include <nsServiceManagerUtils.h>

#include "clISystem.h"
#include "clICPU.h"
#include "clCPU.h"

clSystem::clSystem()
     : mCPU(nsnull)
     , mScriptObject(nsnull)
{
}

clSystem::~clSystem()
{
    if (mCPU)
        delete mCPU;
}

clSystem * clSystem::gSystem = nsnull;

clSystem *
clSystem::GetInstance()
{
    if (!clSystem::gSystem) {
        clSystem::gSystem = new clSystem();
	clSystem::gSystem->Init();
    }

    return clSystem::gSystem;
}

clSystem *
clSystem::GetService()
{
    clSystem *system = clSystem::GetInstance();
    NS_IF_ADDREF(system);

    return system;
}

nsresult
clSystem::Init()
{
    mCPU = new clCPU();

    return NS_OK;
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

JSClass JSSystemClass = {
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
    if (!JS_InstanceOf(cx, obj, &JSSystemClass, nsnull))
        return nsnull;

    return (clISystem*)JS_GetPrivate(cx, obj);
}

static JSBool
cpu(JSContext *cx, JSObject *obj, jsval id, jsval *rval)
{
    nsresult rv;
    clSystem *system;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    system = static_cast<clSystem*>(nativeThis);
    nsCOMPtr<nsIXPConnect> xpc = do_GetService(nsIXPConnect::GetCID(), &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    nsCOMPtr<nsIXPConnectJSObjectHolder> wrapper;
    xpc->WrapNative(cx, obj, system->mCPU,
                    NS_GET_IID(clICPU),
                    getter_AddRefs(wrapper));

    if (!wrapper) {
        *rval = JSVAL_ZERO;
        return JS_FALSE;
    }

    JSObject* wrapper_jsobj = nsnull;
    wrapper->GetJSObject(&wrapper_jsobj);

    *rval = OBJECT_TO_JSVAL(wrapper_jsobj);

    return JS_TRUE;
}

static JSPropertySpec JSSystemProperties[] = {
    {"cpu", -1, JSPROP_READONLY | JSPROP_PERMANENT | JSPROP_SHARED, cpu, NULL},
    {0}
};

static nsresult
InitJSSystemClass(nsIScriptContext *aContext, void **aPrototype)
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
                             &JSSystemClass,
                             nsnull,
                             nsnull,
                             nsnull,
                             nsnull,
                             JSSystemProperties,
                             nsnull);

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

        rv = InitJSSystemClass(aContext, (void **)&proto);
        NS_ENSURE_SUCCESS(rv, rv);
        rv = CallQueryInterface(this, &system);
        NS_ENSURE_SUCCESS(rv, rv);

        mScriptObject = JS_NewObject(jscontext, &JSSystemClass, proto, parent);
        if (!mScriptObject) {
            NS_RELEASE(system);
            return NS_ERROR_FAILURE;
        }
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
    *aCPU = mCPU;
    NS_ADDREF(*aCPU);

    return NS_OK;
}

