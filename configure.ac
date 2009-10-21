dnl Process this file with autoconf to produce a configure script.
AC_PREREQ(2.56)

AC_INIT(system-monitor, 0.2, [info@clear-code.com])
AM_INIT_AUTOMAKE($PACKAGE_NAME, $PACKAGE_VERSION)
AC_CONFIG_MACRO_DIR([m4macros])

AM_CONFIG_HEADER([config.h])

AM_PROG_LIBTOOL
AC_PATH_PROG([PKG_CONFIG], [pkg-config], [no])

AC_PROG_CXX
AC_PROG_CPP

case "$host_os" in
  mingw*|cygwin*)
    PLATFORM="WINNT"
    COMPILER="msvc"
    ;;
  darwin*)
    PLATFORM="Darwin"
    COMPILER="gcc3"
    ;;
  linux-*)
    PLATFORM="Linux"
    COMPILER="gcc3"
    ;;
esac
AC_SUBST(PLATFORM)
AC_SUBST(COMPILER)

case "$host_cpu" in
  i*)
    CPU="x86"
    ;;
esac
AC_SUBST(CPU)

AC_CHECK_XULRUNNER

libgtop2_exists=no
PKG_CHECK_MODULES(LIBGTOP2, libgtop-2.0,
		  [libgtop2_exists=yes], [libgtop2_exists=no])
if test x"$libgtop2_exists" = "xyes"; then
  libgtop2_available=yes
  AC_DEFINE(HAVE_LIBGTOP2, 1, [Define to 1 if you use libgtop-2.0])
else
  libgtop2_available=no
fi

SHARED_LIBRARY_SUFFIX="$shrext_cmds"
AC_SUBST(SHARED_LIBRARY_SUFFIX)

EXTENSION_CXXFLAGS="-DXPCOM_GLUE -DXPCOM_GLUE_USE_NSPR"
EXTENSION_CXXFLAGS="$EXTENSION_CXXFLAGS $XPCOM_CFLAGS"
EXTENSION_CXXFLAGS="$EXTENSION_CXXFLAGS $LIBGTOP2_CFLAGS"
AC_SUBST(EXTENSION_CXXFLAGS)

AC_CONFIG_FILES([
Makefile
install.rdf
chrome.manifest
components/Makefile
])

AC_OUTPUT
