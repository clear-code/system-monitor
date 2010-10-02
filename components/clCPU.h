#ifndef __CL_CPU_H__
#define __CL_CPU_H__

#include <mozilla-config.h>

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clICPU.h"
#include "clICPUTime.h"

#include <nsISecurityCheckedComponent.h>

typedef struct CL_CPUTime CL_CPUTime;
struct CL_CPUTime {
    PRUint64 userTime;
    PRUint64 systemTime;
    PRUint64 niceTime;
    PRUint64 idleTime;
    PRUint64 IOWaitTime;
};

extern CL_CPUTime CL_GetCPUTime();
extern CL_CPUTime CL_GetCPUTime(CL_CPUTime *aPrevious, clICPUTime **aCPUTime);

#define CL_CPU_CONTRACT_ID "@clear-code.com/system/cpu;1"
#define CL_CPU_CID {0x7465c6a6, 0xaa0d, 0x42b6, {0xb4, 0x44, 0x95, 0x24, 0xb7, 0x95, 0xd5, 0x0e}}

class clCPU : public clICPU
            , public nsISecurityCheckedComponent
{
public:
    static clCPU *GetInstance();
    static clCPU *GetService();

    clCPU();
    virtual ~clCPU();

    NS_DECL_ISUPPORTS
    NS_DECL_CLICPU
    NS_DECL_NSISECURITYCHECKEDCOMPONENT

private:
    static clCPU *gCPU;
    CL_CPUTime mPreviousTime;
};

#endif /* __CL_CPU_H__ */
