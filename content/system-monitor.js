var SystemMonitorService = {
  SPLITTER_CLASS : "system-monitor-splitter",

  TOOLBAR_RESIZE_BEGIN : "system-monitor:toolbar-item-begin-resize",
  TOOLBAR_RESIZE_END : "system-monitor:toolbar-item-end-resize",

  domain : "extensions.system-monitor@clear-code.com.",

  initialized : false,
  resizing : false,
  items : [],

  get bundle() {
    return document.getElementById("system-monitor-bundle");
  },

  get system() {
    if (!this._system)
      this._system = Components.classes["@clear-code.com/system;1"].getService(Components.interfaces.clISystem);
    return this._system;
  },

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
    if ("CustomizeMailToolbar" in window) {
      eval("window.CustomizeMailToolbar = "+
        window.CustomizeMailToolbar.toSource().replace(
          "{",
          "{ SystemMonitorService.destroyToolbarItems(); "
        )
      );
    }
    var toolbox = document.getElementById("navigator-toolbox") ||
                  document.getElementById("mail-toolbox");
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
    if ("MailToolboxCustomizeDone" in window) {
      window.__systemmonitor__MailToolboxCustomizeDone = window.MailToolboxCustomizeDone;
      window.MailToolboxCustomizeDone = function() {
        window.__systemmonitor__MailToolboxCustomizeDone.apply(window, arguments);
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
    var bar;
    this.getPref(this.domain+"defaultTargetToolbar")
      .split(/[,\s]+/)
      .some(function(aTarget) {
        bar = document.getElementById(aTarget);
        if (bar && bar.boxObject.height && bar.boxObject.width)
          return true;
      });
    if (bar && bar.currentSet) {
      var PromptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                           .getService(Ci.nsIPromptService);

      var currentset = bar.currentSet;
      var buttons = currentset.replace(/__empty/, "").split(',');

      this.items.forEach(function(aItem) {
        if (this.getPref(this.domain+aItem.id+".initialShow"))
          return;

        if (currentset.indexOf(aItem.itemId) < 0) {
          if (currentset.indexOf("spring") < 0 &&
              currentset.indexOf("urlbar-container") < 0 &&
              currentset.indexOf("search-container") < 0 &&
              buttons.indexOf("spring") < 0)
            buttons.push("spring");
          buttons.push(aItem.itemId);
        }
        this.setPref(this.domain+aItem.id+".initialShow", true);
      }, this);
      currentset = bar.currentSet.replace(/__empty/, "");
      var newset = buttons.join(",");
      if (currentset != newset &&
        PromptService.confirmEx(
          null,
          this.bundle.getString("initialshow_confirm_title"),
          this.bundle.getString("initialshow_confirm_text"),
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
      else if ("MailToolboxCustomizeDone" in window)
        window.setTimeout("MailToolboxCustomizeDone(null, 'CustomizeMailToolbar');", 0);
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
  id   : null,
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

  id       : '',
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
  gradientEndAlpha : 0.5,
  style : 0,
  multiplexed : false,
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

    this.size = this.getPref(this.domain+this.id+".size");
    this.interval = this.getPref(this.domain+this.id+".interval");

    this.colorBackground = this.getPref(this.domain+this.id+".color.background");
    this.colorForeground = this.getPref(this.domain+this.id+".color.foreground");

    this.gradientEndAlpha = Number(this.getPref(this.domain+this.id+".color.gradientEndAlpha"));
    if (isNaN(this.gradientEndAlpha))
      this.gradientEndAlpha = 0.5;
    this.gradientEndAlpha = Math.min(0.999999, Math.max(0, this.gradientEndAlpha));

    this.style = this.getPref(this.domain+this.id+".style");

    var canvas = this.canvas;
    canvas.style.width = (canvas.width = item.width = this.size)+"px";
    this.initValueArray();
    this.drawGraph(true);

    try {
        this.system.addMonitor(this.type, this, this.interval);
    }
    catch(e) {
        dump('system-monitor: addMonitor() failed\n'+
             '  type: '+this.type+'\n'+
             '  interval: '+this.interval+'\n'+
             '  error:\n'+e.toString().replace(/^/gm, '    ')+'\n');
        this.drawDisabled();
    }
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

    try {
        this.system.removeMonitor(this.type, this);
    }
    catch(e) {
        dump('system-monitor: removeMonitor() failed\n'+
             '  type: '+this.type+'\n'+
             '  error:\n'+e.toString().replace(/^/gm, '    ')+'\n');
        this.drawDisabled();
    }
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

  getSum : function(aValues) {
    if (!aValues)
      return 0;

    if (typeof aValues == 'number')
      return aValues;

    let total = 0;
    aValues.forEach(function(aValue) {
      total += aValue;
    });
    return total / aValues.length;
  },

  STYLE_BAR       : 1,
  STYLE_POLYGONAL : 2,
  STYLE_UNIFIED : 128,
  STYLE_STACKED : 256,
  STYLE_LAYERED : 512,
  drawGraph : function(aDrawAll) {
    var canvas = this.canvas;
    var context = canvas.getContext("2d")
    var y = canvas.height;

    var values = this.valueArray;
    if (this.style & this.STYLE_POLYGONAL) {
      this.fillAll(this.colorBackground);
      if (this.multiplexed && values[values.length-1]) {
        this.drawGraphMultiplexedPolygon(context, values, y);
      } else {
        this.drawGraphPolygon(context, values || 0, y);
      }
    } else { // bar graph (by default)
      let x = 0;
      if (aDrawAll) {
        this.fillAll(this.colorBackground);
      } else {
        context.drawImage(canvas, -2, 0);
        x = (values.length - 1) * 2;
        values = values.slice(-1);
        this.drawGraphBar(context, this.colorBackground, x, y, 0, y);
      }
      values.forEach(function(aValue) {
        if (aValue) {
          if (this.multiplexed) {
            this.drawGraphMultiplexedBar(context, aValue, x, y);
          } else {
            this.drawGraphBar(context, [this.colorBackground, this.colorForeground], x, y, 0, y * aValue);
          }
        }
        x = x + 2;
      }, this);
    }
  },

  fillAll : function(aColor) {
    var canvas = this.canvas;
    var context = canvas.getContext("2d")
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = aColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  },

  // bar graph
  drawGraphBar : function(aContext, aColors, aX, aMaxY, aBeginY, aEndY) {
    aContext.save();

    aContext.translate(aX, aMaxY);
    aContext.scale(1, -1);

    if (typeof aColors == 'object') {
      let offset = (aEndY - aBeginY) * (1 / (1 - this.gradientEndAlpha));
      let gradient = aContext.createLinearGradient(0, aEndY-offset, 0, aEndY);
      gradient.addColorStop(0, aColors[0]);
      gradient.addColorStop(1, aColors[1]);
      aContext.strokeStyle = gradient;
    } else {
      aContext.strokeStyle = aColors;
    }
    aContext.beginPath();
    aContext.lineWidth = 1.0;
    aContext.lineCap = "square";
    aContext.globalCompositeOperation = "source-over";
    aContext.moveTo(0, aBeginY);
    aContext.lineTo(0, aEndY);
    aContext.closePath();
    aContext.stroke();

    aContext.restore();
  },

  drawGraphMultiplexedBar : function(aContext, aValues, aX, aMaxY) {
    aContext.globalAlpha = 1;
    if (this.style & this.STYLE_STACKED) {
      let eachMaxY = aMaxY / aValues.length;
      let beginY = 0;
      aContext.save();
      aValues.forEach(function(aValue) {
        let endY = beginY + (eachMaxY * aValue);
        this.drawGraphBar(aContext, [this.colorBackground, this.colorForeground], aX, aMaxY, beginY, endY);
        beginY = endY;
      }, this);
      aContext.restore();
    } else if (this.style & this.STYLE_LAYERED) {
      let baseAlpha = 0.2;
      aValues.slice().sort().reverse().forEach(function(aValue, aIndex) {
        let endY = aMaxY * aValue;
        aContext.globalAlpha = 1;
        this.drawGraphBar(aContext, this.colorBackground, aX, aMaxY, 0, endY);
        aContext.globalAlpha = baseAlpha + (1 / aValues.length * (aIndex+1) * (1-baseAlpha));
        this.drawGraphBar(aContext, [this.colorBackground, this.colorForeground], aX, aMaxY, 0, endY);
      }, this);
      aContext.globalAlpha = 1;
    } else { // unified (by default)
      this.drawGraphBar(aContext, [this.colorBackground, this.colorForeground], aX, aMaxY, 0, aMaxY * this.getSum(aValues));
    }
  },

  // polygonal graph
  drawGraphPolygon : function(aContext, aValues, aMaxY) {
    aContext.save();

    aContext.translate(0, aMaxY);
    aContext.scale(1, -1);

    aContext.beginPath();
    aContext.strokeStyle = this.colorForeground;
    aContext.lineWidth = 0.5;
    aContext.lineCap = "square";
    aContext.globalCompositeOperation = "source-over";
    aContext.moveTo(0, 0);
    aValues.forEach(function(aValue, aIndex) {
      aContext.lineTo(aIndex * 2, aMaxY * (aValue || 0));
    });
    aContext.moveTo(aValues.length * 2, 0);
    aContext.closePath();
    aContext.stroke();

    aContext.restore();
  },

  drawGraphMultiplexedPolygon : function(aContext, aValues, aMaxY) {
    let count = aValues[aValues.length-1].length;
    if (this.style & this.STYLE_STACKED) {
      let lastValues = [];
      for (let i = 0, maxi = count; i < maxi; i++)
      {
        lastValues = aValues.map(function(aValue, aIndex) {
          return aValue ?
                   (((aIndex in lastValues ? lastValues[aIndex] : 0 ) + aValue[i]) / count) :
                   0 ;
        });
        this.drawGraphPolygon(
          aContext,
          lastValues,
          aMaxY
        );
      }
    } else if (this.style & this.STYLE_LAYERED) {
      for (let i = 0, maxi = count; i < maxi; i++)
      {
        this.drawGraphPolygon(
          aContext,
          aValues.map(function(aValue) {
            return aValue ? aValue[i] : 0 ;
          }),
          aMaxY
        );
      }
    } else { // unified (by default)
      this.drawGraphPolygon(
        aContext,
        aValues.map(this.getSum),
        aMaxY
      );
    }
  },

  drawDisabled : function() {
    this.fillAll(this.colorBackground);

    var canvas = this.canvas;
    var context = canvas.getContext("2d")
    var w = canvas.width;
    var h = canvas.height;

    context.save();

    context.beginPath();
    context.strokeStyle = this.colorForeground;
    context.lineWidth = 1.0;
    context.lineCap = "square";
    context.globalCompositeOperation = "copy";
    context.moveTo(0, 0);
    context.lineTo(w, h);
    context.moveTo(0, h);
    context.lineTo(w, 0);
    context.closePath();
    context.stroke();

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
    switch (aData.replace(this.domain+this.id+'.', '')) {
      case "size":
      case "interval":
      case "color.background":
      case "color.foreground":
      case "color.gradientEndAlpha":
      case "style":
        if (this.listening)
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
            this.domain+this.id+".size",
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
  id       : 'cpu-usage',
  type     : 'cpu-usages',
  itemId   : 'system-monitor-cpu-usage',
  imageId  : 'system-monitor-cpu-usage-backup',
  canvasId : 'system-monitor-cpu-usage-canvas',
  multiplexed : true,
  get tooltip() {
    return document.getElementById('system-monitor-cpu-usage-tooltip-label');
  },
  // clISystemMonitor
  monitor : function(aValues) {
    this.valueArray.shift();
    this.valueArray.push(aValues);
    this.drawGraph();

    if (aValues.length > 1 && this.style & this.STYLE_UNIFIED)
      aValues = [this.getSum(aValues)];

    var parts = aValues.map(function(aValue) {
          return this.bundle.getFormattedString(
                   'cpu_usage_tooltip_part',
                   [parseInt(aValue * 100)]
                 );
        }, this);
    parts = parts.join(this.bundle.getString('cpu_usage_tooltip_delimiter'));
    this.tooltip.textContent = this.bundle.getFormattedString(
                                 'cpu_usage_tooltip',
                                 [parts]
                               );
  }
};

function SystemMonitorMemoryItem()
{
}
SystemMonitorMemoryItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  id       : 'memory-usage',
  type     : 'memory-usage',
  itemId   : 'system-monitor-memory-usage',
  imageId  : 'system-monitor-memory-usage-backup',
  canvasId : 'system-monitor-memory-usage-canvas',
  get tooltip() {
    return document.getElementById('system-monitor-memory-usage-tooltip-label');
  },
  // clISystemMonitor
  monitor : function(aValue) {
    this.valueArray.shift();
    this.valueArray.push(aValue.used / aValue.total);
    this.drawGraph();
    this.tooltip.textContent = this.bundle.getFormattedString(
                                 'memory_usage_tooltip',
                                 [parseInt(aValue.total / 1024 / 1024),
                                  parseInt(aValue.used / 1024 / 1024),
                                  parseInt(aValue.used / aValue.total * 100)]
                               );
  }
};


window.addEventListener("load", SystemMonitorService, false);
