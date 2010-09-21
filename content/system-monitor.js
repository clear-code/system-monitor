var SystemMonitorService = {
  SPLITTER_CLASS : "system-monitor-splitter",

  TOOLBAR_RESIZE_BEGIN : "system-monitor:toolbar-item-begin-resize",
  TOOLBAR_RESIZE_END : "system-monitor:toolbar-item-end-resize",

  domain : "extensions.system-monitor@clear-code.com.",

  initialized : false,
  resizing : false,
  items : [],

  init : function() {
    window.removeEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    this.items = [
      new SystemMonitorCPUItem(),
      new SystemMonitorMemoryItem()
    ];

    this.updateToolbarMethods();

    this.initialized = true;

    this.initToolbarItems();
    this.initialShow();
  },

  destroy : function() {
    window.removeEventListener("unload", this, false);
    this.destroyToolbarItems();
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
    if (toolbox && toolbox.customizeDone) {
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
    this.items.forEach(function(aItem) {
      aItem.init();
    });
    this.insertSplitters();
  },

  destroyToolbarItems : function() {
    this.items.forEach(function(aItem) {
      aItem.destroy();
    });
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

      this.items.forEach(function(aItem) {
        if (this.getPref(this.domain+aItem.type+".initialShow"))
          return;

        if (currentset.indexOf(aItem.itemId) < 0) {
          if (currentset.indexOf("spring") < 0 &&
              currentset.indexOf("urlbar-container") < 0 &&
              currentset.indexOf("search-container") < 0)
            buttons.push("spring");
          buttons.push(aItem.itemId);
        }
        this.setPref(this.domain+aItem.type+".initialShow", true);
      }, this);
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
    this.items.forEach(function(aItem) {
      var element = aItem.item;
      if (!element) return;
      if (element.previousSibling &&
          element.previousSibling.localName != "splitter")
        this.insertSplitterBefore(element);
      if (element.nextSibling &&
          element.nextSibling.localName != "splitter")
        this.insertSplitterBefore(element.nextSibling);
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


function SystemMonitorItem()
{
}
SystemMonitorItem.prototype = {
  __proto__ : SystemMonitorService,
  item : null,
  itemId : null,
  type : null,
  init : function() {
  },
  destroy : function() {
  }
};


function SystemMonitorSimpleGraphItem()
{
}
SystemMonitorSimpleGraphItem.prototype = {
  __proto__ : SystemMonitorItem.prototype,

  type     : '',
  itemId   : '',
  imageId  : '',
  canvasId : '',

  listening : false,
  observing : false,
  interval : 1000,
  size : 48,
  colorForeground : "green",
  colorBackground : "black",
  valueArray : [],

  get item() {
    return document.getElementById(this.itemId);
  },

  get image() {
    return document.getElementById(this.imageId);
  },

  get canvas() {
    return document.getElementById(this.canvasId);
  },

  init : function() {
    var item = this.item;
    if (!this.initialized ||
        !item ||
        this.listening)
        return;

    this.size = this.getPref(this.domain+this.type+".size");
    this.interval = this.getPref(this.domain+this.type+".interval");
    this.colorBackground = this.getPref(this.domain+this.type+".color.background");
    this.colorForeground = this.getPref(this.domain+this.type+".color.foreground");

    var canvas = this.canvas;
    canvas.style.width = (canvas.width = item.width = this.size)+"px";
    this.initValueArray();
    this.drawGraph();

    window.system.addMonitor(this.type, this, this.interval);
    this.addPrefListener(this);
    this.startObserve();

    this.listening = true;
  },

  destroy : function() {
    var item = this.item;
    if (!this.initialized ||
        !item ||
        !this.listening)
        return;

    window.system.removeMonitor(this.type, this);
    this.removePrefListener(this);
    this.stopObserve();

    this.listening = false;
  },

  startObserve : function() {
    if (this.observing) return;
    this.observing = true;
    this.ObserverService.addObserver(this, this.TOOLBAR_RESIZE_BEGIN, false);
    this.ObserverService.addObserver(this, this.TOOLBAR_RESIZE_END, false);
  },

  stopObserve : function() {
    if (!this.observing) return;
    this.observing = false;
    this.ObserverService.removeObserver(this, this.TOOLBAR_RESIZE_BEGIN);
    this.ObserverService.removeObserver(this, this.TOOLBAR_RESIZE_END);
  },

  update : function() {
    this.destroy();
    this.init();
  },

  initValueArray : function() {
    var arraySize = parseInt(this.size / 2);
    if (this.valueArray.length < arraySize) {
      while (this.valueArray.length < arraySize) {
        this.valueArray.unshift(undefined);
      }
    } else {
      this.valueArray = this.valueArray.slice(-arraySize);
    }
  },

  drawLine : function(aContext, aColor, aX, aBeginY, aEndY) {
try{
    aContext.beginPath();
    aContext.strokeStyle = aColor;
    aContext.lineWidth = 1.0;
    aContext.lineCap = "square";
    aContext.globalCompositeOperation = "copy";
    aContext.moveTo(aX, aBeginY);
    aContext.lineTo(aX, aEndY);
    aContext.closePath();
    aContext.stroke();
}
catch(e){
Application.console.log([e, aContext, aColor, aX, aBeginY, aEndY]);
}
    return aEndY - 1;
  },

  drawGraph : function() {
    var canvasElement = this.canvas;
    let context = canvasElement.getContext("2d")
    let y = canvasElement.height;
    let x = 0;

    context.fillStyle = this.colorBackground;
    context.fillRect(0, 0, canvasElement.width, canvasElement.height);
    context.globalCompositeOperation = "copy";

    context.save();
    this.valueArray.forEach(function(aValue) {
      let y_from = canvasElement.height;
      let y_to = y_from;
      if (aValue == undefined) {
        this.drawLine(context, this.colorBackground, x, y_from, 0);
      } else {
        y_to = y_to - (y * Math.max(0, Math.min(1, aValue)));
        y_from = this.drawLine(context, this.colorForeground, x, y_from, y_to);
        this.drawLine(context, this.colorBackground, x, y_from, y_to);
      }
      x = x + 2;
    }, this);
    context.restore();
  },

  // clISystemMonitor
  monitor : function(aValue) {
    this.valueArray.shift();
    this.valueArray.push(aValue);
    this.drawGraph();
  },

  // preferences listener
  onChangePref : function(aData) {
    switch (aData.replace(this.domain+this.type+'.', '')) {
      case "size":
        this.size = this.getPref(aData);
        this.update();
        break;
      case "interval":
        this.interval = this.getPref(aData);
        this.update();
        break;
      case "color.background":
        this.colorBackground = this.getPref(aData);
        this.update();
        break;
      case "color.foreground":
        this.colorForeground = this.getPref(aData);
        this.update();
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
        if (aSubject != window || !this.item) break;
        if (aData.indexOf(this.itemId) > -1) {
          let canvas = this.canvas;
          this.image.src = canvas.toDataURL();
          this.destroy();
          this.startObserve();
          canvas.style.width = (canvas.width = 1)+"px";
        }
        break;

      case this.TOOLBAR_RESIZE_END:
        if (aSubject != window || !this.item) break;
        if (aData.indexOf(this.itemId) > -1) {
          this.image.src = "";
          this.setPref(
            this.domain+this.type+".size",
            this.canvas.parentNode.boxObject.width
          );
          this.init();
        }
        break;
    }
  }
};


function SystemMonitorCPUItem()
{
}
SystemMonitorCPUItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  type     : 'cpu-usage',
  itemId   : 'system-monitor-cpu-usage',
  imageId  : 'system-monitor-cpu-usage-backup',
  canvasId : 'system-monitor-cpu-usage-canvas'
};

function SystemMonitorMemoryItem()
{
}
SystemMonitorMemoryItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  type     : 'memory-usage',
  itemId   : 'system-monitor-memory-usage',
  imageId  : 'system-monitor-memory-usage-backup',
  canvasId : 'system-monitor-memory-usage-canvas',
  // clISystemMonitor
  monitor : function(aValue) {
    if (!(aValue instanceof Ci.clIMemory)) return;
    this.valueArray.shift();
    this.valueArray.push(aValue.user / aValue.total);
    this.drawGraph();
  }
};


window.addEventListener("load", SystemMonitorService, false);
