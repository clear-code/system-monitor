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
    component_shared="components/clSystemMonitor.so"
    ;;
  Darwin)
    build_type=Release
    xcodebuild_args="-project clSystemMonitor.xcodeproj -configuration $build_type"
    (cd components && xcodebuild $xcodebuild_args) || exit 1
    component_shared="components/libclSystemMonitor.dylib"
    cp components/build/$build_type/libclSystemMonitor.dylib $component_shared
    ;;
  CYGWIN*)
    build_type=Release
    if which devenv > /dev/null; then
    DEVENV="devenv"
    else
    DEVENV="/cygdrive/c/Program Files/Microsoft Visual Studio 8/Common7/IDE/devenv.exe"
    fi
    "$DEVENV" /Build $build_type components/clSystemMonitor/systemMonitor.sln || exit 1
    component_shared="components/clSystemMonitor.dll"
    cp components/systemMonitor/$build_type/clSystemMonitor.dll $component_shared
    ;;
  *)
    echo "Unknown environment"
    exit 1
    ;;
esac

component_xpt="components/*.xpt"
components="$component_xpt $component_shared"

xpi_contents="content $components chrome.manifest install.rdf"

rm -f $xpi
zip -q -r -9 $xpi $xpi_contents -x \*/.git/\* || exit 1

