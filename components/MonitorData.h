#ifndef __MONITOR_DATA_H__
#define __MONITOR_DATA_H__

#include <mozilla-config.h>

#include "clISystem.h"

#include <nsStringGlue.h>
#include <nsITimer.h>
#include <nsIDOMWindow.h>
#include <nsIVariant.h>
#include <nsCOMPtr.h>

class MonitorData : public nsITimerCallback
{
public:
    MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor,
                nsITimer *aTimer, clISystem *aSystem, nsIDOMWindow *aOwner);
    virtual ~MonitorData();

    NS_DECL_ISUPPORTS
    NS_DECL_NSITIMERCALLBACK

    nsCOMPtr<clISystemMonitor> mMonitor;

    nsresult Destroy();

private:
    nsString mTopic;
    nsCOMPtr<clISystem> mSystem;
    nsCOMPtr<nsITimer> mTimer;
    nsCOMPtr<nsIDOMWindow> mOwner;

    nsresult GetMonitoringObject(nsIVariant **aValue);

    nsresult RemoveSelf();
};

#endif /* __MONITOR_DATA_H__ */

