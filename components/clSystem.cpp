#include "clSystem.h"

#include <nsIClassInfoImpl.h>
#include <nsComponentManagerUtils.h>
#include <nsITimer.h>
#include <nsCRT.h>
#include <nsIVariant.h>

#include "clISystem.h"
#include "clICPU.h"
#include "clCPU.h"
#include "clCPUTime.h"

clSystem::clSystem()
     : mMonitors(nsnull)
{
}

struct MonitorData {
    clICPU* cpu;
    PRUnichar *topic;
    clISystemMonitor *monitor;
    nsITimer *timer;
};

PRUint32
CL_strlen(const PRUnichar *aString)
{
    const PRUnichar *end;

    for (end = aString; *end; ++end) {
        // empty loop
    }

    return end - aString;
}

static int
CL_strcmp(const PRUnichar *a, const PRUnichar *b)
{
    while (*b) {
        int r = *a - *b;
        if (r)
            return r;

        ++a;
        ++b;
    }

    return *a != '\0';
}

static PRUnichar *
CL_strndup(const PRUnichar *aString, PRUint32 aLen)
{
    PRUnichar *newBuf = (PRUnichar*) NS_Alloc((aLen + 1) * sizeof(PRUnichar));
    if (newBuf) {
        memcpy(newBuf, aString, aLen * sizeof(PRUnichar));
        newBuf[aLen] = '\0';
    }
    return newBuf;
}

static PRUnichar *
CL_strdup(const PRUnichar *aString)
{
    PRUint32 len = CL_strlen(aString);
    return CL_strndup(aString, len);
}

static MonitorData *
createMonitorData (clSystem *system, const PRUnichar *aTopic, clISystemMonitor *aMonitor, nsITimer *aTimer)
{
    MonitorData *data;

    data = (MonitorData *)nsMemory::Alloc(sizeof(MonitorData));
    if (!data)
        return NULL;

    data->cpu = new clCPU();
    NS_ADDREF(data->cpu);
    data->topic = CL_strdup(aTopic);
    NS_ADDREF(data->monitor = aMonitor);
    NS_ADDREF(data->timer = aTimer);

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
    NS_RELEASE(data->cpu);

    nsMemory::Free(data);
}

clSystem::~clSystem()
{
    if (mMonitors) {
        PRInt32 count = mMonitors->Count();
        for (PRInt32 i = 0; i < count; i++) {
            MonitorData *data = static_cast<MonitorData*>(mMonitors->ElementAt(i));
            freeMonitorData(data);
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
    return NS_OK;
}

NS_IMPL_ISUPPORTS2_CI(clSystem,
                      clISystem,
                      nsISecurityCheckedComponent)

NS_IMETHODIMP
clSystem::GetCpu(clICPU * *aCPU)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
clSystem::AddMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor, PRInt32 aInterval)
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
        if (data->monitor == aMonitor) {
            return i;
        }
    }
    return -1;
}

NS_IMETHODIMP
clSystem::RemoveMonitor(const PRUnichar *aTopic, clISystemMonitor *aMonitor)
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
        mMonitors->RemoveElementAt(found);
        freeMonitorData(data);
    }

    return NS_OK;
}

static nsresult
getMonitoringObject(clICPU *cpu, const PRUnichar *aTopic, nsIVariant **aValue)
{
    const PRUnichar cpuTimeString[] = {'c', 'p', 'u', '-', 't', 'i', 'm', 'e', '\0'};
    const PRUnichar cpuUsageString[] = {'c', 'p', 'u', '-', 'u', 's', 'a', 'g', 'e', '\0'};
    nsCOMPtr<nsIWritableVariant> value;

    if (!CL_strcmp(cpuUsageString, aTopic)) {
        double usage;
        cpu->GetUsage(&usage);
        value = do_CreateInstance("@mozilla.org/variant;1");
        value->SetAsDouble(usage);
    } else if (!CL_strcmp(cpuTimeString, aTopic)) {
        nsCOMPtr<clICPUTime> cpuTime;
        cpu->GetCurrentTime(getter_AddRefs(cpuTime));
        value = do_CreateInstance("@mozilla.org/variant;1");
        const nsIID iid = cpuTime->GetIID();
        value->SetAsInterface(iid, cpuTime);
    }

    NS_IF_ADDREF(*aValue = value);

    return value ? NS_OK : NS_ERROR_FAILURE;
}

void
clSystem::Timeout(nsITimer *aTimer, void *aClosure)
{
    MonitorData *data = static_cast<MonitorData*>(aClosure);

    nsCOMPtr<nsIVariant> value;
    getMonitoringObject(data->cpu, data->topic, getter_AddRefs(value));

    data->monitor->Monitor(value);
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
