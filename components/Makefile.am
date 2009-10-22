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
	clICPUTime.idl

XPT_FILES = 			\
	clISystem.xpt		\
	clICPU.xpt		\
	clICPUTime.xpt

INTERFACE_FILES = 		\
	clISystem.h		\
	clICPU.h		\
	clICPUTime.h

$(INTERFACE_FILES):
	(for idl in $(IDL_FILES); do \
	    $(XPIDL) -m typelib -I$(XPCOM_IDL_PATH) $$idl;	\
	    $(XPIDL) -m header -I$(XPCOM_IDL_PATH) $$idl;	\
	 done)
