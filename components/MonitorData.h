#ifndef __MONITOR_DATA_H__
#define __MONITOR_DATA_H__

#include <mozilla-config.h>

#include "clISystem.h"

#include <nsStringGlue.h>
#include <nsITimer.h>
#include <nsIDOMWindow.h>
#include <nsIVariant.h>
#include <nsCOMPtr.h>
#include <jsapi.h>
#include <jsobj.h>

class MonitorData : public nsITimerCallback
{
public:
    MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer, clISystem *aSystem);
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
    JSObject *GetGlobal();
};

#endif /* __MONITOR_DATA_H__ */

