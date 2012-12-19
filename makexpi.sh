#!/bin/bash

PACKAGE_NAME=$1
PACKAGE_VERSION=$2

BASENAME=${PACKAGE_NAME}-${PACKAGE_VERSION}

JAR_TARGET_FILES="content locale skin"
XPI_TARGET_FILES="install.rdf chrome.manifest chrome components/*.js defaults modules"


case $(uname) in
  Darwin|*BSD|CYGWIN*) sed="sed -E" ;;
  *)                   sed="sed -r" ;;
esac


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
  rm -rf chrome
  rm -rf xpi_temp
  rm -f ${BASENAME}.xpi
  rm -f ${BASENAME}-noupdate.xpi
}

makexpi() {
  mkdir -p chrome
  zip -q -r -9 chrome/${PACKAGE_NAME}.jar ${JAR_TARGET_FILES} -x *.git/*
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
