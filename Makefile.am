# -*- Mode: Makefile; tab-width: 8; indent-tabs-mode: t; -*-
SUBDIRS = components

ACLOCAL_AMFLAGS = -I m4macros $$ACLOCAL_OPTIONS

noinst_DATA = deploy xpi

JAR_TARGET_FILES = 					\
	content					\
	locale					\
	skin

XPI_TARGET_FILES = 					\
	install.rdf				\
	components/*.js				\
	components/gecko2*/*.xpt			\
	chrome				\
	defaults				\
	modules				\
	chrome.manifest

XPI_TARGET_FILES_LEGACY = $(XPI_TARGET_FILES)	\
	components/*.xpt			\
	platform

if PLATFORM_WINNT
BINARY_SOURCE_DIR = components/SystemMonitor/Release
else
BINARY_SOURCE_DIR = components/.libs
endif

deploy:
	(mkdir -p platform/$(PLATFORM)_$(CPU)-$(COMPILER)/components && \
	 cp $(BINARY_SOURCE_DIR)/clSystemMonitor$(SHARED_LIBRARY_SUFFIX) \
	 platform/$(PLATFORM)_$(CPU)-$(COMPILER)/components/)

xpi:
	(rm -rf chrome && \
	 mkdir -p chrome && \
	 zip -q -r -9 chrome/$(PACKAGE_NAME).jar $(JAR_TARGET_FILES) -x \*.git/\* && \
	 rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi && \
	 rm -f components/*.xpt && \
	 cp components/gecko1.9.2/*.xpt components/ && \
	 rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi && \
	 zip -q -r -9 $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(XPI_TARGET_FILES) -x \*.git/\* && \
	 cp -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi && \
	 rm -rf xpi_temp && \
	 mkdir -p xpi_temp && \
	 sed -e "s#^.*<em:*\\(updateURL\\|updateKey\\)>.*</em:*\\(updateURL\\|updateKey\\)>##g" -e "s#^.*em:*\\(updateURL\\|updateKey\\)=\\(\\".*\\"\\|'.*'\\)##g" install.rdf > xpi_temp/install.rdf && \
	 cd xpi_temp && \
	 zip -q -9 ../$(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi install.rdf && \
	 cd ..)

legacy-xpi:
	(rm -rf chrome && \
	 mkdir -p chrome && \
	 zip -q -r -9 chrome/$(PACKAGE_NAME).jar $(JAR_TARGET_FILES) -x \*.git/\* && \
	 rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi && \
	 rm -f components/*.xpt && \
	 cp components/gecko1.9.2/*.xpt components/ && \
	 rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi && \
	 zip -q -r -9 $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(XPI_TARGET_FILES_LEGACY) -x \*.git/\* && \
	 cp -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi && \
	 rm -rf xpi_temp && \
	 mkdir -p xpi_temp && \
	 sed -e "s#^.*<em:*\\(updateURL\\|updateKey\\)>.*</em:*\\(updateURL\\|updateKey\\)>##g" -e "s#^.*em:*\\(updateURL\\|updateKey\\)=\\(\\".*\\"\\|'.*'\\)##g" install.rdf > xpi_temp/install.rdf && \
	 cd xpi_temp && \
	 zip -q -9 ../$(PACKAGE_NAME)-$(PACKAGE_VERSION)-noupdate.xpi install.rdf && \
	 cd ..)

