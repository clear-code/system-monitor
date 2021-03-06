#!/bin/bash

case $(uname) in
  Darwin|*BSD|CYGWIN*) sed="sed -E" ;;
  *)                   sed="sed -r" ;;
esac

extract() {
  grep "$1" VERSION | \
    cut -d "=" -f 2 | \
    $sed -e "s/^ +| +\$//g" | \
    tr -d "\r" | tr -d "\n"
}

PACKAGE_NAME=$(extract PACKAGE_NAME)
PACKAGE_VERSION=$(extract PACKAGE_VERSION)

BASENAME=${PACKAGE_NAME}-${PACKAGE_VERSION}

XPI_TARGET_FILES="install.rdf chrome.manifest content locale skin components/*.js defaults modules"


main() {
  cleanup

  fill install.rdf
  fill chrome.manifest

  makexpi
}

fill() {
  $sed -e "s/@PACKAGE_NAME@/${PACKAGE_NAME}/g" \
       -e "s/@PACKAGE_VERSION@/${PACKAGE_VERSION}/g" \
       ./$1.in \
    > $1
}

cleanup() {
  rm -rf xpi_temp
  rm -f ${BASENAME}.xpi
  rm -f ${BASENAME}-noupdate.xpi
}

makexpi() {
  zip -q -r -9 ${BASENAME}.xpi ${XPI_TARGET_FILES} -x *.git/*

  cp -f ${BASENAME}.xpi ${BASENAME}-noupdate.xpi
  mkdir -p xpi_temp
  sed -e "s#^.*<em:*\(updateURL\|updateKey\)>.*</em:*\(updateURL\|updateKey\)>##g" \
      -e "s#^.*em:*\(updateURL\|updateKey\)=\(\".*\"\|'.*'\)##g" install.rdf \
      > xpi_temp/install.rdf
  (cd xpi_temp &&
   zip -q -9 ../${BASENAME}-noupdate.xpi install.rdf)
}

main

exit 0
