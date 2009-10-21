AC_DEFUN([AC_CHECK_XULRUNNER],
[
  AC_ARG_WITH(libxul-sdk,
  [  --with-libxul-sdk=PFX   Use the libXUL SDK at <PFX>],
    LIBXUL_SDK_DIR=$withval)
  
  if test "$LIBXUL_SDK_DIR" = "yes"; then
      AC_MSG_ERROR([--with-libxul-sdk must specify a path])
  elif test -n "$LIBXUL_SDK_DIR" -a "$LIBXUL_SDK_DIR" != "no"; then
      LIBXUL_SDK=`cd "$LIBXUL_SDK_DIR" && pwd`
      XPCOM_IDL_PATH="$LIBXUL_SDK/sdk/idl"
      XPCOM_LDFLAGS="$LIBXUL_SDK/lib"
  else
      XULRUNNER_PACKAGE_NAME="libxul-unstable"
      PKG_CHECK_MODULES(XPCOM, $XULRUNNER_PACKAGE_NAME)

      LIBXUL_SDK=`$PKG_CONFIG --variable=sdkdir $XULRUNNER_PACKAGE_NAME`
      XPCOM_IDL_PATH=`$PKG_CONFIG --variable=idldir $XULRUNNER_PACKAGE_NAME`/unstable
      XPCOM_LDFLAGS=`$PKG_CONFIG --libs-only-L $XULRUNNER_PACKAGE_NAME`
  fi
  XPCOM_LIBS="-lxpcomglue_s -lnspr4 -lplds4"
  XPIDL="$LIBXUL_SDK/bin/xpidl"
  AC_SUBST(LIBXUL_SDK)
  AC_SUBST(XPCOM_IDL_PATH)
  AC_SUBST(XPIDL)
  AC_SUBST(XPCOM_LIBS)
  AC_SUBST(XPCOM_LDFLAGS)
])
