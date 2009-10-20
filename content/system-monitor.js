var SystemMonitorService = {
  CPUUsageUpdateInterval : 1000,
  CPUUsageSize : 48,
  CPUTimeArray : [],

  init : function() {
    window.removeEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    this.updateToolbarMethods();
    this.initToolbarItems();
    this.initialShow();
  },

  destroy : function() {
    window.removeEventListener("unload", this, false);
    this.destroyToolbarItems();
  },


  // CPU usage graph
  get CPUUsageItem() {
    return document.getElementById("system-monitor-cpu-usage");
  },

  get CPUUsageCanvas() {
    return document.getElementById("system-monitor-cpu-usage-canvas");
  },

  initCPUUsageItem : function() {
    var item = this.CPUUsageItem;
    if (!item) return;

    var canvas = this.CPUUsageCanvas;
    canvas.style.width = (canvas.width = this.CPUUsageSize)+"px";
    this.initCPUArray();
    window.system.addMonitor("cpu-usage", this, this.CPUUsageUpdateInterval);
  },

  destroyCPUUsageItem : function() {
    var item = this.CPUUsageItem;
    if (!item) return;

    window.system.removeMonitor("cpu-usage", this);
  },

  updateCPUUsageItem : function() {
    this.destroyCPUUsageItem();
    this.initCPUUsageItem();
  },

  initCPUArray : function() {
    var arraySize = parseInt(this.CPUUsageSize / 2);
    if (this.CPUTimeArray.length < arraySize) {
      while (this.CPUTimeArray.length < arraySize) {
        this.CPUTimeArray.unshift(undefined);
      }
    } else {
      this.CPUTimeArray = this.CPUTimeArray.slice(-arraySize);
    }
  },

  drawLine : function(aContext, aColor, aX, aBeginY, aEndY) {
    aContext.beginPath();
    aContext.strokeStyle = aColor;
    aContext.lineWidth = 1.0;
    aContext.lineCap = "square";
    aContext.globalCompositeOperation = "copy";
    aContext.moveTo(aX, aBeginY);
    aContext.lineTo(aX, aEndY);
    aContext.closePath();
    aContext.stroke();
    return aEndY - 1;
  },

  drawCPUUsageGraph : function(aUsage) {
    var canvasElement = this.CPUUsageCanvas;
    let context = canvasElement.getContext("2d")
    let y = canvasElement.height;
    let x = 0;

    context.fillStyle = "black";
    context.fillRect(0, 0, canvasElement.width, canvasElement.height);
    context.globalCompositeOperation = "copy";

    this.CPUTimeArray.shift();
    this.CPUTimeArray.push(aUsage);

    context.save();
    this.CPUTimeArray.forEach(function(aUsage) {
      let y_from = canvasElement.height;
      let y_to = y_from;
      if (aUsage == undefined) {
        this.drawLine(context, "black", x, y_from, 0);
      } else {
        y_to = y_to - (y * aUsage);
        y_from = this.drawLine(context, "green", x, y_from, y_to);
        this.drawLine(context, "black", x, y_from, y_to);
      }
      x = x + 2;
    }, this);
    context.restore();
  },

  // clISystemMonitor
  monitor : function(aUsage) {
    this.drawCPUUsageGraph(aUsage);
  },


  // toolbar customize
  updateToolbarMethods : function() {
    if ("BrowserCustomizeToolbar" in window) {
      eval("window.BrowserCustomizeToolbar = "+
        window.BrowserCustomizeToolbar.toSource().replace(
          "{",
          "{ SystemMonitorService.destroyToolbarItems(); "
        )
      );
    }
    var toolbox = document.getElementById("navigator-toolbox");
    if (toolbox.customizeDone) {
      toolbox.__systemmonitor__customizeDone = toolbox.customizeDone;
      toolbox.customizeDone = function(aChanged) {
        this.__systemmonitor__customizeDone(aChanged);
        SystemMonitorService.initToolbarItems();
      };
    }
    if ("BrowserToolboxCustomizeDone" in window) {
      window.__systemmonitor__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
      window.BrowserToolboxCustomizeDone = function(aChanged) {
        window.__systemmonitor__BrowserToolboxCustomizeDone.apply(window, arguments);
        SystemMonitorService.initToolbarItems();
      };
    }
  },

  initToolbarItems : function() {
    this.initCPUUsageItem();
  },

  destroyToolbarItems : function() {
    this.destroyCPUUsageItem();
  },

  initialShow : function() 
  {
    const PREFROOT = "extensions.system-monitor@clear-code.com";
    var bar = document.getElementById("toolbar-menubar");
    if (bar && bar.currentSet) {
      var bundle = document.getElementById("system-monitor-bundle");
      var PromptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                           .getService(Ci.nsIPromptService);

     var currentset = bar.currentSet;
      var buttons = currentset.replace(/__empty/, "").split(',');

      if (!this.getPref(PREFROOT+".initialshow.cpu-usage")) {
        if (currentset.indexOf("system-monitor-cpu-usage") < 0)
          buttons.push('system-monitor-cpu-usage');
        this.setPref(PREFROOT+".initialshow.cpu-usage", true);
      }
      currentset = bar.currentSet.replace(/__empty/, "");
      var newset = buttons.join(",");
      if (currentset != newset &&
        PromptService.confirmEx(
          null,
          bundle.getString("initialshow_confirm_title"),
          bundle.getString("initialshow_confirm_text"),
          (PromptService.BUTTON_TITLE_YES * PromptService.BUTTON_POS_0) +
          (PromptService.BUTTON_TITLE_NO  * PromptService.BUTTON_POS_1),
          null, null, null, null, {}
        ) == 0) {
        bar.currentSet = newset;
        bar.setAttribute("currentset", newset);
          document.persist(bar.id, 'currentset');
      }
      if ("BrowserToolboxCustomizeDone" in window)
        window.setTimeout("BrowserToolboxCustomizeDone(true);", 0);
    }
  },


  // preferences listener
  domain : "extensions.system-monitor@clear-code.com",
  observe : function(aSubject, aTopic, aData) {
    if (aTopic != 'nsPref:changed') return;
    switch (aData) {
      case "extensions.system-monitor@clear-code.com.cpu-usage.size":
        this.CPUUsageSize = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
      case "extensions.system-monitor@clear-code.com.cpu-usage.interval":
        this.CPUUsageUpdateInterval = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
    }
  },

  // nsIDOMEventListener
  handleEvent : function(aEvent) {
    switch (aEvent.type) {
      case "load":
        this.init();
        break;
      case "unload":
        this.destroy();
        break;
    }
  }
};
SystemMonitorService.__proto__ = window['piro.sakura.ne.jp'].prefs;

window.addEventListener("load", SystemMonitorService, false);
