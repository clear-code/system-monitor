# -*- Mode: Makefile; tab-width: 8; indent-tabs-mode: t; -*-
SUBDIRS = components

ACLOCAL_AMFLAGS = -I m4macros $$ACLOCAL_OPTIONS

noinst_DATA = xpi

JAR_TARGET_FILES = 					\
	content					\
	locale					\
	skin

XPI_TARGET_FILES = 					\
	install.rdf				\
	components/*.js				\
	components/*.xpt			\
	chrome				\
	defaults				\
	platform				\
	chrome.manifest

if PLATFORM_WINNT
BINARY_SOURCE_DIR = components/SystemMonitor/Release
else
BINARY_SOURCE_DIR = components/.libs
endif

deploy:
	mkdir -p platform/$(PLATFORM)_$(CPU)-$(COMPILER)/components && \
	cp $(BINARY_SOURCE_DIR)/clSystemMonitor$(SHARED_LIBRARY_SUFFIX) \
	platform/$(PLATFORM)_$(CPU)-$(COMPILER)/components/

jar:
	(rm -rf chrome && \
	mkdir -p chrome && \
	zip -q -r -9 chrome/$(PACKAGE_NAME).jar $(JAR_TARGET_FILES) -x \*.git/\*)

xpi: deploy jar
	(rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi && \
	 zip -q -r -9 $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(XPI_TARGET_FILES) -x \*.git/\*)

