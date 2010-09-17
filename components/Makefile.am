AM_CXXFLAGS =				\
	-Wall -fno-rtti -fno-exceptions	\
	$(EXTENSION_CXXFLAGS)

CLEANFILES = 			\
	$(INTERFACE_FILES)	\
	$(XPT_FILES)

noinst_LTLIBRARIES = clSystemMonitor.la

clSystemMonitor_la_SOURCES = 	\
	$(XPT_FILES)		\
	$(INTERFACE_FILES)	\
	clCPU.cpp		\
	clCPU.h			\
	clCPUTime.cpp		\
	clCPUTime.h		\
	clMemory.h		\
	clMemory.cpp		\
	clSystem.cpp		\
	clSystem.h		\
	clSystemModule.cpp

clSystemMonitor_la_LIBADD = 	\
	$(XPCOM_LIBS)		\
	$(LIBGTOP2_LIBS)

clSystemMonitor_la_LDFLAGS = 	\
        -rpath `pwd`/.libs      \
	-avoid-version		\
	-export-dynamic $(no_undefined)		\
	-module			\
	$(XPCOM_LDFLAGS)

IDL_FILES = 			\
	clISystem.idl		\
	clICPU.idl		\
	clICPUTime.idl		\
	clIMemory.idl

XPT_FILES = 			\
	clISystem.xpt		\
	clICPU.xpt		\
	clICPUTime.xpt		\
	clIMemory.xpt

INTERFACE_FILES = 		\
	clISystem.h		\
	clICPU.h		\
	clICPUTime.h		\
	clIMemory.h

BUILT_SOURCES =			\
	$(XPT_FILES)		\
	$(INTERFACE_FILES)

.idl.xpt:
	$(XPIDL) -m typelib -I$(XPCOM_IDL_PATH) $<

.idl.h:
	$(XPIDL) -m header -I$(XPCOM_IDL_PATH) $<

SUFFIXES = .idl .xpt .h
