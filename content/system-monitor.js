Components.utils.import("resource://system-monitor-modules/ui.js");
Components.utils.import("resource://gre/modules/Promise.jsm");

var SystemMonitorService = {
  DOMAIN : SystemMonitorCPUItem.DOMAIN,

  initialized : false,
  resizing : false,
  items : [],

  log : function SystemMonitorService_log(aMessage) {
    if (this.prefs.getPref(this.DOMAIN + "debug.content"))
      dump(aMessage + "\n");
  },

  get bundle() {
    return document.getElementById("system-monitor-bundle");
  },

  get prefs() {
    if (!this._prefs) {
      var { prefs } = Components.utils.import("resource://system-monitor-modules/lib/prefs.js", {});
      this._prefs = prefs;
    }
    return this._prefs;
  },
  _prefs : null,

  get resizableToolbarItem() {
    if (!this._resizableToolbarItem) {
      try {
        var { resizableToolbarItem } = Components.utils.import("resource://system-monitor-modules/lib/resizableToolbarItem.jsm", {});
        this._resizableToolbarItem = resizableToolbarItem;
      }
      catch(e) {
      }
    }
    return this._resizableToolbarItem;
  },
  _resizableToolbarItem : null,

  init : function SystemMonitorService_init() {
    window.removeEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    this.initialized = true;

    this.items = [
      new SystemMonitorCPUItem(document),
      new SystemMonitorMemoryItem(document),
      new SystemMonitorNetworkItem(document)
    ];

    window.addEventListener("beforecustomization", this, false);
    window.addEventListener("aftercustomization", this, false);

    window.setTimeout(function(aSelf) {
      aSelf.initToolbarItems();
      aSelf.initialShow();
    }, 100, this);
  },

  destroy : function SystemMonitorService_destroy() {
    window.removeEventListener("unload", this, false);
    window.removeEventListener("beforecustomization", this, false);
    window.removeEventListener("aftercustomization", this, false);
    this.destroyToolbarItems();
  },


  // toolbar customization
  initToolbarItems : function SystemMonitorService_initToolbarItems() {
    for each (let item in this.items) {
      item.init();
    }
    var self = this;
    setTimeout(function() {
      self.resizableToolbarItem.insertSplitters(window);
    }, 0);
  },

  destroyToolbarItems : function SystemMonitorService_destroyToolbarItems() {
    for each (let item in this.items) {
      item.destroy();
    }
    this.resizableToolbarItem.removeSplitters(window);
  },

  initialShow : function SystemMonitorService_initialShow() {
    var bar;
    this.prefs.getPref(this.DOMAIN + "defaultTargetToolbar")
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
    for each (let item in this.items) {
      if (this.prefs.getPref(this.DOMAIN+item.id+".initialShow"))
        continue;

      if (currentset.indexOf(item.itemId) < 0) {
        if (currentset.indexOf("spring") < 0 &&
            currentset.indexOf("urlbar-container") < 0 &&
            currentset.indexOf("search-container") < 0 &&
            buttons.indexOf("spring") < 0)
          buttons.splice(++insertionPoint, 0, "spring");
        buttons.splice(++insertionPoint, 0, item.itemId);
        autoInsertedItems.push(item.id);
      }
    }

    currentset = bar.currentSet.replace(/__empty/, "");
    var newset = buttons.join(",");
    if (currentset == newset)
      return;

    var self = this;
    this.confirmInsertToolbarItems()
        .then(function(aInsert) {
          for each (let item in autoInsertedItems) {
            self.prefs.setPref(self.DOMAIN+item+".initialShow", true);
          }
          if (!aInsert)
            return;
          bar.currentSet = newset;
          bar.setAttribute("currentset", newset);
          document.persist(bar.id, "currentset");
          if ("BrowserToolboxCustomizeDone" in window) { // non-Australis Firefox (Firefox 28 and olders)
            setTimeout(function() {
              BrowserToolboxCustomizeDone(true);
              self.initToolbarItems();
            }, 0);
          }
          else if ("MailToolboxCustomizeDone" in window) { // Thunderbird
            setTimeout(function() {
              MailToolboxCustomizeDone(null, 'CustomizeMailToolbar');
              self.initToolbarItems();
            }, 0);
          }
          else { // Australis Firefox (Firefox 29 and later)
            setTimeout(function() {
              self.initToolbarItems();
            }, 0);
          }
        });
  },
  confirmInsertToolbarItems : function SystemMonitorService_confirmInsertToolbarItems() {
    if (!('gBrowser' in window)) { // Thunderbird
      return Promise.resolve(false);
    }
    var ns = {};
    Components.utils.import("resource://system-monitor-modules/lib/confirmWithTab.js", ns);
    return ns.confirmWithTab({
             tab     : gBrowser.selectedTab,
             label   : this.bundle.getString("initialshow_confirm_text"),
             value   : "system-monitor-insert-toolbar-items",
             persistence : -1, // don't hide automatically by page loadings
             buttons : [
               this.bundle.getString("initialshow_confirm_yes"),
               this.bundle.getString("initialshow_confirm_no")
             ]
           })
           .then(function(aButtonIndex) {
             return aButtonIndex == 0;
           });
  },

  // nsIDOMEventListener
  handleEvent : function SystemMonitorService_handleEvent(aEvent) {
    switch (aEvent.type) {
      case "load":
        this.init();
        break;
      case "unload":
        this.destroy();
        break;
      case "beforecustomization":
        this.destroyToolbarItems();
        break;
      case "aftercustomization":
        this.initToolbarItems();
        break;
    }
  }
};

window.addEventListener("load", SystemMonitorService, false);
