var SystemMonitorService = {
  CPU_USAGE_ITEM : "system-monitor-cpu-usage",
  SPLITTER_CLASS : "system-monitor-splitter",

  TOOLBAR_RESIZE_BEGIN : "system-monitor:toolbar-item-begin-resize",
  TOOLBAR_RESIZE_END : "system-monitor:toolbar-item-end-resize",

  domain : "extensions.system-monitor@clear-code.com.",

  initialized : false,
  resizing : false,

  init : function() {
    window.removeEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    this.addPrefListener(this);
    this.onChangePref(this.domain+"cpu-usage.size");
    this.onChangePref(this.domain+"cpu-usage.interval");
    this.onChangePref(this.domain+"cpu-usage.color.background");
    this.onChangePref(this.domain+"cpu-usage.color.foreground");

    this.ObserverService.addObserver(this, this.TOOLBAR_RESIZE_BEGIN, false);
    this.ObserverService.addObserver(this, this.TOOLBAR_RESIZE_END, false);

    this.updateToolbarMethods();

    this.initialized = true;

    this.initToolbarItems();
    this.initialShow();
  },

  destroy : function() {
    window.removeEventListener("unload", this, false);
    this.removePrefListener(this);
    this.ObserverService.removeObserver(this, this.TOOLBAR_RESIZE_BEGIN);
    this.ObserverService.removeObserver(this, this.TOOLBAR_RESIZE_END);
    this.destroyToolbarItems();
  },


  // CPU usage graph
  CPUUsageListening : false,
  CPUUsageUpdateInterval : 1000,
  CPUUsageSize : 48,
  CPUColorForeground : "green",
  CPUColorBackground : "black",
  CPUTimeArray : [],

  get CPUUsageItem() {
    return document.getElementById(this.CPU_USAGE_ITEM);
  },

  get CPUUsageImage() {
    return document.getElementById("system-monitor-cpu-usage-backup");
  },

  get CPUUsageCanvas() {
    return document.getElementById("system-monitor-cpu-usage-canvas");
  },

  initCPUUsageItem : function() {
    var item = this.CPUUsageItem;
    if (!this.initialized ||
        !item ||
        this.CPUUsageListening)
        return;

    var canvas = this.CPUUsageCanvas;
    canvas.style.width = (canvas.width = item.width = this.CPUUsageSize)+"px";
    this.initCPUArray();
    this.drawCPUUsageGraph();
    window.system.addMonitor("cpu-usage", this, this.CPUUsageUpdateInterval);
    this.CPUUsageListening = true;
  },

  destroyCPUUsageItem : function() {
    var item = this.CPUUsageItem;
    if (!this.initialized ||
        !item ||
        !this.CPUUsageListening)
        return;

    window.system.removeMonitor("cpu-usage", this);
    this.CPUUsageListening = false;
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

  drawCPUUsageGraph : function() {
    var canvasElement = this.CPUUsageCanvas;
    let context = canvasElement.getContext("2d")
    let y = canvasElement.height;
    let x = 0;

    context.fillStyle = this.CPUColorBackground;
    context.fillRect(0, 0, canvasElement.width, canvasElement.height);
    context.globalCompositeOperation = "copy";

    context.save();
    this.CPUTimeArray.forEach(function(aUsage) {
      let y_from = canvasElement.height;
      let y_to = y_from;
      if (aUsage == undefined) {
        this.drawLine(context, this.CPUColorBackground, x, y_from, 0);
      } else {
        y_to = y_to - (y * aUsage);
        y_from = this.drawLine(context, this.CPUColorForeground, x, y_from, y_to);
        this.drawLine(context, this.CPUColorBackground, x, y_from, y_to);
      }
      x = x + 2;
    }, this);
    context.restore();
  },

  // clISystemMonitor
  monitor : function(aUsage) {
    this.CPUTimeArray.shift();
    this.CPUTimeArray.push(aUsage);
    this.drawCPUUsageGraph();
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
    this.insertSplitters();
  },

  destroyToolbarItems : function() {
    this.destroyCPUUsageItem();
    this.removeSplitters();
  },

  initialShow : function() {
    var bar = document.getElementById(this.getPref(this.domain+"defaultTargetToolbar"));
    if (bar && bar.currentSet) {
      var bundle = document.getElementById("system-monitor-bundle");
      var PromptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                           .getService(Ci.nsIPromptService);

      var currentset = bar.currentSet;
      var buttons = currentset.replace(/__empty/, "").split(',');

      if (!this.getPref(this.domain+this.CPU_USAGE_ITEM+".initialShow")) {
        if (currentset.indexOf(this.CPU_USAGE_ITEM) < 0) {
          if (currentset.indexOf("spring") < 0 &&
              currentset.indexOf("urlbar-container") < 0 &&
              currentset.indexOf("search-container") < 0)
            buttons.push("spring");
          buttons.push(this.CPU_USAGE_ITEM);
        }
        this.setPref(this.domain+this.CPU_USAGE_ITEM+".initialShow", true);
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

  insertSplitters : function() {
    [
      this.CPUUsageItem
    ].forEach(function(aNode) {
      if (!aNode) return;
      if (aNode.previousSibling &&
          aNode.previousSibling.localName != "splitter")
        this.insertSplitterBefore(aNode);
      if (aNode.nextSibling &&
          aNode.nextSibling.localName != "splitter")
        this.insertSplitterBefore(aNode.nextSibling);
    }, this);
  },

  insertSplitterBefore : function(aNode) {
    var splitter = document.createElement("splitter");
    splitter.setAttribute("class", this.SPLITTER_CLASS);
    splitter.setAttribute("onmousedown", "SystemMonitorService.onSplitterMouseDown(this, event);");
    splitter.setAttribute("onmouseup", "SystemMonitorService.onSplitterMouseUp(this, event);");
    aNode.parentNode.insertBefore(splitter, aNode);
  },

  removeSplitters : function() {
    Array.slice(document.getElementsByAttribute("class", this.SPLITTER_CLASS))
      .forEach(function(aNode) {
        aNode.parentNode.removeChild(aNode);
      });
  },

  onSplitterMouseDown : function(aSplitter, aEvent) {
    if (this.resizing ||
        aEvent.button != 0 ||
        aEvent.altKey ||
        aEvent.ctrlKey ||
        aEvent.shiftKey ||
        aEvent.metaKey)
        return;

    this.ObserverService.notifyObservers(
      window,
      this.TOOLBAR_RESIZE_BEGIN,
      aSplitter.previousSibling.id+'\n'+aSplitter.nextSibling.id
    );

    /* canvasを非表示にしたのと同じタイミングでリサイズを行うと、
       まだ内部的にcanvasの大きさが残ったままなので、その大きさ以下に
       タブバーの幅を縮められなくなる。手動でイベントを再送してやると
       この問題を防ぐことができる。 */
    aEvent.preventDefault();
    aEvent.stopPropagation();
    var flags = 0;
    const nsIDOMNSEvent = Ci.nsIDOMNSEvent;
    if (aEvent.altKey) flags |= nsIDOMNSEvent.ALT_MASK;
    if (aEvent.ctrlKey) flags |= nsIDOMNSEvent.CONTROL_MASK;
    if (aEvent.shiftKey) flags |= nsIDOMNSEvent.SHIFT_MASK;
    if (aEvent.metaKey) flags |= nsIDOMNSEvent.META_MASK;
    window.setTimeout(function(aX, aY, aButton, aDetail) {
      window
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils)
        .sendMouseEvent('mousedown', aX, aY, aButton, aDetail, flags);
      flags = null;
    }, 0, aEvent.clientX, aEvent.clientY, aEvent.button, aEvent.detail);

    this.resizing = true;
  },

  onSplitterMouseUp : function(aSplitter, aEvent) {
    window.setTimeout(function(aSelf) {
      if (!aSelf.resizing) return;
      aSelf.ObserverService.notifyObservers(
        window,
        aSelf.TOOLBAR_RESIZE_END,
        aSplitter.previousSibling.id+'\n'+aSplitter.nextSibling.id
      );
      aSelf.resizing = false;
    }, 10, this);
  },


  // preferences listener
  onChangePref : function(aData) {
    switch (aData) {
      case "extensions.system-monitor@clear-code.com.cpu-usage.size":
        this.CPUUsageSize = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
      case "extensions.system-monitor@clear-code.com.cpu-usage.interval":
        this.CPUUsageUpdateInterval = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
      case "extensions.system-monitor@clear-code.com.cpu-usage.color.background":
        this.CPUColorBackground = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
      case "extensions.system-monitor@clear-code.com.cpu-usage.color.foreground":
        this.CPUColorForeground = this.getPref(aData);
        this.updateCPUUsageItem();
        break;
    }
  },

  // nsIObserver
  observe : function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        this.onChangePref(aData);
        break;

      case this.TOOLBAR_RESIZE_BEGIN:
        if (aSubject != window) break;
        if (aData.indexOf(this.CPU_USAGE_ITEM) > -1) {
          let canvas = this.CPUUsageCanvas;
          this.CPUUsageImage.src = canvas.toDataURL();
          this.destroyCPUUsageItem();
          canvas.style.width = (canvas.width = 1)+"px";
        }
        break;

      case this.TOOLBAR_RESIZE_END:
        if (aSubject != window) break;
        if (aData.indexOf(this.CPU_USAGE_ITEM) > -1) {
          this.setPref(
            this.domain+"cpu-usage.size",
            this.CPUUsageCanvas.parentNode.boxObject.width
          );
          this.CPUUsageImage.src = "";
        }
        break;
    }
  },

  ObserverService : Cc["@mozilla.org/observer-service;1"]
                      .getService(Ci.nsIObserverService),

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
SystemMonitorService.__proto__ = window["piro.sakura.ne.jp"].prefs;

window.addEventListener("load", SystemMonitorService, false);
