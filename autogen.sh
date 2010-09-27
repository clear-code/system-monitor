#!/bin/sh

srcdir=`dirname $0`
test -z "$srcdir" && srcdir=.

run()
{
    $@
    if test $? -ne 0; then
	echo "Failed $@"
	exit 1
    fi
}

case `uname -s` in
    Darwin)
	: ${LIBTOOLIZE:=glibtoolize}
	: ${ACLOCAL_OPTIONS:="-I /opt/local/share/aclocal"}
	;;
    CYGWIN)
	: ${ACLOCAL_OPTIONS:="-I /usr/share/aclocal"}
	;;
esac

run ${ACLOCAL:-aclocal} -I m4macros $ACLOCAL_OPTIONS
run ${LIBTOOLIZE:-libtoolize} --copy --force
run ${AUTOHEADER:-autoheader}
run ${AUTOMAKE:-automake} --add-missing --foreign --copy
run ${AUTOCONF:-autoconf}
