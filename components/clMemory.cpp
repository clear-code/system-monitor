#include "clMemory.h"

#include <nsIClassInfoImpl.h>
#include <nsMemory.h>

#ifdef HAVE_LIBGTOP2
#include <glibtop/mem.h>
#elif defined(XP_WIN)
#include <windows.h>
#elif defined(XP_MACOSX)
#include <mach/mach_init.h>
#include <mach/host_info.h>
#include <mach/mach_host.h>
#endif

NS_IMPL_ISUPPORTS2_CI(clMemory,
                      clIMemory,
                      nsISecurityCheckedComponent)

clMemory::clMemory()
{
  /* member initializers and constructor code */
#ifdef HAVE_LIBGTOP2
#define CL_MEMORY_AVAILABLE_TOTAL
#define CL_MEMORY_AVAILABLE_USED
#define CL_MEMORY_AVAILABLE_FREE
  glibtop_mem memory;
  glibtop_get_mem(&memory);

  mTotal = memory.total;
  mUsed = memory.used - memory.cached;
  mFree = mTotal - mUsed;
#elif defined(XP_WIN)
#define CL_MEMORY_AVAILABLE_TOTAL
#define CL_MEMORY_AVAILABLE_USED
#define CL_MEMORY_AVAILABLE_FREE
#define CL_MEMORY_AVAILABLE_VIRTUAL_USED
  MEMORYSTATUSEX memory;
  memory.dwLength=sizeof(memory);
  GlobalMemoryStatusEx(&memory);

  mTotal = memory.ullTotalPhys;
  mFree = memory.ullAvailPhys;
  mUsed = mTotal - mFree;
  mVirtualUsed = memory.ullTotalVirtual - memory.ullAvailVirtual;
#elif defined(XP_MACOSX)
#define CL_MEMORY_AVAILABLE_TOTAL
#define CL_MEMORY_AVAILABLE_USED
#define CL_MEMORY_AVAILABLE_FREE
  host_basic_info total_memory;
  mach_msg_type_number_t total_count = HOST_BASIC_INFO_COUNT;
  host_info(mach_host_self(), HOST_BASIC_INFO, (host_info_t) &total_memory, &total_count);

  mTotal = host.memory_size;

  vm_statistics memory;
  mach_msg_type_number_t count = HOST_VM_INFO_COUNT;
  host_statistics(mach_host_self(), HOST_VM_INFO, (host_info_t) &memory, &count);

  mFree = memory.free_count * vm_page_size;
#endif
}

clMemory::~clMemory()
{
  /* destructor code */
}

/* readonly attribute PRUint64 total; */
NS_IMETHODIMP clMemory::GetTotal(PRUint64 *aTotal)
{
#ifdef CL_MEMORY_AVAILABLE_TOTAL
    *aTotal = mTotal;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 used; */
NS_IMETHODIMP clMemory::GetUsed(PRUint64 *aUsed)
{
#ifdef CL_MEMORY_AVAILABLE_USED
    *aUsed = mUsed;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 free; */
NS_IMETHODIMP clMemory::GetFree(PRUint64 *aFree)
{
#ifdef CL_MEMORY_AVAILABLE_FREE
    *aFree = mFree;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

/* readonly attribute PRUint64 virtualUsed; */
NS_IMETHODIMP clMemory::GetVirtualUsed(PRUint64 *aVirtualUsed)
{
#ifdef CL_MEMORY_AVAILABLE_VIRTUAL_USED
    *aVirtualUsed = mVirtualUsed;
    return NS_OK;
#else
    return NS_ERROR_NOT_IMPLEMENTED;
#endif
}

static char *
cloneAllAccessString (void)
{
    static const char allAccessString[] = "allAccess";
    return (char*)nsMemory::Clone(allAccessString, sizeof(allAccessString));
}

NS_IMETHODIMP
clMemory::CanCreateWrapper(const nsIID * iid, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanCallMethod(const nsIID * iid, const PRUnichar *methodName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanGetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}

NS_IMETHODIMP
clMemory::CanSetProperty(const nsIID * iid, const PRUnichar *propertyName, char **_retval NS_OUTPARAM)
{
    *_retval = cloneAllAccessString();
    return NS_OK;
}
