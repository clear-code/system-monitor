# -*- Mode: Makefile; tab-width: 8; indent-tabs-mode: t; -*-

PACKAGE_NAME = system-monitor
PACKAGE_VERSION = 0.7.0

xpi:
	./makexpi.sh $(PACKAGE_NAME) $(PACKAGE_VERSION)
