/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Dave Townsend <dtownsend@oxymoronical.com>
 *   SHIMODA Hiroshi <shimoda@clear-code.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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

/* based on nsJSInstallTriggerGlobal.cpp */

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif /* HAVE_CONFIG_H */

#include "clSystem.h"

#include <jsapi.h>
#include <jsobj.h>
#include <nsIXPConnect.h>
#include <nsIScriptGlobalObject.h>
#include <nsDOMJSUtils.h>
#include <nsComponentManagerUtils.h>
#include <nsServiceManagerUtils.h>
#include <nsPIDOMWindow.h>

static nsresult
ConvertJSValToStr(JSContext *aContext, jsval aValue, nsString& aString)
{
    JSString *jsstring;

    if (!JSVAL_IS_NULL(aValue) &&
        (jsstring = JS_ValueToString(aContext, aValue)) != nsnull) {
        aString.Assign(reinterpret_cast<const PRUnichar*>(JS_GetStringChars(jsstring)));
        return NS_OK;
    }
    else {
        aString.Truncate();
        return NS_ERROR_FAILURE;
    }
}

static nsresult
ConvertJSValToMonitor(JSContext *aContext, jsval aValue, clISystemMonitor **aMonitor)
{
    nsresult rv;
    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    NS_ENSURE_SUCCESS(rv, rv);

    nsCOMPtr<clISystemMonitor> monitor;
    rv = xpc->WrapJS(aContext, JSVAL_TO_OBJECT(aValue), NS_GET_IID(clISystemMonitor), getter_AddRefs(monitor));
    if (NS_FAILED(rv) || !monitor)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aMonitor = monitor);
    return NS_OK;
}

static nsresult
GetGlobalFromObject(JSContext *aContext, JSObject *aObject, nsIDOMWindow **aGlobal)
{
    nsresult rv;
    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    NS_ENSURE_SUCCESS(rv, rv);

    JSObject* obj = aObject;
    while (JSObject *parent = JS_GetParent(aContext, obj)) {
        obj = parent;
    }
    if (!obj)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsIXPConnectWrappedNative> wrapper;
    rv = xpc->GetWrappedNativeOfJSObject(aContext, obj, getter_AddRefs(wrapper));
    if (NS_FAILED(rv) || !wrapper)
        return NS_ERROR_FAILURE;

    nsCOMPtr<nsPIDOMWindow> win = do_QueryWrappedNative(wrapper, &rv);
    if (NS_FAILED(rv) || !win)
        return NS_ERROR_FAILURE;

    NS_ADDREF(*aGlobal = win);
    return NS_OK;
}

static void
FinalizeSystem(JSContext *cx, JSObject *obj);

JSClass SystemClass = {
    "System",
    JSCLASS_HAS_PRIVATE,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_PropertyStub,
    JS_EnumerateStub,
    JS_ResolveStub,
    JS_ConvertStub,
    FinalizeSystem
};

static void
FinalizeSystem(JSContext *cx, JSObject *obj)
{
    nsISupports *nativeThis = (nsISupports*)JS_GetPrivate(cx, obj);

    if (nativeThis) {
        // get the js object
        nsIScriptObjectOwner *owner = nsnull;
        if (NS_OK == nativeThis->QueryInterface(NS_GET_IID(nsIScriptObjectOwner),
                                                (void**)&owner)) {
            owner->SetScriptObject(nsnull);
            NS_RELEASE(owner);
        }

        // The addref was part of JSObject construction
        NS_RELEASE(nativeThis);
    }
}

static JSBool
CreateNativeObject(JSContext *cx, JSObject *obj, clISystem **aResult)
{
    nsresult rv;
    nsIScriptObjectOwner *owner = nsnull;
    clISystem *nativeThis;

    static NS_DEFINE_CID(kCL_SYSTEM_CID, CL_SYSTEM_CID);

    rv = CallCreateInstance(kCL_SYSTEM_CID, &nativeThis);
    if (NS_FAILED(rv))
        return JS_FALSE;

    rv = nativeThis->QueryInterface(NS_GET_IID(nsIScriptObjectOwner),
                                    (void **)&owner);

    if (NS_FAILED(rv)) {
        NS_RELEASE(nativeThis);
        return JS_FALSE;
    }

    owner->SetScriptObject((void *)obj);
    JS_SetPrivate(cx, obj, nativeThis);

    *aResult = nativeThis;

    NS_RELEASE(nativeThis);  // we only want one refcnt. JSUtils cleans us up.
    return JS_TRUE;
}

static clISystem*
getNative(JSContext *cx, JSObject *obj)
{
    if (!JS_InstanceOf(cx, obj, &SystemClass, nsnull))
      return nsnull;

    clISystem *native = (clISystem*)JS_GetPrivate(cx, obj);
    if (!native) {
        CreateNativeObject(cx, obj, &native);
    }
    return native;
}

#include <stdio.h>
static JSBool
SystemGetCpu(JSContext *cx, JSObject *obj, jsid idval, jsval *rval)
{
    *rval = nsnull;

    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    nsCOMPtr<clICPU> cpu;
    rv = nativeThis->GetCpu(getter_AddRefs(cpu));
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Could not get CPU information.");
        return JS_FALSE;
    }

    nsCOMPtr<nsIWritableVariant> variant = do_CreateInstance("@mozilla.org/variant;1");
    const nsIID iid = cpu->GetIID();
    variant->SetAsInterface(iid, cpu);

    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Could not get XPConnect!");
        return JS_FALSE;
    }

    nsCOMPtr<nsIVariant> returnedVariant(do_QueryInterface(variant));
    JSObject *scope = ::JS_GetScopeChain(cx);
    rv = xpc->VariantToJS(cx, scope, returnedVariant, &*rval);
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Could not return CPU information as nsIVariant.");
        return JS_FALSE;
    }

    NS_IF_ADDREF(variant);

    return JS_TRUE;
}

static JSBool
SystemAddMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    *rval = JSVAL_FALSE;

    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    if (argc < 3) {
        JS_ReportError(cx, "addMonitor() requires 3 arguments.");
        return JS_FALSE;
    }

    nsAutoString topic;
    rv = ConvertJSValToStr(cx, argv[0], topic);
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Invalid topic is specified.");
        return JS_FALSE;
    }

    nsCOMPtr<clISystemMonitor> monitor;
    rv = ConvertJSValToMonitor(cx, argv[1], getter_AddRefs(monitor));
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Invalid monitor is specified.");
        return JS_FALSE;
    }

    uint32 interval;
    JS_ValueToECMAUint32(cx, argv[2], &interval);

    nsCOMPtr<nsIDOMWindow> owner;
    rv = GetGlobalFromObject(cx, obj, getter_AddRefs(owner));
    if (NS_FAILED(rv) || !owner) {
        static NS_DEFINE_CID(kCL_SYSTEM_CID, CL_SYSTEM_CID);
        nsCOMPtr<clISystem> nativeThis(do_GetService(kCL_SYSTEM_CID, &rv));
        if (NS_FAILED(rv)) {
            JS_ReportError(cx, "Could not get global system service.");
            return JS_FALSE;
        }
    }

    PRBool nativeRet = PR_FALSE;
    nsCOMPtr<clISystemInternal> nativeThisInternal(do_QueryInterface(nativeThis));
    rv = nativeThisInternal->AddMonitorWithOwner(topic, monitor, interval, owner, &nativeRet);
    if (owner)
        NS_RELEASE(owner);
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Failed to add monitor.");
        return JS_FALSE;
    }

    *rval = BOOLEAN_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSBool
SystemRemoveMonitor(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
    *rval = JSVAL_FALSE;

    nsresult rv;

    clISystem *nativeThis = getNative(cx, obj);
    if (!nativeThis)
        return JS_FALSE;

    if (argc < 2) {
        JS_ReportError(cx, "removeMonitor() requires 2 arguments.");
        return JS_FALSE;
    }

    nsAutoString topic;
    rv = ConvertJSValToStr(cx, argv[0], topic);
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Invalid topic is specified.");
        return JS_FALSE;
    }

    nsCOMPtr<clISystemMonitor> monitor;
    rv = ConvertJSValToMonitor(cx, argv[1], getter_AddRefs(monitor));
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Invalid monitor is specified.");
        return JS_FALSE;
    }

    nsCOMPtr<nsIDOMWindow> owner;
    rv = GetGlobalFromObject(cx, obj, getter_AddRefs(owner));
    if (NS_FAILED(rv) || !owner) {
        static NS_DEFINE_CID(kCL_SYSTEM_CID, CL_SYSTEM_CID);
        nsCOMPtr<clISystem> nativeThis(do_GetService(kCL_SYSTEM_CID, &rv));
        if (NS_FAILED(rv)) {
            JS_ReportError(cx, "Could not get global system service.");
            return JS_FALSE;
        }
    }

    PRBool nativeRet = PR_FALSE;
    rv = nativeThis->RemoveMonitor(topic, monitor, &nativeRet);
    if (NS_FAILED(rv)) {
        JS_ReportError(cx, "Failed to remove monitor.");
        return JS_FALSE;
    }

    *rval = BOOLEAN_TO_JSVAL(nativeRet);
    return JS_TRUE;
}

static JSPropertySpec SystemProperties[] = {
    { "cpu", 0, (JSPROP_SHARED | JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT), SystemGetCpu, nsnull },
    { 0, 0, 0, nsnull, nsnull }
};

static JSFunctionSpec SystemMethods[] = {
    { "addMonitor", SystemAddMonitor, 0, 0, 0 },
    { "removeMonitor", SystemRemoveMonitor, 0, 0, 0 },
    JS_FS_END
};

nsresult
InitSystemClass(JSContext *aContext, JSObject *aGlobal, void **aPrototype)
{
    JSObject *proto = nsnull;

    if (aPrototype != nsnull)
        *aPrototype = nsnull;

    proto = JS_InitClass(aContext,         // context
                         aGlobal,          // global object
                         nsnull,           // parent proto
                         &SystemClass,     // JSClass
                         nsnull,           // JSNative ctor
                         nsnull,           // ctor args
                         nsnull,           // proto props
                         nsnull,           // proto funcs
                         SystemProperties, // ctor props (static)
                         SystemMethods);   // ctor funcs (static)

    if (nsnull == proto)
        return NS_ERROR_FAILURE;

    if (aPrototype != nsnull)
        *aPrototype = proto;

    return NS_OK;
}

nsresult
CL_InitSystemClass(nsIScriptContext *aContext, void **aPrototype)
{
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    JSObject *proto = nsnull;
    JSObject *constructor = nsnull;
    JSObject *global = JS_GetGlobalObject(jscontext);
    jsval vp;

    if ((PR_TRUE != JS_LookupProperty(jscontext, global, "System", &vp)) ||
        !JSVAL_IS_OBJECT(vp) ||
        ((constructor = JSVAL_TO_OBJECT(vp)) == nsnull) ||
        (PR_TRUE != JS_LookupProperty(jscontext, JSVAL_TO_OBJECT(vp), "prototype", &vp)) ||
        !JSVAL_IS_OBJECT(vp)) {
        nsresult rv = InitSystemClass(jscontext, global, (void**)&proto);
        if (NS_FAILED(rv))
            return rv;
    }
    else if ((nsnull != constructor) && JSVAL_IS_OBJECT(vp)) {
        proto = JSVAL_TO_OBJECT(vp);
    }
    else {
        return NS_ERROR_FAILURE;
    }

    if (aPrototype)
        *aPrototype = proto;

    return NS_OK;
}

nsresult
CL_NewScriptSystem(nsIScriptContext *aContext, nsISupports *aSupports, void **aReturn)
{
    NS_PRECONDITION(nsnull != aContext && nsnull != aSupports && nsnull != aReturn,
                    "null argument to CL_NewScriptSystem");

    JSObject *proto;
    JSObject *parent = nsnull;
    JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
    nsresult rv = NS_OK;
    clISystem *system;

    nsCOMPtr<nsIScriptGlobalObject> global = aContext->GetGlobalObject();
    if (!global)
        return NS_ERROR_FAILURE;
    parent = global->GetGlobalJSObject();

    rv = CL_InitSystemClass(aContext, (void **)&proto);
    if (NS_FAILED(rv))
        return NS_ERROR_FAILURE;

    rv = CallQueryInterface(aSupports, &system);
    if (NS_FAILED(rv))
        return rv;

    // create a js object for this class
    *aReturn = JS_NewObject(jscontext, &SystemClass, proto, parent);
    if (nsnull != *aReturn) {
        // connect the native object to the js object
        JS_SetPrivate(jscontext, (JSObject *)*aReturn, system);
    }
    else {
        NS_RELEASE(system);
        return NS_ERROR_FAILURE;
    }

    return NS_OK;
}

