AC_DEFUN([AC_CHECK_XULRUNNER],
[
  AC_ARG_WITH(libxul-sdk,
  [  --with-libxul-sdk=PFX   Use the libXUL SDK at <PFX>],
    LIBXUL_SDK_DIR=$withval)
  
  if test "$LIBXUL_SDK_DIR" = "yes"; then
      AC_MSG_ERROR([--with-libxul-sdk must specify a path])
  elif test -n "$LIBXUL_SDK_DIR" -a "$LIBXUL_SDK_DIR" != "no"; then
      LIBXUL_SDK=`cd "$LIBXUL_SDK_DIR" && pwd`
      if test "$PLATFORM" = "WINNT"; then
          XPCOM_IDL_PATH="`cygpath -w $LIBXUL_SDK/idl`"
      else
          XPCOM_IDL_PATH="$LIBXUL_SDK/idl"
      fi
      XPCOM_LDFLAGS="-L$LIBXUL_SDK/lib"
      XPCOM_CFLAGS="-fshort-wchar"
      XPCOM_CFLAGS="$XPCOM_CFLAGS -I$LIBXUL_SDK/include"
      XPCOM_CFLAGS="$XPCOM_CFLAGS -I$LIBXUL_SDK/sdk/include"
      XPCOM_CFLAGS="$XPCOM_CFLAGS -I$LIBXUL_SDK/include/xpcom" # nsIVariant.h nsITimer.h
      XPCOM_CFLAGS="$XPCOM_CFLAGS -I$LIBXUL_SDK/include/dom" # nsIScriptNameSpaceManager.h
      XPCOM_CFLAGS="$XPCOM_CFLAGS -I$LIBXUL_SDK/include/caps" # nsISecurityCheckedComponent.h
  else
      XULRUNNER_PACKAGE_NAME="libxul-unstable"
      PKG_CHECK_MODULES(XPCOM, $XULRUNNER_PACKAGE_NAME)

      LIBXUL_SDK=`$PKG_CONFIG --variable=sdkdir $XULRUNNER_PACKAGE_NAME`
      XPCOM_IDL_PATH=`$PKG_CONFIG --variable=idldir $XULRUNNER_PACKAGE_NAME`
      XPCOM_LDFLAGS=`$PKG_CONFIG --libs-only-L $XULRUNNER_PACKAGE_NAME`
  fi
  XPCOM_LIBS="-lxpcomglue_s_nomozalloc -lnspr4 -lplds4"
  XPIDL="$LIBXUL_SDK/bin/xpidl"
  AC_SUBST(LIBXUL_SDK)
  AC_SUBST(XPCOM_IDL_PATH)
  AC_SUBST(XPIDL)
  AC_SUBST(XPCOM_LIBS)
  AC_SUBST(XPCOM_LDFLAGS)
  AC_SUBST(XPCOM_CFLAGS)
])
