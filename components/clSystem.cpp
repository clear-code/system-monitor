#include "clSystem.h"

#include <jsapi.h>
#include <nsIScriptGlobalObject.h>
#include <nsIXPConnect.h>
#include <nsIClassInfoImpl.h>
#include <nsServiceManagerUtils.h>
#include <nsComponentManagerUtils.h>
#include <nsITimer.h>
#include <nsCRT.h>

#include "clISystem.h"
#include "clISystemMonitor.h"
#include "clICPU.h"
#include "clCPU.h"
#include "clCPUTime.h"

clSystem::clSystem()
     : mCPU(nsnull)
     , mScriptObject(nsnull)
     , mMonitors(nsnull)
{
}

clSystem::~clSystem()
{
    NS_RELEASE(mCPU);

    if (mMonitors) {
        PRInt32 count = mMonitors->Count();
        for (PRInt32 i = 0; i < count; i++) {
            mMonitors->RemoveElementAt(i);
	}
        delete mMonitors;
        mMonitors = 0;
    }
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
    NS_ADDREF(mCPU);

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
                              clISystem,
                              nsIScriptObjectOwner)

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

static JSBool
addMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    nsresult rv;

    if (argc != 3)
        return JS_FALSE;

    if (!JSVAL_IS_STRING(argv[0]) ||
        (!JSVAL_IS_OBJECT(argv[1]) && JS_ObjectIsFunction(cx, JSVAL_TO_OBJECT(argv[1]))) ||
	!JSVAL_IS_NUMBER(argv[2]))
	return JS_FALSE;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    clSystem *system = static_cast<clSystem*>(nativeThis);

    JSString *js_topic = JSVAL_TO_STRING(argv[0]);
    JSObject *js_monitor = JSVAL_TO_OBJECT(argv[1]);
    PRInt32 interval = JSVAL_TO_INT(argv[2]);

    const PRUnichar *topic = JS_GetStringChars(js_topic);

    nsCOMPtr<nsIXPConnect> xpc = do_GetService(nsIXPConnect::GetCID(), &rv);
    NS_ENSURE_SUCCESS(rv, JS_FALSE);

    nsCOMPtr<clISystemMonitor> monitor;
    rv = xpc->WrapJS(cx, js_monitor, NS_GET_IID(clISystemMonitor), getter_AddRefs(monitor));
    NS_ENSURE_SUCCESS(rv, JS_FALSE);

    system->AddMonitor(topic, monitor, interval);

    return JS_TRUE;
}

static JSBool
removeMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    nsresult rv;

    if (argc != 2)
        return JS_FALSE;

    if (!JSVAL_IS_STRING(argv[0]) ||
        (!JSVAL_IS_OBJECT(argv[1]) && JS_ObjectIsFunction(cx, JSVAL_TO_OBJECT(argv[1]))) ||
        !JSVAL_IS_OBJECT(argv[1]))
	return JS_FALSE;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    clSystem *system = static_cast<clSystem*>(nativeThis);
    JSString *js_topic = JSVAL_TO_STRING(argv[0]);
    JSObject *js_monitor = JSVAL_TO_OBJECT(argv[1]);

    const PRUnichar *topic = JS_GetStringChars(js_topic);

    nsCOMPtr<nsIXPConnect> xpc = do_GetService(nsIXPConnect::GetCID(), &rv);
    NS_ENSURE_SUCCESS(rv, JS_FALSE);

    nsCOMPtr<clISystemMonitor> monitor;
    rv = xpc->WrapJS(cx, js_monitor, NS_GET_IID(clISystemMonitor), getter_AddRefs(monitor));
    NS_ENSURE_SUCCESS(rv, JS_FALSE);

    system->RemoveMonitor(topic, monitor);

    return JS_TRUE;
}

static JSFunctionSpec JSSystemMethods[] = {
    {"addMonitor", addMonitor, 3, 0, 0},
    {"removeMonitor", removeMonitor, 2, 0, 0},
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

struct MonitorData {
    clSystem *system;
    char *topic;
    clISystemMonitor *monitor;
    nsITimer *timer;
};

static MonitorData *
createMonitorData (clSystem *system, const char *aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer)
{
    MonitorData *data;

    data = (MonitorData *)nsMemory::Alloc(sizeof(MonitorData));
    if (!data)
        return NULL;

    data->system = system;
    data->topic = (char*)nsMemory::Clone(aTopic, nsCRT::strlen(aTopic));
    data->monitor = aMonitor;
    data->timer = aTimer;

    return data;
}

static void
freeMonitorData (MonitorData *data)
{
    if (!data)
        return;

    data->timer->Cancel();
    nsMemory::Free(data->topic);
    NS_RELEASE(data->monitor);
    NS_RELEASE(data->timer);

    nsMemory::Free(data);
}

NS_IMETHODIMP
clSystem::AddMonitor(const char *aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval)
{
    MonitorData *data;

    if (!mMonitors) {
        mMonitors = new nsAutoVoidArray();
        if (nsnull == mMonitors)
            return NS_ERROR_OUT_OF_MEMORY;
    }

    nsresult rv;
    nsCOMPtr<nsITimer> timer = do_CreateInstance("@mozilla.org/timer;1", &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    data = createMonitorData(this, aTopic, aMonitor, timer);
    mMonitors->AppendElement(data);

    rv = timer->InitWithFuncCallback(clSystem::Timeout,
                                     (void*)data,
                                     aInterval,
                                     nsITimer::TYPE_REPEATING_SLACK);

    return NS_OK;
}

NS_IMETHODIMP
clSystem::RemoveMonitor(const char *aTopic, clISystemMonitor *aMonitor)
{
    if (!mMonitors)
        return NS_OK;

    PRInt32 count = mMonitors->Count();
    if (count == 0)
        return NS_OK;

    for (PRInt32 i = 0; i < count; i++) {
        MonitorData *data = static_cast<MonitorData*>(mMonitors->ElementAt(i));
        if (data->monitor == aMonitor) {
            mMonitors->RemoveElementAt(i);
	    freeMonitorData(data);
        }
    }

    return NS_OK;
}

NS_IMETHODIMP
clSystem::AddMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval)
{
    // temporary fix. XPCOM module can not be loaded whenever we use NS_ConvertXX.
    //return AddMonitor(NS_ConvertUTF16toUTF8(aTopic).get(), aMonitor, aInterval);
    return AddMonitor("cpu-time", aMonitor, aInterval);
}

NS_IMETHODIMP
clSystem::RemoveMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor)
{
    // temporary fix. XPCOM module can not be loaded whenever we use NS_ConvertXX.
    //return RemoveMonitor(NS_ConvertUTF16toUTF8(aTopic).get(), aMonitor);
    return RemoveMonitor("cpu-time", aMonitor);
}

static nsresult
getMonitoringObject(clSystem *system, const char *aTopic, nsISupports **aObject)
{
    if (!strcmp("cpu-time", aTopic)) {
        nsresult rv;

        nsCOMPtr<clICPUTime> cpuTime;
        system->mCPU->GetCurrentTime(getter_AddRefs(cpuTime));
        nsCOMPtr<nsISupports> supports(do_QueryInterface(cpuTime, &rv));
        NS_IF_ADDREF(*aObject = cpuTime);

        return NS_OK;
    }

    return NS_ERROR_FAILURE;
}

void
clSystem::Timeout(nsITimer *aTimer, void *aClosure)
{
    MonitorData *data = static_cast<MonitorData*>(aClosure);

    nsCOMPtr<nsISupports> object;
    getMonitoringObject(data->system, data->topic, getter_AddRefs(object));

    data->monitor->Monitor(object);
}

