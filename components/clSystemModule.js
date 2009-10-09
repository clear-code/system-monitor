
const CL_SYSTEM_CONTRACT_ID = "@clear-code.com/system;1";
const CL_SYSTEM_CID = Components.ID("{4d62df13-deee-4d5a-a7d9-2cabe54c7930}");
const clICPU = Components.interfaces.clICPU;
const clISystem = Components.interfaces.clISystem;
const nsIClassInfo = Components.interfaces.nsIClassInfo;
const nsISupports = Components.interfaces.nsISupports;

function clSystem() {
}

clSystem.prototype = {
    flags : nsIClassInfo.DOM_OBJECT,
    classDescription : "System",
    cpu : Components.classes["@clear-code.com/system/cpu;1"].getService(clICPU),

    getInterfaces : function(count) {
        var interfaceList = [clISystem, nsIClassInfo];
        count.value = interfaceList.length;
        return interfaceList;
    },
    
    getHelperForLanguage : function(count) {
        return null;
    },

    QueryInterface : function(iid) {
        if (iid.equals(clISystem) ||
            iid.equals(nsIClassInfo) ||
            iid.equals(nsISupports)) {
            return this;
        }
    
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }
};

var clSystemModule = {
    registerSelf : function(compMgr, fileSpec, location, type) {
        compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

        compMgr.registerFactoryLocation(CL_SYSTEM_CID,
                                        "System JS Component",
                                        CL_SYSTEM_CONTRACT_ID,
                                        fileSpec,
                                        location,
                                        type);

        const CATMAN_CONTRACTID = "@mozilla.org/categorymanager;1";
        const nsICategoryManager = Components.interfaces.nsICategoryManager;
        var catman = Components.classes[CATMAN_CONTRACTID].
                                getService(nsICategoryManager);

        const JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY = "JavaScript global property";

        catman.addCategoryEntry(JAVASCRIPT_GLOBAL_PROPERTY_CATEGORY,
                                "system",
                                CL_SYSTEM_CONTRACT_ID,
                                true,
                                true);
    },

    getClassObject : function(compMgr, cid, iid) {
        if (!cid.equals(CL_SYSTEM_CID))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        if (!iid.equals(Components.interfaces.nsIFactory))
            throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

        return clSystemFactory;
    },

    canUnload : function(compMgr) {
        return true;
    },
};

var clSystemFactory = {
    createInstance : function(outer, iid) {
        if (outer != null)
            throw Components.results.NS_ERROR_NO_AGGREGATION;
    
        return (new clSystem()).QueryInterface(iid);
    }
};

function NSGetModule(compMgr, fileSpec) {
    return clSystemModule;
}

