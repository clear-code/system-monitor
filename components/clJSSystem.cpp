#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clSystem.h"

#include <jsapi.h>
#include <nscore.h>
#include <nsIXPConnect.h>
#include <nsIScriptContext.h>
#include <nsIScriptObjectOwner.h>
#include <nsIScriptGlobalObject.h>
#include <nsDOMJSUtils.h>
#include <nsIComponentManager.h>
#include <nsServiceManagerUtils.h>
#include <nsIDOMWindow.h>
#include <nsPIDOMWindow.h>

static nsresult
ConvertJSValToStr(JSContext *aContext, jsval aValue, nsString& aString)
{
    JSString *jsstring;

    if (!JSVAL_IS_NULL(aValue) &&
        (jsstring = JS_ValueToString(aContext, aValue)) != nsnull) {
        aString.Assign(reinterpret_cast<const PRUnichar*>(JS_GetStringChars(jsstring)));
        return NS_OK;
    }
    else {
        aString.Truncate();
        return NS_ERROR_FAILURE;
    }
}

static nsresult
ConvertJSValToSupports(JSContext *aContext, jsval aValue, nsISupports **aSupports)
{
    nsresult rv;
    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    if (NS_FAILED(rv))
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsIVariant> variant;
    rv = xpc->JSToVariant(aContext, aValue, getter_AddRefs(variant));
    if (NS_FAILED(rv) || !variant)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsISupports> supports;
    rv = variant->GetAsISupports(getter_AddRefs(supports));
    if (NS_FAILED(rv) || !supports)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aSupports = supports);
    return NS_OK;
}

static nsresult
ConvertJSValToMonitor(JSContext *aContext, jsval aValue, clISystemMonitor **aMonitor)
{
    nsCOMPtr<nsISupports> supports;
    nsresult rv = ConvertJSValToSupports(aContext, aValue, getter_AddRefs(supports));
    if (NS_FAILED(rv) || !supports)
        return NS_ERROR_FAILURE;

    nsCOMPtr<clISystemMonitor> monitor(do_QueryInterface(supports));
    if (!monitor)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aMonitor = monitor);
    return NS_OK;
}

static nsresult
ConvertJSValToWindow(JSContext *aContext, jsval aValue, nsIDOMWindow **aWindow)
{
    nsCOMPtr<nsISupports> supports;
    nsresult rv = ConvertJSValToSupports(aContext, aValue, getter_AddRefs(supports));
    if (NS_FAILED(rv) || !supports)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsIDOMWindow> window(do_QueryInterface(supports));
    if (!window)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aWindow = window);
    return NS_OK;
}

static nsresult
GetGlobalFromContext(JSContext *aContext, nsIDOMWindow **aGlobal)
{
    nsIScriptGlobalObject *globalObject = nsnull;
    nsIScriptContext *scriptContext = GetScriptContextFromJSContext(aContext);
    if (scriptContext)
        globalObject = scriptContext->GetGlobalObject();

    if (!globalObject)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsIDOMWindow> window(do_QueryInterface(globalObject));
    if (!window)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aGlobal = window);
    return NS_OK;
}

static void
FinalizeSystem(JSContext *cx, JSObject *obj);

JSClass SystemClass = {
    "System",
    JSCLASS_HAS_PRIVATE,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_EnumerateStub,
    JS_ResolveStub,
    JS_ConvertStub,
    FinalizeSystem
};

static void
FinalizeSystem(JSContext *cx, JSObject *obj)
{
    nsISupports *nativeThis = (nsISupports*)JS_GetPrivate(cx, obj);

    if (nativeThis) {
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

static JSBool
CreateNativeObject(JSContext *cx, JSObject *obj, clISystem **aResult)
{
    nsresult rv;
    nsIScriptObjectOwner *owner = nsnull;
    clISystem *nativeThis;

    static NS_DEFINE_CID(kCL_SYSTEM_CID, CL_SYSTEM_CID);

    rv = CallCreateInstance(kCL_SYSTEM_CID, &nativeThis);
    if (NS_FAILED(rv))
        return JS_FALSE;

    rv = nativeThis->QueryInterface(NS_GET_IID(nsIScriptObjectOwner),
                                    (void **)&owner);

    if (NS_FAILED(rv)) {
        NS_RELEASE(nativeThis);
        return JS_FALSE;
    }

    owner->SetScriptObject((void *)obj);
    JS_SetPrivate(cx, obj, nativeThis);

    *aResult = nativeThis;

    NS_RELEASE(nativeThis);  // we only want one refcnt. JSUtils cleans us up.
    return JS_TRUE;
}

static clISystem*
getNative(JSContext *cx, JSObject *obj)
{
    if (!JS_InstanceOf(cx, obj, &SystemClass, nsnull))
      return nsnull;

    clISystem *native = (clISystem*)JS_GetPrivate(cx, obj);
    if (!native) {
        CreateNativeObject(cx, obj, &native);
    }
    return native;
}

static JSBool
SystemGetCpu(JSContext *cx, JSObject *obj, jsid idval, jsval *rval)
{
    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    nsCOMPtr<clICPU> cpu;
    rv = nativeThis->GetCpu(getter_AddRefs(cpu));
    if (NS_FAILED(rv))
        return JS_FALSE;

    nsCOMPtr<nsIWritableVariant> variant = do_CreateInstance("@mozilla.org/variant;1");
    const nsIID iid = cpu->GetIID();
    variant->SetAsInterface(iid, cpu);

    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    if (NS_FAILED(rv))
        return JS_FALSE;

    nsCOMPtr<nsIVariant> returnedVariant(do_QueryInterface(variant));
    JSObject *scope = ::JS_GetScopeChain(cx);
    rv = xpc->VariantToJS(cx, scope, returnedVariant, &*rval);
    if (NS_FAILED(rv))
        return JS_FALSE;

    return JS_TRUE;
}

static JSBool
SystemAddMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    nsCOMPtr<nsIDOMWindow> owner;
    rv = GetGlobalFromContext(cx, getter_AddRefs(owner));
    if (NS_FAILED(rv) || !owner)
        return JS_FALSE;

    if (argc < 3)
        return JS_FALSE;

    nsAutoString monitorType;
    rv = ConvertJSValToStr(cx, argv[0], monitorType);
    if (NS_FAILED(rv))
        return JS_FALSE;

    nsCOMPtr<clISystemMonitor> monitor;
    rv = ConvertJSValToMonitor(cx, argv[1], getter_AddRefs(monitor));
    if (NS_FAILED(rv))
        return JS_FALSE;

    uint32 interval;
    JS_ValueToECMAUint32(cx, argv[2], &interval);

    PRBool nativeRet = PR_FALSE;
    rv = nativeThis->AddMonitorWithOwner(monitorType, monitor, interval, owner, &nativeRet);
    if (NS_FAILED(rv))
        return JS_FALSE;

    *rval = BOOLEAN_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSBool
SystemAddMonitorWithOwner(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    if (argc < 4)
        return JS_FALSE;

    nsAutoString monitorType;
    rv = ConvertJSValToStr(cx, argv[0], monitorType);
    if (NS_FAILED(rv))
        return JS_FALSE;

    nsCOMPtr<clISystemMonitor> monitor;
    rv = ConvertJSValToMonitor(cx, argv[1], getter_AddRefs(monitor));
    if (NS_FAILED(rv))
        return JS_FALSE;

    uint32 interval;
    JS_ValueToECMAUint32(cx, argv[2], &interval);

    nsCOMPtr<nsIDOMWindow> owner;
    rv = ConvertJSValToWindow(cx, argv[3], getter_AddRefs(owner));
    if (NS_FAILED(rv))
        return JS_FALSE;

    PRBool nativeRet = PR_FALSE;
    rv = nativeThis->AddMonitorWithOwner(monitorType, monitor, interval, owner, &nativeRet);
    if (NS_FAILED(rv))
        return JS_FALSE;

    *rval = BOOLEAN_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSBool
SystemRemoveMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    if (argc < 2)
        return JS_FALSE;

    nsAutoString monitorType;
    rv = ConvertJSValToStr(cx, argv[0], monitorType);
    if (NS_FAILED(rv))
        return JS_FALSE;

    nsCOMPtr<clISystemMonitor> monitor;
    rv = ConvertJSValToMonitor(cx, argv[1], getter_AddRefs(monitor));
    if (NS_FAILED(rv))
        return JS_FALSE;

    PRBool nativeRet = PR_FALSE;
    rv = nativeThis->RemoveMonitor(monitorType, monitor, &nativeRet);
    if (NS_FAILED(rv))
        return JS_FALSE;

    *rval = BOOLEAN_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSBool
SystemRemoveAllMonitors(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    PRInt32 nativeRet = 0;
    nsresult rv = nativeThis->RemoveAllMonitors(&nativeRet);
    if (NS_FAILED(rv))
        return JS_FALSE;

    *rval = INT_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSPropertySpec SystemProperties[] = {
    { "cpu", 0, (JSPROP_SHARED | JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT), SystemGetCpu, nsnull },
    { 0, 0, 0, nsnull, nsnull }
};

static JSFunctionSpec SystemMethods[] = {
    { "addMonitor", SystemAddMonitor, 0, 0, 0 },
    { "addMonitorWithOwner", SystemAddMonitorWithOwner, 0, 0, 0 },
    { "removeMonitor", SystemRemoveMonitor, 0, 0, 0 },
    { "removeAllMonitors", SystemRemoveAllMonitors, 0, 0, 0 },
    JS_FS_END
};

nsresult
InitSystemClass(JSContext *aContext, JSObject *aGlobal, void **aPrototype)
{
    JSObject *proto = nsnull;

    if (aPrototype != nsnull)
        *aPrototype = nsnull;

    proto = JS_InitClass(aContext,         // context
                         aGlobal,          // global object
                         nsnull,           // parent proto
                         &SystemClass,     // JSClass
                         nsnull,           // JSNative ctor
                         nsnull,           // ctor args
                         nsnull,           // proto props
                         nsnull,           // proto funcs
                         SystemProperties, // ctor props (static)
                         SystemMethods);   // ctor funcs (static)

    if (nsnull == proto)
        return NS_ERROR_FAILURE;

    if (aPrototype != nsnull)
        *aPrototype = proto;

    return NS_OK;
}

nsresult
CL_InitSystemClass(nsIScriptContext *aContext, void **aPrototype)
{
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    JSObject *proto = nsnull;
    JSObject *constructor = nsnull;
    JSObject *global = JS_GetGlobalObject(jscontext);
    jsval vp;

    if ((PR_TRUE != JS_LookupProperty(jscontext, global, "System", &vp)) ||
        !JSVAL_IS_OBJECT(vp) ||
        ((constructor = JSVAL_TO_OBJECT(vp)) == nsnull) ||
        (PR_TRUE != JS_LookupProperty(jscontext, JSVAL_TO_OBJECT(vp), "prototype", &vp)) ||
        !JSVAL_IS_OBJECT(vp)) {
        nsresult rv = InitSystemClass(jscontext, global, (void**)&proto);
        if (NS_FAILED(rv))
            return rv;
    }
    else if ((nsnull != constructor) && JSVAL_IS_OBJECT(vp)) {
        proto = JSVAL_TO_OBJECT(vp);
    }
    else {
        return NS_ERROR_FAILURE;
    }

    if (aPrototype)
        *aPrototype = proto;

    return NS_OK;
}

nsresult
CL_NewScriptSystem(nsIScriptContext *aContext, nsISupports *aSupports, nsISupports *aParent, void **aReturn)
{
    NS_PRECONDITION(nsnull != aContext && nsnull != aSupports && nsnull != aReturn,
                    "null argument to CL_NewScriptSystem");

    JSObject *proto;
    JSObject *parent = nsnull;
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    nsresult rv = NS_OK;
    clISystem *system;

    nsCOMPtr<nsIScriptObjectOwner> owner(do_QueryInterface(aParent));

    if (owner) {
        if (NS_OK != owner->GetScriptObject(aContext, (void **)&parent)) {
            return NS_ERROR_FAILURE;
        }
    }
    else {
        nsCOMPtr<nsIScriptGlobalObject> sgo(do_QueryInterface(aParent));

        if (sgo) {
            parent = sgo->GetGlobalJSObject();
        }
        else {
            return NS_ERROR_FAILURE;
        }
    }

    rv = CL_InitSystemClass(aContext, (void **)&proto);
    if (NS_FAILED(rv))
        return NS_ERROR_FAILURE;

    rv = CallQueryInterface(aSupports, &system);
    if (NS_FAILED(rv))
        return rv;

    // create a js object for this class
    *aReturn = JS_NewObject(jscontext, &SystemClass, proto, parent);
    if (nsnull != *aReturn) {
        // connect the native object to the js object
        JS_SetPrivate(jscontext, (JSObject *)*aReturn, system);
    }
    else {
        NS_RELEASE(system);
        return NS_ERROR_FAILURE;
    }

    return NS_OK;
}

