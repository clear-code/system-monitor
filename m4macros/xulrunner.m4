AC_DEFUN([AC_CHECK_XULRUNNER],
[
  AC_ARG_WITH(libxul-sdk,
  [  --with-libxul-sdk=PFX   Use the libXUL SDK at <PFX>],
    LIBXUL_SDK_DIR=$withval)
  
  if test "$LIBXUL_SDK_DIR" = "yes"; then
      AC_MSG_ERROR([--with-libxul-sdk must specify a path])
  elif test -n "$LIBXUL_SDK_DIR" -a "$LIBXUL_SDK_DIR" != "no"; then
      LIBXUL_SDK=`cd "$LIBXUL_SDK_DIR" && pwd`
  fi
  AC_SUBST(LIBXUL_SDK)
])
