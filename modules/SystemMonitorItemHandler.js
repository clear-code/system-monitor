var EXPORTED_SYMBOLS = ["SystemMonitorItemHandler"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var { SystemMonitorManager } = Components.utils.import("resource://system-monitor-modules/SystemMonitorManager.js", {});
var { StringBundle } = Components.utils.import("resource://system-monitor-modules/StringBundle.js", {});

var { Deferred } = Components.utils.import("resource://system-monitor-modules/lib/jsdeferred.js", {});
var { prefs } = Components.utils.import("resource://system-monitor-modules/lib/prefs.js", {});
var { resizableToolbarItem } = Components.utils.import("resource://system-monitor-modules/lib/resizableToolbarItem.jsm", {});
var { confirmWithTab } = Components.utils.import("resource://system-monitor-modules/lib/confirmWithTab.js", {});

function SystemMonitorItemHandler(toolbarItem) {
  // new SystemMonitorCPUItem(),
  // new SystemMonitorMemoryItem()

  this.toolbarItem = toolbarItem;
  // window.alert(Cu.getGlobalForObject(toolbarItem)); Backstage Pass
  this.window      = toolbarItem.window; // Cu.getGlobalForObject(toolbarItem);
  this.document    = this.window.document;
}

SystemMonitorItemHandler.prototype = {
  domain : SystemMonitorManager.DOMAIN,

  initialized : false,
  resizing : false,
  items : [],

  init: function SystemMonitorItemHandler_init(aEvent) {
    aEvent.target.removeEventListener("load", this, false);
    aEvent.target.addEventListener("unload", this, false);

    this.updateToolbarMethods();
    this.initialized = true;

    this.window.setTimeout(function(aSelf) {
      aSelf.initToolbarItem();
      aSelf.initialShow();
    }, 100, this);
  },

  destroy : function SystemMonitorItemHandler_destroy(aEvent) {
    aEvent.target.removeEventListener("unload", this, false);
    this.destroyToolbarItem();
  },


  // toolbar customize
  updateToolbarMethods : function SystemMonitorItemHandler_updateToolbarMethods() {
    // TODO: use event handler instread of eval
    var window = this.window;

    if ("BrowserCustomizeToolbar" in window) {
      window.eval("window.BrowserCustomizeToolbar = "+
           window.BrowserCustomizeToolbar.toSource().replace(
             "{",
             "{ SystemMonitorItemHandler.destroyToolbarItem(); "
           )
          );
    }
    if ("CustomizeMailToolbar" in window) {
      window.eval("window.CustomizeMailToolbar = "+
           window.CustomizeMailToolbar.toSource().replace(
             "{",
             "{ SystemMonitorItemHandler.destroyToolbarItem(); "
           )
          );
    }
    var toolbox = this.document.getElementById("navigator-toolbox") ||
          this.document.getElementById("mail-toolbox");
    if (toolbox && toolbox.customizeDone) {
      toolbox.__systemmonitor__customizeDone = toolbox.customizeDone;
      toolbox.customizeDone = function(aChanged) {
        this.__systemmonitor__customizeDone(aChanged);
        SystemMonitorItemHandler.initToolbarItem();
      };
    }
    if ("BrowserToolboxCustomizeDone" in window) {
      window.__systemmonitor__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
      window.BrowserToolboxCustomizeDone = function(aChanged) {
        window.__systemmonitor__BrowserToolboxCustomizeDone.apply(window, arguments);
        SystemMonitorItemHandler.initToolbarItem();
      };
    }
    if ("MailToolboxCustomizeDone" in window) {
      window.__systemmonitor__MailToolboxCustomizeDone = window.MailToolboxCustomizeDone;
      window.MailToolboxCustomizeDone = function() {
        window.__systemmonitor__MailToolboxCustomizeDone.apply(window, arguments);
        SystemMonitorItemHandler.initToolbarItem();
      };
    }
  },

  initToolbarItem : function SystemMonitorItemHandler_initToolbarItem() {
    this.toolbarItem.init();
    var self = this;
    Deferred.next(function() {
      resizableToolbarItem.insertSplitters(self.window);
    });
  },

  destroyToolbarItem : function SystemMonitorItemHandler_destroyToolbarItem() {
    this.toolbarItem.destroy();
    resizableToolbarItem.removeSplitters(this.window);
  },

  initialShow : function SystemMonitorItemHandler_initialShow() {
    var bar;
    var document = this.document;

    prefs.getPref(this.domain+"defaultTargetToolbar")
      .split(/[,\s]+/)
      .some(function(aTarget) {
        bar = document.getElementById(aTarget);
        if (bar && bar.boxObject.height && bar.boxObject.width)
          return true;
      });
    if (!bar || !bar.currentSet)
      return;

    var currentset = bar.currentSet;
    var buttons = currentset.replace(/__empty/, "").split(",");

    var insertionPoint = buttons.length - 1;
    for (let i = insertionPoint; i > -1; i--) {
      let item = document.getElementById(buttons[i]);
      if (item && item.boxObject.width) {
        insertionPoint = i;
        break;
      }
    }
    if (insertionPoint < 0)
      insertionPoint = buttons.lenght - 1;

    var autoInsertedItems = [];
    if (prefs.getPref(this.domain + this.toolbarItem.id + ".initialShow"))
      return;

    if (currentset.indexOf(this.toolbarItem.itemId) < 0) {
      if (currentset.indexOf("spring") < 0 &&
          currentset.indexOf("urlbar-container") < 0 &&
          currentset.indexOf("search-container") < 0 &&
          buttons.indexOf("spring") < 0)
        buttons.splice(++insertionPoint, 0, "spring");
      buttons.splice(++insertionPoint, 0, this.toolbarItem.itemId);
      autoInsertedItems.push(this.toolbarItem.id);
    }

    currentset = bar.currentSet.replace(/__empty/, "");
    var newset = buttons.join(",");
    if (currentset == newset)
      return;

    var self = this;
    this.confirmInsertToolbarItems()
      .next(function(aInsert) {
        for each (let item in autoInsertedItems) {
          self.prefs.setPref(self.domain+item+".initialShow", true);
        }
        if (!aInsert)
          return;
        bar.currentSet = newset;
        bar.setAttribute("currentset", newset);
        document.persist(bar.id, "currentset");
        if ("BrowserToolboxCustomizeDone" in window) {
          Deferred.next(function() {
            self.window.BrowserToolboxCustomizeDone(true);
          });
        }
        else if ("MailToolboxCustomizeDone" in window) {
          Deferred.next(function() {
            self.window.MailToolboxCustomizeDone(null, 'CustomizeMailToolbar');
          });
        }
      });
  },
  confirmInsertToolbarItems : function SystemMonitorItemHandler_confirmInsertToolbarItems() {
    return confirmWithTab({
      tab         : this.window.gBrowser.selectedTab,
      label       : StringBundle.systemMonitor.getString("initialshow_confirm_text"),
      value       : "system-monitor-insert-toolbar-items",
      persistence : -1, // don't hide automatically by page loadings
      buttons     : [
        StringBundle.systemMonitor.getString("initialshow_confirm_yes"),
        StringBundle.systemMonitor.getString("initialshow_confirm_no")
      ]
    }).next(function(aButtonIndex) {
      return aButtonIndex == 0;
    });
  },

  // nsIDOMEventListener
  handleEvent : function SystemMonitorItemHandler_handleEvent(aEvent) {
    switch (aEvent.type) {
    case "load":
      this.init(aEvent);
      break;
    case "unload":
      this.destroy(aEvent);
      break;
    }
  }
};
