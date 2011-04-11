#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clSystem.h"
#include "MonitorData.h"

#include <nsIClassInfoImpl.h>
#include <nsComponentManagerUtils.h>
#include <nsServiceManagerUtils.h>
#include <nsITimer.h>
#include <nsIObserverService.h>
#include <nsPIDOMWindow.h>
#include <nsIDocShell.h>
#include <nsIWebNavigation.h>
#include <nsIPermissionManager.h>
#include <nsIURI.h>
#include <nsCRT.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop.h>
#include <glibtop/global.h>
#endif

#include "clCPU.h"

clSystem::clSystem()
     : mMonitors(nsnull)
     , mScriptObject(nsnull)
{
    Init();
}

clSystem::~clSystem()
{

    PRInt32 count;
    RemoveAllMonitors(&count);

    if (mCPU)
        NS_RELEASE(mCPU);
}

nsresult
clSystem::Init()
{
#ifdef HAVE_LIBGTOP2
    glibtop_init();
#endif
    return NS_OK;
}

NS_IMPL_ISUPPORTS4_CI(clSystem,
                      clISystem,
                      clISystemInternal,
                      nsIScriptObjectOwner,
                      nsISecurityCheckedComponent)

NS_IMETHODIMP
clSystem::GetCpu(clICPU **aCPU)
{
    if (!mCPU)
      NS_ADDREF(mCPU = new clCPU());

    NS_ADDREF(*aCPU = mCPU);
    return NS_OK;
}

NS_IMETHODIMP
clSystem::AddMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval, PRBool *_retval NS_OUTPARAM)
{
    nsresult rv = AddMonitorWithOwner(aTopic, aMonitor, aInterval, nsnull, &*_retval);
    return NS_FAILED(rv) ? NS_ERROR_FAILURE : NS_OK;
}

#include <stdio.h>

PRBool
EnsureAllowed(nsIDOMWindow *aOwner)
{
    if (!aOwner)
        return PR_TRUE;

    nsresult rv;

    nsCOMPtr<nsPIDOMWindow> window = do_QueryInterface(aOwner);
    nsCOMPtr<nsIDocShell> docShell = window->GetDocShell();
    nsCOMPtr<nsIWebNavigation> webNavigation = do_QueryInterface(docShell);
    nsCOMPtr<nsIURI> uri;
    rv = webNavigation->GetCurrentURI(getter_AddRefs(uri));
    if (NS_FAILED(rv))
        return PR_FALSE;

    PRBool isChrome = PR_FALSE;
    if ((NS_SUCCEEDED(uri->SchemeIs("chrome", &isChrome)) && isChrome) ||
        (NS_SUCCEEDED(uri->SchemeIs("resource", &isChrome)) && isChrome))
        return PR_TRUE;

    nsCOMPtr<nsIPermissionManager> permissionManager = do_GetService(NS_PERMISSIONMANAGER_CONTRACTID, &rv);
    if (NS_FAILED(rv))
        return PR_FALSE;

    PRUint32 permission;
    rv = permissionManager->TestExactPermission(uri, "system-monitor", &permission);
    if (NS_FAILED(rv))
        return PR_FALSE;

    nsCOMPtr<nsIObserverService> os = do_GetService(NS_OBSERVERSERVICE_CONTRACTID, &rv);
    if (permission != nsIPermissionManager::ALLOW_ACTION) {
        if (permission == nsIPermissionManager::DENY_ACTION)
          os->NotifyObservers(static_cast<nsISupports *>(window),
                              "system-monitor:permission-denied",
                              nsnull);
        else
          os->NotifyObservers(static_cast<nsISupports *>(window),
                              "system-monitor:unknown-permission",
                              nsnull);
        return PR_FALSE;
    }

    return PR_TRUE;
}

NS_IMETHODIMP
clSystem::AddMonitorWithOwner(const nsAString & aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval, nsIDOMWindow *aOwner, PRBool *_retval NS_OUTPARAM)
{
    *_retval = PR_FALSE;

    if (EnsureAllowed(aOwner) == PR_FALSE)
      return NS_OK;

    nsresult rv;
    nsCOMPtr<nsITimer> timer = do_CreateInstance("@mozilla.org/timer;1", &rv);
    NS_ENSURE_SUCCESS(rv, rv);

    nsCOMPtr<clISystem> system = do_QueryInterface(static_cast<clISystem *>(this));

    MonitorData *data = new MonitorData(aTopic, aMonitor, timer, system, aOwner);
    mMonitors.AppendObject(data);

    rv = timer->InitWithCallback(data,
                                 aInterval,
                                 nsITimer::TYPE_REPEATING_SLACK);
    NS_ENSURE_SUCCESS(rv, rv);

    *_retval = PR_TRUE;
    return NS_OK;
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
clSystem::RemoveMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor, PRBool *_retval NS_OUTPARAM)
{
    *_retval = PR_FALSE;

    PRInt32 count = mMonitors.Count();
    if (count == 0)
        return NS_OK;

    PRInt32 found;
    while ((found = findMonitorIndex(mMonitors, aMonitor)) != -1) {
        MonitorData *data = mMonitors.ObjectAt(found);
        data->Destroy();
        mMonitors.RemoveObjectAt(found);
    }

    *_retval = PR_TRUE;
    return NS_OK;
}

NS_IMETHODIMP
clSystem::RemoveAllMonitors(PRInt32 *_retval NS_OUTPARAM)
{
    PRInt32 count = mMonitors.Count();
    *_retval = count;
    if (count == 0)
        return NS_OK;

    for (PRInt32 i = 0; i < count; i++) {
        MonitorData *data = mMonitors.ObjectAt(i);
        data->Destroy();
        mMonitors.RemoveObjectAt(i);
    }

    return NS_OK;
}


/* nsISctiptObjectOwner */
NS_IMETHODIMP
clSystem::GetScriptObject(nsIScriptContext *aContext, void **aScriptObject)
{
    NS_PRECONDITION(nsnull != aScriptObject, "null arg");
    nsresult rv = NS_OK;

    if (mScriptObject == nsnull) {
        rv = CL_NewScriptSystem(aContext,
                                (clISystem*)this,
                                &mScriptObject);
    }

    *aScriptObject = mScriptObject;
    return rv;
}

NS_IMETHODIMP
clSystem::SetScriptObject(void *aScriptObject)
{
    mScriptObject = aScriptObject;
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
