#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "MonitorData.h"

#include <nsComponentManagerUtils.h>
#include <nsCRT.h>

#include <jsapi.h>
#include <jsobj.h>
#include <nsIXPConnect.h>
#include <nsServiceManagerUtils.h>
#include <nsIDOMWindow.h>
#include <nsPIDOMWindow.h>

#include "clICPU.h"
#include "clCPU.h"
#include "clCPUTime.h"
#include "clIMemory.h"
#include "clMemory.h"

MonitorData::MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor,
                         nsITimer *aTimer, clISystem *aSystem, nsIDOMWindow *aOwner)
{
    mTopic.Assign(aTopic);
    NS_ADDREF(mMonitor = aMonitor);
    NS_ADDREF(mSystem = aSystem);
    NS_ADDREF(mTimer = aTimer);
    if (aOwner) {
      NS_ADDREF(mOwner = aOwner);
    }
}

MonitorData::~MonitorData()
{
    Destroy();
}

nsresult
MonitorData::Destroy()
{
    if (mTimer) {
      mTimer->Cancel();
      NS_RELEASE(mMonitor);
      NS_RELEASE(mSystem);
      NS_RELEASE(mTimer);
      if (mOwner) {
        NS_RELEASE(mOwner);
      }
    }
    return NS_OK;
}

nsresult
MonitorData::RemoveSelf()
{
    if (mTimer) {
      PRBool result;
      mSystem->RemoveMonitor(mTopic, mMonitor, &result);
    }
    return NS_OK;
}

nsresult
MonitorData::GetMonitoringObject(nsIVariant **aValue)
{
    nsCOMPtr<nsIWritableVariant> value;

    if (mTopic.Equals(NS_LITERAL_STRING("cpu-usage"))) {
        nsCOMPtr<clICPU> cpu;
        mSystem->GetCpu(getter_AddRefs(cpu));
        double usage;
        cpu->GetUsage(&usage);
        value = do_CreateInstance("@mozilla.org/variant;1");
        value->SetAsDouble(usage);
    } else if (mTopic.Equals(NS_LITERAL_STRING("cpu-time"))) {
        nsCOMPtr<clICPU> cpu;
        mSystem->GetCpu(getter_AddRefs(cpu));
        nsCOMPtr<clICPUTime> cpuTime;
        cpu->GetCurrentTime(getter_AddRefs(cpuTime));
        value = do_CreateInstance("@mozilla.org/variant;1");
        const nsIID iid = cpuTime->GetIID();
        value->SetAsInterface(iid, cpuTime);
    } else if (mTopic.Equals(NS_LITERAL_STRING("memory-usage"))) {
        nsCOMPtr<clIMemory> memory;
        NS_ADDREF(memory = new clMemory());
        value = do_CreateInstance("@mozilla.org/variant;1");
        const nsIID iid = memory->GetIID();
        value->SetAsInterface(iid, memory);
    }

    NS_IF_ADDREF(*aValue = value);

    return value ? NS_OK : NS_ERROR_FAILURE;
}

/* nsITimerCallback */
NS_IMETHODIMP
MonitorData::Notify(nsITimer *aTimer)
{
    if (mOwner != nsnull) {
      nsCOMPtr<nsPIDOMWindow> window = do_QueryInterface(static_cast<nsIDOMWindow*>(mOwner));
      if (window) {
        PRBool closed = PR_FALSE;
        window->GetClosed(&closed);
        if (closed) {
          RemoveSelf();
          return NS_OK;
        }
        nsPIDOMWindow* outer = window->GetOuterWindow();
        if (!outer || outer->GetCurrentInnerWindow() != window) {
          RemoveSelf();
          return NS_OK;
        }
      }
    }

    nsCOMPtr<nsIVariant> value;
    GetMonitoringObject(getter_AddRefs(value));

    mMonitor->Monitor(value);

    return NS_OK;
}

NS_IMPL_ISUPPORTS1(MonitorData,
                   nsITimerCallback)

