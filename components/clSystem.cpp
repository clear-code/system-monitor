#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clSystem.h"
#include "MonitorData.h"

#include <nsIClassInfoImpl.h>
#include <nsComponentManagerUtils.h>
#include <nsITimer.h>
#include <nsCRT.h>
#include <nsIVariant.h>

#include <jsapi.h>
#include <jsobj.h>
#include <nsIXPConnect.h>
#include <nsServiceManagerUtils.h>
#include <nsIDOMWindow.h>
#include <nsPIDOMWindow.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop.h>
#include <glibtop/global.h>
#endif

#include "clICPU.h"
#include "clCPU.h"

clSystem::clSystem()
     : mMonitors(nsnull)
{
}

clSystem::~clSystem()
{
    PRInt32 count = mMonitors.Count();
    for (PRInt32 i = 0; i < count; i++) {
        mMonitors.RemoveObjectAt(i);
    }
    if (mCPU) {
        NS_RELEASE(mCPU);
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
#ifdef HAVE_LIBGTOP2
    glibtop_init();
#endif
    NS_ADDREF(mCPU = new clCPU());
    return NS_OK;
}

NS_IMPL_ISUPPORTS2_CI(clSystem,
                      clISystem,
                      nsISecurityCheckedComponent)

NS_IMETHODIMP
clSystem::GetCpu(clICPU **aCPU)
{
    NS_ADDREF(*aCPU = mCPU);
    return NS_OK;
}

NS_IMETHODIMP
clSystem::AddMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval)
{
    nsresult rv;
    nsCOMPtr<nsITimer> timer = do_CreateInstance("@mozilla.org/timer;1", &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    nsCOMPtr<clISystem> system = do_QueryInterface(static_cast<clISystem *>(this));

    nsCOMPtr<nsIDOMWindow> owner;
    GetGlobal(getter_AddRefs(owner));

    MonitorData *data = new MonitorData(aTopic, aMonitor, timer, system, owner);
    mMonitors.AppendObject(data);

    rv = timer->InitWithCallback(data,
                                 aInterval,
                                 nsITimer::TYPE_REPEATING_SLACK);
    NS_ENSURE_SUCCESS(rv, rv);

    return NS_OK;
}

nsresult
clSystem::GetGlobal(nsIDOMWindow **aGlobal)
{
    nsresult rv;
    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    NS_ENSURE_SUCCESS(rv, rv);

    nsAXPCNativeCallContext *cc = nsnull;
    rv = xpc->GetCurrentNativeCallContext(&cc);
    if (NS_FAILED(rv) || !cc)
        return NS_ERROR_FAILURE;

    JSContext* cx;
    rv = cc->GetJSContext(&cx);
    if (NS_FAILED(rv) || !cx)
        return NS_ERROR_FAILURE;

    JSObject *scope = ::JS_GetScopeChain(cx);
    if (!scope)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsISupports> supports = do_QueryInterface(static_cast<clISystem *>(this));
    nsCOMPtr<nsIXPConnectJSObjectHolder> holder;
    rv = xpc->WrapNative(cx, scope, supports, NS_GET_IID(nsISupports), getter_AddRefs(holder));
    if (NS_FAILED(rv))
        return NS_ERROR_FAILURE;

    JSObject* obj;
    rv = holder->GetJSObject(&obj);
    if (NS_FAILED(rv) || !obj)
        return NS_ERROR_FAILURE;

    while (JSObject *parent = obj->getParent())
        obj = parent;
    if (!obj)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsIXPConnectWrappedNative> wrapper;
    rv = xpc->GetWrappedNativeOfJSObject(cx, ::JS_GetGlobalForObject(cx, obj),
                                             getter_AddRefs(wrapper));
    if (NS_FAILED(rv) || !wrapper)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsPIDOMWindow> win = do_QueryWrappedNative(wrapper);
    if (win) {
        NS_ADDREF(*aGlobal = win.get());
        return NS_OK;
    }

    return NS_ERROR_FAILURE;
}

static PRInt32
findMonitorIndex(nsCOMArray<MonitorData>&monitors, clISystemMonitor *aMonitor)
{
    PRInt32 count = monitors.Count();
    if (count == 0)
        return -1;

    for (PRInt32 i = 0; i < count; i++) {
        MonitorData *data = monitors.ObjectAt(i);
        if (data->mMonitor == aMonitor) {
            return i;
        }
    }
    return -1;
}

NS_IMETHODIMP
clSystem::RemoveMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor)
{
    PRInt32 count = mMonitors.Count();
    if (count == 0)
        return NS_OK;

    PRInt32 found;
    while ((found = findMonitorIndex(mMonitors, aMonitor)) != -1) {
        MonitorData *data = mMonitors.ObjectAt(found);
        data->Destroy();
        mMonitors.RemoveObjectAt(found);
    }

    return NS_OK;
}

static char *
cloneAllAccessString (void)
{
    static const char allAccessString[] = "allAccess";
    return (char*)nsMemory::Clone(allAccessString, sizeof(allAccessString));
}

NS_IMETHODIMP
clSystem::CanCreateWrapper(const nsIID * iid, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clSystem::CanCallMethod(const nsIID * iid, const PRUnichar *methodName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clSystem::CanGetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clSystem::CanSetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}
