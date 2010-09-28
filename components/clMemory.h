#ifndef __CL_MEMORY_H__
#define __CL_MEMORY_H__

#include <mozilla-config.h>

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clIMemory.h"

#include <nsISecurityCheckedComponent.h>
#define CL_MEMORY_CONTRACT_ID "@clear-code.com/system/memory;1"
#define CL_MEMORY_CID {0x32404cb9, 0x1d05, 0x4f80, {0x83, 0x88, 0x4f, 0x6a, 0xc2, 0x15, 0x76, 0x0b}}

class clMemory : public clIMemory
               , public nsISecurityCheckedComponent
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_CLIMEMORY
  NS_DECL_NSISECURITYCHECKEDCOMPONENT

  clMemory();

private:
  ~clMemory();

protected:
  PRUint64 mTotal;
  PRUint64 mUsed;
  PRUint64 mFree;
  PRUint64 mVirtualUsed;
};

#endif /* __CL_MEMORY_H__ */

