#include <nsITimer.h>
#include <nsCRT.h>
#include <nsIVariant.h>

MonitorData::MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer)
{
    mTopic.Assign(aTopic);
    NS_ADDREF(mMonitor = aMonitor);
    NS_ADDREF(mTimer = aTimer);
}

MonitorData::~MonitorData()
{
    mTimer->Cancel();
    NS_RELEASE(mMonitor);
    NS_RELEASE(mTimer);
}

/* nsITimerCallback */
NS_IMETHODIMP
MonitorData::Notify(nsITimer *aTimer)
{
    nsCOMPtr<nsIVariant> value;
    clSystem::gSystem->GetMonitoringObject(mTopic, getter_AddRefs(value));

    mMonitor->Monitor(value);

    return NS_OK;
}

NS_IMPL_ISUPPORTS1(MonitorData,
                   nsITimerCallback)

