#ifndef __MONITOR_DATA_H__
#define __MONITOR_DATA_H__

#include "clISystem.h"

#include <nsVoidArray.h>
#include <nsITimer.h>
#include <nsCOMPtr.h>

class MonitorData : public nsITimerCallback
{
public:
    MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer, clISystem *aSystem);
    virtual ~MonitorData();

    NS_DECL_ISUPPORTS
    NS_DECL_NSITIMERCALLBACK

    nsString mTopic;
    nsCOMPtr<clISystemMonitor> mMonitor;
    nsCOMPtr<clISystem> mSystem;
    nsCOMPtr<nsITimer> mTimer;

private:
    nsresult GetMonitoringObject(nsIVariant **aValue);
};

#endif /* __MONITOR_DATA_H__ */

