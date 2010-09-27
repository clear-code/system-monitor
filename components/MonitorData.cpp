#include "MonitorData.h"

#include <nsComponentManagerUtils.h>
#include <nsITimer.h>
#include <nsCRT.h>
#include <nsIVariant.h>

#include "clICPU.h"
#include "clCPU.h"
#include "clCPUTime.h"
#include "clIMemory.h"
#include "clMemory.h"

MonitorData::MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor,
                         nsITimer *aTimer, clISystem *aSystem)
{
    mTopic.Assign(aTopic);
    NS_ADDREF(mMonitor = aMonitor);
    NS_ADDREF(mSystem = aSystem);
    NS_ADDREF(mTimer = aTimer);
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
    nsCOMPtr<nsIVariant> value;
    GetMonitoringObject(getter_AddRefs(value));

    mMonitor->Monitor(value);

    return NS_OK;
}

NS_IMPL_ISUPPORTS1(MonitorData,
                   nsITimerCallback)

