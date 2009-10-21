# -*- Mode: Makefile; tab-width: 8; indent-tabs-mode: t; -*-
SUBDIRS = components

ACLOCAL_AMFLAGS = -I m4macros $$ACLOCAL_OPTIONS

all: deploy xpi

deploy:
	cp components/.libs/clSystemMonitor$(SHARED_LIBRARY_SUFFIX) \
	platform/$(PLATFORM)_$(CPU)-$(COMPILER)/components/
xpi:
	(rm -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi && \
	 zip -q -r -9 $(PACKAGE_NAME)-$(PACKAGE_VERSION).xpi install.rdf components/*.js components/*.xpt content locale skin defaults platform chrome.manifest -x \*.git/\*)

