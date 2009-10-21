AC_DEFUN([AC_CHECK_XULRUNNER],
[
  AC_ARG_WITH(libxul-sdk,
  [  --with-libxul-sdk=PFX   Use the libXUL SDK at <PFX>],
    LIBXUL_SDK_DIR=$withval)
  
  if test "$LIBXUL_SDK_DIR" = "yes"; then
      AC_MSG_ERROR([--with-libxul-sdk must specify a path])
  elif test -n "$LIBXUL_SDK_DIR" -a "$LIBXUL_SDK_DIR" != "no"; then
      LIBXUL_SDK=`cd "$LIBXUL_SDK_DIR" && pwd`
  
      if test ! -f "$LIBXUL_SDK/xulrunner-stub$EXE_EXT"; then
          AC_MSG_ERROR([$LIBXUL_SDK/xulrunner-stub$EXE_EXT doesn't exist])
      fi
      if test -f "$LIBXUL_SDK/mozce_shunt$LIB_EXT"; then
          has_moz_shunt = yes;
      fi
  fi
  AC_SUBST(LIBXUL_SDK)
  AM_CONDITIONAL([HAS_MOZ_SHUNT], [test x"$has_moz_shunt" == "xyes"])

  SHARED_LIBRARY_SUFFIX="$shrext_cmds"
  AC_SUBST(SHARED_LIBRARY_SUFFIX)
  
  APP_BUILD_ID=`date +%Y%m%d%H%M%S`
  AC_SUBST(APP_BUILD_ID)
  
  DEFAULTS_PREFS_DIR="defaults/preferences"
  AC_SUBST(DEFAULTS_PREFS_DIR)
  
  DEFAULT_PREFS_JS="$PACKAGE_NAME-prefs.js"
  AC_SUBST(DEFAULT_PREFS_JS)
  
  BINARY_FILE="$PACKAGE_NAME$EXE_EXT"
  AC_SUBST(BINARY_FILE)
  
  APPLICATION_INI="application.ini"
  AC_SUBST(APPLICATION_INI)

])
