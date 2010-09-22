#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clSystem.h"

#include <nsIClassInfoImpl.h>
#include <nsComponentManagerUtils.h>
#include <nsITimer.h>
#include <nsCRT.h>
#include <nsIVariant.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop.h>
#include <glibtop/global.h>
#endif

#include "clICPU.h"
#include "clCPU.h"
#include "clCPUTime.h"
#include "clIMemory.h"
#include "clMemory.h"

clSystem::clSystem()
     : mMonitors(nsnull)
{
}

class MonitorData
{
public:
    MonitorData(const nsAString &aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer);
    virtual ~MonitorData();
    nsString mTopic;
    nsCOMPtr<clISystemMonitor> mMonitor;
    nsCOMPtr<nsITimer> mTimer;
};

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

clSystem::~clSystem()
{
    if (mMonitors) {
        PRInt32 count = mMonitors->Count();
        for (PRInt32 i = 0; i < count; i++) {
            MonitorData *data = static_cast<MonitorData*>(mMonitors->ElementAt(i));
            delete data;
            mMonitors->RemoveElementAt(i);
        }
        delete mMonitors;
        mMonitors = 0;
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
clSystem::GetCpu(clICPU * *aCPU)
{
    *aCPU = mCPU;
    return NS_OK;
}

NS_IMETHODIMP
clSystem::AddMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval)
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

    data = new MonitorData(aTopic, aMonitor, timer);
    mMonitors->AppendElement(data);

    rv = timer->InitWithFuncCallback(clSystem::Timeout,
                                     (void*)data,
                                     aInterval,
                                     nsITimer::TYPE_REPEATING_SLACK);
    NS_ENSURE_SUCCESS(rv, rv);

    return NS_OK;
}

static PRInt32
findMonitorIndex(nsAutoVoidArray *monitors, clISystemMonitor *aMonitor)
{
    PRInt32 count = monitors->Count();
    if (count == 0)
        return -1;

    for (PRInt32 i = 0; i < count; i++) {
        MonitorData *data = static_cast<MonitorData*>(monitors->ElementAt(i));
        if (data->mMonitor == aMonitor) {
            return i;
        }
    }
    return -1;
}

NS_IMETHODIMP
clSystem::RemoveMonitor(const nsAString & aTopic, clISystemMonitor *aMonitor)
{
    if (!mMonitors)
        return NS_OK;

    PRInt32 count = mMonitors->Count();
    if (count == 0)
        return NS_OK;

    PRInt32 found;
    while ((found = findMonitorIndex(mMonitors, aMonitor)) != -1) {
        MonitorData *data;
        data = static_cast<MonitorData*>(mMonitors->ElementAt(found));
        mMonitors->
        RemoveElementAt(found);
        delete data;
    }

    return NS_OK;
}

NS_IMETHODIMP
clSystem::GetMonitoringObject(const nsAString &aTopic, nsIVariant **aValue)
{
    nsCOMPtr<nsIWritableVariant> value;

    if (aTopic.Equals(NS_LITERAL_STRING("cpu-usage"))) {
        double usage;
        mCPU->GetUsage(&usage);
        value = do_CreateInstance("@mozilla.org/variant;1");
        value->SetAsDouble(usage);
    } else if (aTopic.Equals(NS_LITERAL_STRING("cpu-time"))) {
        nsCOMPtr<clICPUTime> cpuTime;
        mCPU->GetCurrentTime(getter_AddRefs(cpuTime));
        value = do_CreateInstance("@mozilla.org/variant;1");
        const nsIID iid = cpuTime->GetIID();
        value->SetAsInterface(iid, cpuTime);
    } else if (aTopic.Equals(NS_LITERAL_STRING("memory-usage"))) {
        nsCOMPtr<clIMemory> memory;
        NS_ADDREF(memory = new clMemory());
        value = do_CreateInstance("@mozilla.org/variant;1");
        const nsIID iid = memory->GetIID();
        value->SetAsInterface(iid, memory);
    }

    NS_IF_ADDREF(*aValue = value);

    return value ? NS_OK : NS_ERROR_FAILURE;
}

void
clSystem::Timeout(nsITimer *aTimer, void *aClosure)
{
    MonitorData *data = static_cast<MonitorData*>(aClosure);

    nsCOMPtr<nsIVariant> value;
    gSystem->GetMonitoringObject(data->mTopic, getter_AddRefs(value));

    data->mMonitor->Monitor(value);
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
