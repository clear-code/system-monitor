# -*- Mode: Makefile; tab-width: 8; indent-tabs-mode: t; -*-
SUBDIRS = components

ACLOCAL_AMFLAGS = -I m4macros $$ACLOCAL_OPTIONS

noinst_DATA = xpi

TARGET_FILES = 					\
	install.rdf				\
	components/*.js				\
	components/*.xpt			\
	content					\
	locale					\
	skin					\
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

xpi: deploy
	(rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi && \
	 zip -q -r -9 $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi $(TARGET_FILES) -x \*.git/\*)

