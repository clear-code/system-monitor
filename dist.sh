#!/bin/sh

cd `dirname $0`

if [ -x "`which gnused 2>&1 /dev/null`" ]; then
  SED=gnused
else
  SED=sed
fi

xpcom_name=system-monitor
version=`grep 'em:version=' install.rdf | $SED -e 's,/\?em:version="\(.*\)",\1,g'`
version=`echo $version | $SED -e 's/[[:space:]]//g'`

xpi=$xpcom_name-$version.xpi

case `uname` in
  Linux)
    (cd components && CXXFLAGS=-DHAVE_LIBGTOP make) || exit 1
    build_libraries="components/clSystemMonitor.so"
    platform_component_directory="Linux_x86-gcc3"
    ;;
  Darwin)
    build_type=Release
    xcodebuild_args="-project clSystemMonitor.xcodeproj -configuration $build_type"
    (cd components && xcodebuild $xcodebuild_args) || exit 1
    build_libraries="components/build/$build_type/libclSystemMonitor.dylib"
    platform_component_directory="Darwin_x86"
    ;;
  CYGWIN*)
    build_type=Release
    if which devenv > /dev/null; then
    DEVENV="devenv"
    else
    DEVENV="/cygdrive/c/Program Files/Microsoft Visual Studio 9.0/Common7/IDE/devenv.exe"
    fi
    "$DEVENV" /Build $build_type components/SystemMonitor/SystemMonitor.sln || exit 1
    build_libraries="components/SystemMonitor/$build_type/SystemMonitor.dll"
    platform_component_directory="WINNT_x86-msvc"
    ;;
  *)
    echo "Unknown environment"
    exit 1
    ;;
esac

cp -f $build_libraries platform/$platform_component_directory/components/
component_xpt="components/*.xpt"

xpi_contents="content locale skin defaults $component_xpt platform chrome.manifest install.rdf"

rm -f $xpi
zip -q -r -9 $xpi $xpi_contents -x \*/.git/\* || exit 1

