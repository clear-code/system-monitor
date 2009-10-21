AM_CXXFLAGS =				\
	-Wall -fno-rtti -fno-exceptions	\
	$(EXTENSION_CXXFLAGS)

noinst_LTLIBRARIES = clSystemMonitor.la

clSystemMonitor_la_SOURCES = 	\
	$(INTERFACE_HEADERS)	\
	clCPU.cpp		\
	clCPU.h			\
	clCPUTime.cpp		\
	clCPUTime.h		\
	clSystem.cpp		\
	clSystem.h		\
	clSystemModule.cpp

clSystemMonitor_la_LIBADD = 	\
	$(XPCOM_LIBS)		\
	$(LIBGTOP2_LIBS)

clSystemMonitor_la_LDFLAGS = 	\
	-avoid-version		\
	-export-dynamic $(no_undefined)		\
	-module			\
	$(XPCOM_LDFLAGS)

IDL_FILES = 			\
	clISystem.idl		\
	clICPU.idl		\
	clICPUTime.idl

XPT_FILESS = 			\
	clISystem.xpt		\
	clICPU.xpt		\
	clICPUTime.xpt

INTERFACE_FILES = 		\
	clISystem.h		\
	clICPU.h		\
	clICPUTime.h

$(XPT_FILES): $(IDL_FILES)
	$(XPIDL) -m typelib -I$(GECKO_IDL_PATH) $<

$(INTERFACE_FILES): $(IDLS)
	$(XPIDL) -m header -I$(GECKO_IDL_PATH) $<

