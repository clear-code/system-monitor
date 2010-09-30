/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Geolocation.
 *
 * The Initial Developer of the Original Code is Mozilla Corporation
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Doug Turner <dougt@meer.net>  (Original Author)
 *  SHIMODA Hiroshi <shimoda@clear-code.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/* OwnerStillExists is imported from nsGeolocation.cpp */


#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "MonitorData.h"

#include <nsComponentManagerUtils.h>
#include <nsServiceManagerUtils.h>
#include <nsCRT.h>

#include <jsapi.h>
#include <jsobj.h>
#include <nsIXPConnect.h>
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
        nsCOMPtr<nsPIDOMWindow> window = do_QueryInterface(aOwner);
        if (window)
            mOwner = do_GetWeakReference(window->GetCurrentInnerWindow());
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
    if (!OwnerStillExists())
        return RemoveSelf();

    nsCOMPtr<nsIVariant> value;
    GetMonitoringObject(getter_AddRefs(value));

    mMonitor->Monitor(value);

    return NS_OK;
}

PRBool
MonitorData::OwnerStillExists()
{
    if (mOwner == nsnull)
        return PR_TRUE;

    nsCOMPtr<nsPIDOMWindow> window = do_QueryReferent(mOwner);
    if (window) {
        PRBool closed = PR_FALSE;
        window->GetClosed(&closed);
        if (closed)
            return PR_FALSE;

        nsPIDOMWindow* outer = window->GetOuterWindow();
        if (!outer || outer->GetCurrentInnerWindow() != window)
            return PR_FALSE;
    }

    return PR_TRUE;
}

NS_IMPL_ISUPPORTS1(MonitorData,
                   nsITimerCallback)
