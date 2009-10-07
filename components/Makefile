CXX = c++
CXXFLAGS = -g -Wall -fno-rtti -fno-exceptions -shared

XULRUNNER_PACKAGE_NAME = libxul-unstable
PKG_CONFIG = pkg-config

GECKO_SDK_PATH = `$(PKG_CONFIG) --variable=sdkdir $(XULRUNNER_PACKAGE_NAME)`
GECKO_IDL_PATH = `$(PKG_CONFIG) --variable=idldir $(XULRUNNER_PACKAGE_NAME)`/stable
GECKO_LIB_PATH = $(GECKO_SDK_PATH)/lib

LIBGTOP_CFLAGS = `$(PKG_CONFIG) --cflags libgtop-2.0`
LIBGTOP_LIBS = `$(PKG_CONFIG) --libs libgtop-2.0`

XPIDL = $(GECKO_SDK_PATH)/bin/xpidl

GECKO_INCLUDES = `$(PKG_CONFIG) --cflags $(XULRUNNER_PACKAGE_NAME)`
GECKO_CFLAGS  = -DXPCOM_GLUE -DXPCOM_GLUE_USE_NSPR $(GECKO_INCLUDES)

GECKO_LDFLAGS = `$(PKG_CONFIG) --libs-only-L $(XULRUNNER_PACKAGE_NAME)`
GECKO_LIBS =	-lxpcomglue_s			\
		-lnspr4				\
		-lplds4

OBJS = 				\
	clCPUTime.o		\
	clCPUMonitor.o		\
	clSystem.o		\
	clSystemMonitorModule.o

IDL = 				\
	clICPUTime.idl		\
	clICPUMonitor.idl	\
	clISystem.idl

XPT = 				\
	clICPUTime.xpt		\
	clICPUMonitor.xpt	\
	clISystem.xpt

IHEADER = 			\
	clICPUTime.h		\
	clICPUMonitor.h		\
	clISystem.h

SHARED = clSystemMonitor.so

all: $(XPT) $(SHARED)

.SUFFIXES:	.idl .xpt
.idl.xpt:
	$(XPIDL) -m typelib -I$(GECKO_IDL_PATH) $<

.idl.h:
	$(XPIDL) -m header -I$(GECKO_IDL_PATH) $<

$(SHARED): $(IHEADER) $(OBJS)
	$(CXX) $(CXXFLAGS) $(GECKO_LDFLAGS) -o $(SHARED) $(OBJS) $(GECKO_LIBS) $(LIBGTOP_LIBS)

clean:
	rm -f $(XPT) $(IHEADER) $(OBJS) $(SHARED)

.cpp.o:
	$(CXX) $(CXXFLAGS) $(GECKO_CFLAGS) $(LIBGTOP_CFLAGS) -c $<

