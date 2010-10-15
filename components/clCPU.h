#ifndef __CL_CPU_H__
#define __CL_CPU_H__

#include <mozilla-config.h>

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clICPU.h"
#include "clICPUTime.h"

#include <nsVoidArray.h>
#include <nsISecurityCheckedComponent.h>

class CL_CPUTimeInfo {
public:
    CL_CPUTimeInfo(PRUint64 user, PRUint64 system, PRUint64 nice, PRUint64 idle, PRUint64 IOWait);
    virtual ~CL_CPUTimeInfo();

    PRUint64 userTime;
    PRUint64 systemTime;
    PRUint64 niceTime;
    PRUint64 idleTime;
    PRUint64 IOWaitTime;
};

extern nsAutoVoidArray* CL_GetCPUTimeInfoArray();
extern CL_CPUTimeInfo CL_SumCPUTimeInfoArray(nsAutoVoidArray *aCPUTimeInfos);
extern nsresult CL_GetCPUTime(CL_CPUTimeInfo *aPrevious, CL_CPUTimeInfo *aCurrent, clICPUTime **aCPUTime);

#define CL_CPU_CONTRACT_ID "@clear-code.com/system/cpu;1"
#define CL_CPU_CID {0x7465c6a6, 0xaa0d, 0x42b6, {0xb4, 0x44, 0x95, 0x24, 0xb7, 0x95, 0xd5, 0x0e}}

class clCPU : public clICPU
            , public nsISecurityCheckedComponent
{
public:
    clCPU();
    virtual ~clCPU();

    NS_DECL_ISUPPORTS
    NS_DECL_CLICPU
    NS_DECL_NSISECURITYCHECKEDCOMPONENT

private:
    nsAutoVoidArray *mPreviousTimes;
    void SetPreviousTimes(nsAutoVoidArray *aCurrentTimes);
    void DestroyPreviousTimes();
};

#endif /* __CL_CPU_H__ */
