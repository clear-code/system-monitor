#ifndef __CL_CPU_TIME_H__
#define __CL_CPU_TIME_H__

#include "clICPUTime.h"

#define CL_CPU_TIME_CONTRACT_ID "@clear-code.com/cpu/time;1"
#define CL_CPU_TIME_CID {0x7b5c3cbb, 0x0185, 0x4f6b, {0x8f, 0xc7, 0x9c, 0x12, 0x6c, 0xcc, 0x81, 0xb0}}

class clCPUTime : public clICPUTime
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_CLICPUTIME

  clCPUTime(float aUser, float aNice, float aSystem, float aIdle, float aIOWait);

  virtual ~clCPUTime();

private:
  float mUser;
  float mNice;
  float mSystem;
  float mIdle;
  float mIOWait;
};

#endif /* __CL_CPU_TIME_H__ */
