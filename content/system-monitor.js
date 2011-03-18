var SystemMonitorService = {
  RESIZABLE_CLASS : "system-monitor-resizable-item",
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
    if (!this._system) {
      try {
        let ns = {};
        Components.utils.import('resource://system-monitor-modules/clSystem.js', ns);
        this._system = new ns.clSystem();
        this._system.init(window);
      }
      catch(e) {
        this._system = (
          Components.classes["@clear-code.com/system;2"] ||
          Components.classes["@clear-code.com/system;1"]
        ).getService(Components.interfaces.clISystem);
      }
    }
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
    for each (let item in this.items) {
      item.init();
    }
    this.insertSplitters();
  },

  destroyToolbarItems : function() {
    for each (let item in this.items) {
      item.destroy();
    }
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
    if (!bar || !bar.currentSet)
      return;

    var currentset = bar.currentSet;
    var buttons = currentset.replace(/__empty/, "").split(',');

    for each (let item in this.items) {
      if (this.getPref(this.domain+item.id+".initialShow"))
        return;

      if (currentset.indexOf(item.itemId) < 0) {
        if (currentset.indexOf("spring") < 0 &&
            currentset.indexOf("urlbar-container") < 0 &&
            currentset.indexOf("search-container") < 0 &&
            buttons.indexOf("spring") < 0)
          buttons.push("spring");
        buttons.push(item.itemId);
      }
      this.setPref(this.domain+item.id+".initialShow", true);
    }

    currentset = bar.currentSet.replace(/__empty/, "");
    var newset = buttons.join(",");
    if (currentset == newset)
      return;

    this.confirmInsertToolbarItems()
        .next(function(aInsert) {
            if (!aInsert)
            	return;
            bar.currentSet = newset;
            bar.setAttribute("currentset", newset);
            document.persist(bar.id, 'currentset');
            if ("BrowserToolboxCustomizeDone" in window)
              window.setTimeout("BrowserToolboxCustomizeDone(true);", 0);
            else if ("MailToolboxCustomizeDone" in window)
              window.setTimeout("MailToolboxCustomizeDone(null, 'CustomizeMailToolbar');", 0);
        });
  },
  confirmInsertToolbarItems : function() {
    var ns = {};
    Components.utils.import('resource://system-monitor-modules/lib/confirmWithTab.js', ns);
	return ns.confirmWithTab({
			tab      : gBrowser.selectedTab,
			label    : this.bundle.getString('initialshow_confirm_text'),
			value    : 'system-monitor-insert-toolbar-items',
			buttons  : [
				this.bundle.getString('initialshow_confirm_yes'),
				this.bundle.getString('initialshow_confirm_no')
			],
			cancelEvents : ['TabClose', 'SSTabRestoring']
		})
		.next(function(aButtonIndex) {
			return aButtonIndex == 0;
		});
  },

  insertSplitters : function() {
    let nodes = document.querySelectorAll("."+this.RESIZABLE_CLASS);
    for (let i = 0, maxi = nodes.length; i < maxi; i++) {
      let node = nodes[i];
      if (node.previousSibling &&
          node.previousSibling.localName != "splitter")
        this.insertSplitterBetween(node.previousSibling, node);
      if (
          (!node.nextSibling && !node.parentNode.querySelector('toolbar > toolbarspring, toolbar > *[flex]')) ||
          (node.nextSibling && node.nextSibling.localName != "splitter")
          )
        this.insertSplitterBetween(node, node.nextSibling);
    }
  },

  insertSplitterBetween : function(aBefore, aAfter) {
    var toolbar = (aAfter || aBefore).parentNode;
    var splitter = document.createElement("splitter");
    splitter.setAttribute("class", this.SPLITTER_CLASS);
    splitter.setAttribute("onmousedown", "SystemMonitorService.onSplitterMouseDown(this, event);");
    splitter.setAttribute("onmouseup", "SystemMonitorService.onSplitterMouseUp(this, event);");
    toolbar.insertBefore(splitter, aAfter);
    if (!aAfter) {
      var spacer = document.createElement('spacer');
      spacer.setAttribute('flex', 1);
      spacer.setAttribute('class', this.SPLITTER_CLASS+'-spacer');
      aBefore.parentNode.appendChild(spacer);
    }
  },

  removeSplitters : function() {
    let nodes = document.querySelectorAll("."+this.SPLITTER_CLASS+", ."+this.SPLITTER_CLASS+'-spacer');
    for (let i = 0, maxi = nodes.length; i < maxi; i++) {
      let node = nodes[i];
      node.parentNode.removeChild(node);
    }
  },

  onSplitterMouseDown : function(aSplitter, aEvent) {
    if (this.resizing ||
        aEvent.button != 0 ||
        aEvent.altKey ||
        aEvent.ctrlKey ||
        aEvent.shiftKey ||
        aEvent.metaKey)
        return;

    var previousId = aSplitter.previousSibling && aSplitter.previousSibling.id || '';
    var nextId = aSplitter.nextSibling && aSplitter.nextSibling.id || '';
    this.ObserverService.notifyObservers(
      window,
      this.TOOLBAR_RESIZE_BEGIN,
      previousId+'\n'+nextId
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
      var previousId = aSplitter.previousSibling && aSplitter.previousSibling.id || '';
      var nextId = aSplitter.nextSibling && aSplitter.nextSibling.id || '';
      aSelf.ObserverService.notifyObservers(
        window,
        aSelf.TOOLBAR_RESIZE_END,
        previousId+'\n'+nextId
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

  listening : false,
  observing : false,
  interval : 1000,
  size : 48,
  unit : 2,
  foreground              : "#33FF33",
  foregroundGradient      : ["#33FF33", "#33FF33"],
  foregroundGradientStyle : null,
  foregroundMinAlpha      : 0.2,
  background              : "#000000",
  backgroundGradient      : ["#000000", "#000000"],
  backgroundGradientStyle : null,
  style : 0,
  multiplexed : false,
  multiplexCount : 1,
  valueArray : null,

  get item() {
    return document.getElementById(this.itemId);
  },
  get image() {
      if (!this.item) {
        let stack = Components.stack;
        let backtrace = [];
        while (stack) { backtrace.push(stack); stack = stack.caller; }
        throw new Error('unexpected access for the property "image"!\n'+backtrace.join('\n'));
      }
      return this.item.getElementsByTagName('image')[0];
  },
  get canvas() {
      if (!this.item) {
        let stack = Components.stack;
        let backtrace = [];
        while (stack) { backtrace.push(stack); stack = stack.caller; }
        throw new Error('unexpected access for the property "canvas"!\n'+backtrace.join('\n'));
      }
      return this.item.getElementsByTagName('canvas')[0];
  },

  init : function() {
    this.start();
  },

  destroy : function() {
    this.stop();
  },

  start : function() {
    var item = this.item;
    if (!this.initialized ||
        !item ||
        this.listening)
        return;

    this.size = this.getPref(this.domain+this.id+".size");
    this.interval = this.getPref(this.domain+this.id+".interval");

    this.onChangePref(this.domain+this.id+".color.background");
    this.onChangePref(this.domain+this.id+".color.foreground");
    this.onChangePref(this.domain+this.id+".color.foregroundMinAlpha");
    this.onChangePref(this.domain+this.id+".style");

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

  stop : function() {
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
    this.stop();
    this.start();
  },

  initValueArray : function() {
    if (this.valueArray === null)
      this.valueArray = [];
    var arraySize = parseInt(this.size / this.unit);
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
    for each (let value in aValues) {
      total += value;
    }
    return total / aValues.length;
  },

  STYLE_BAR       : 1,
  STYLE_POLYGONAL : 2,
  STYLE_UNIFIED   : 128,
  STYLE_STACKED   : 256,
  STYLE_LAYERED   : 512,
  STYLE_SEPARATED : 1024,
  drawGraph : function(aDrawAll) {
    var canvas = this.canvas;
    var w = canvas.width;
    var h = canvas.height;

    var values = this.valueArray;
    if (this.style & this.STYLE_SEPARATED)
      values = values.slice(-parseInt(values.length / this.multiplexCount));

    this.clearAll();
    if (this.style & this.STYLE_POLYGONAL) {
      last = values[values.length-1];
      if (last && typeof last == 'object') {
        this.drawGraphMultiplexedPolygon(values, w, h, this.foreground);
      } else {
        this.drawGraphPolygon(values || 0, h, this.foreground);
      }
    } else { // bar graph (by default)
      let x = 0;
      for each (let value in values) {
        if (value) {
          if (typeof value == 'object') {
            this.drawGraphMultiplexedBar(value, x, w, h);
          } else {
            this.drawGraphBar(this.foregroundGradientStyle, x, h, 0, h * value);
          }
        }
        x += this.unit;
      }
    }
    if (this.style & this.STYLE_SEPARATED)
      this.drawSeparators(w, h);
  },

  clearAll : function() { 
    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.backgroundGradientStyle;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  },

  drawVerticalLine : function(aStyle, aX, aMaxY, aBeginY, aEndY, aWidth) {
    // On Mac OS X, a zero-length line wrongly covers whole the canvas!
    if (aBeginY == aEndY) return;

    var context = this.canvas.getContext("2d");
    context.save();

    context.translate(Math.floor(aX)+(aWidth/2), aMaxY - aEndY);
    context.scale(1, (aEndY - aBeginY) / aMaxY);

    context.strokeStyle = aStyle;

    context.beginPath();
    context.lineWidth = aWidth || 1.0;
    context.lineCap = "square";
    context.moveTo(0, 0);
    context.lineTo(0, aMaxY);
    context.closePath();
    context.stroke();

    context.restore();
  },

  drawSeparators : function(aMaxX, aMaxY)
  {
    var context = this.canvas.getContext("2d");
    context.save();
    context.globalAlpha = 0.5;
    var count = this.multiplexCount;
    var width = (aMaxX / count) - 1;
    for (let i = 1, maxi = count; i < maxi; i++)
    {
      this.drawVerticalLine(this.foreground, width + 0.5, aMaxY, 0, aMaxY, 1);
    }
    context.restore();
  },

  // bar graph
  drawGraphBar : function(aStyle, aX, aMaxY, aBeginY, aEndY) {
    this.drawVerticalLine(aStyle, aX, aMaxY, aBeginY, aEndY, this.unit);
  },

  drawGraphMultiplexedBar : function(aValues, aX, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();
    context.globalAlpha = 1;
    var count = this.multiplexCount;
    if (this.style & this.STYLE_STACKED) {
      let eachMaxY = aMaxY / count;
      let beginY = 0;
      context.save();
      for each (let value in aValues) {
        let endY = beginY + (eachMaxY * value);
        this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, beginY, endY);
        beginY = endY;
      }
      context.restore();
    } else if (this.style & this.STYLE_LAYERED) {
      let minAlpha = this.foregroundMinAlpha;
      let beginY = 0;
      aValues = aValues.slice(0, count);
      aValues.sort();
      for (let i = 0; i < count; i++) {
        let value = aValues[i];
        let endY = aMaxY * value;
        context.globalAlpha = minAlpha + ((1 - minAlpha) / (i + 1));
        this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, beginY, endY);
        beginY = endY + 0.5;
      }
      context.globalAlpha = 1;
    } else if (this.style & this.STYLE_SEPARATED) {
      let width = Math.round(aMaxX / count) - 1;
      for (let i = 0; i < count; i++) {
        let value = aValues[i];
        let endY = aMaxY * aValue;
        context.save();
        context.translate((width + 1) * i, 0);
        this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, 0, endY);
        context.restore();
      }
    } else { // unified (by default)
      let value = 0;
      for (let i = 0; i < count; i++) {
        value += aValues[i];
      }
      this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, 0, aMaxY * value);
    }
    context.restore();
  },

  // polygonal graph
  drawGraphPolygon : function(aValues, aMaxY, aStyle) {
    var context = this.canvas.getContext("2d");
    context.save();

    context.translate(0, aMaxY);
    context.scale(1, -1);

    context.beginPath();
    context.strokeStyle = aStyle || this.foreground;
    context.lineWidth = 0.5;
    context.lineCap = "square";
    context.moveTo(0, 0);
    for (let i in aValues) {
      context.lineTo(i * this.unit, aMaxY * (aValues[i] || 0));
    }
    context.moveTo(aValues.length * this.unit, 0);
    context.closePath();
    context.stroke();

    context.restore();
  },

  drawGraphMultiplexedPolygon : function(aValues, aMaxX, aMaxY, aStyle) {
    var context = this.canvas.getContext("2d");
    var count = this.multiplexCount;
    if (this.style & this.STYLE_STACKED) {
      let lastValues = [];
      for (let i = 0, maxi = count; i < maxi; i++)
      {
        lastValues = [];
        for (let j in aValues) {
          let value = aValues[j];
          lastValues[j] = value ?
                   (((j in lastValues ? lastValues[j] : 0 ) + value[i]) / count) :
                   0 ;
        }
        this.drawGraphPolygon(lastValues, aMaxY, aStyle);
      }
    } else if (this.style & this.STYLE_LAYERED) {
      for (let i = 0, maxi = count; i < maxi; i++)
      {
        let values = [];
        for (let j in aValues) {
          let value = aValues[j];
          values[j] = value && value[i] || 0 ;
        }
        this.drawGraphPolygon(values, aMaxY, aStyle);
      }
    } else if (this.style & this.STYLE_SEPARATED) {
      let width = Math.round(aMaxX / count) - 1;
      for (let i = 0, maxi = count; i < maxi; i++)
      {
        context.save();
        context.translate((width + 1) * i, 0);
        let values = [];
        for (let j in aValues) {
          let value = aValues[j];
          values[j] = value && value[i] || 0 ;
        }
        this.drawGraphPolygon(values, aMaxY, aStyle);
        context.restore();
      }
    } else { // unified (by default)
      this.drawGraphPolygon(aValues.map(this.getSum), aMaxY, aStyle);
    }
  },

  drawDisabled : function() {
    this.clearAll();

    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;

    context.save();

    context.beginPath();
    context.strokeStyle = this.foreground;
    context.lineWidth = 1.0;
    context.lineCap = "square";
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
    var part = aData.replace(this.domain+this.id+'.', '');
    switch (part) {
      case "interval":
        this.unit = Math.ceil(this.getPref(aData) / 500);
      case "size":
        if (this.listening)
          this.update();
        break;

      case "color.foregroundMinAlpha":
        this.foregroundMinAlpha = Number(this.getPref(aData));
        break;

      case "style":
        this.style = this.getPref(this.domain+this.id+".style");
        if (this.listening)
          this.drawGraph(true);
        break;

      default:
        if (part.indexOf("color.") == 0) {
          this.updateColors(part.match(/^color\.([^A-Z]+)/)[1]);
          if (this.listening)
            this.drawGraph(true);
        }
        break;
    }
  },

  updateColors : function(aTarget) {
    var key = this.domain+this.id+".color."+aTarget;
    var base = this.getPref(key);
    var startAlpha = Number(this.getPref(key+"StartAlpha"));
    var endAlpha   = Math.max(startAlpha, Number(this.getPref(key+"EndAlpha")));

    var startColor = base,
        endColor = base;
    if (base.charAt(0) == "#") {
      let baseCode = base.substr(1);
      startColor = this.RGBToRGBA(baseCode, startAlpha);
      endColor = this.RGBToRGBA(baseCode, endAlpha);
    }

    this[aTarget] = base;
    this[aTarget+"Gradient"] = [startColor, endColor];

    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var gradient = context.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    this[aTarget+"GradientStyle"] = gradient;
  },
  RGBToRGBA : function(aBase, aAlpha) {
    var rgb;
    switch (aBase.length) {
      case 3: rgb = aBase.split(""); break;
      case 4: rgb = aBase.split("").slice(1); break;
      case 6: rgb = Array.slice(aBase.match(/(..)/g)); break;
      case 8: rgb = Array.slice(aBase.match(/(..)/g), 1); break;
    }
    for (let i in rgb) {
      rgb[i] = parseInt(rgb[i], 16);
    }
    return "rgba("+rgb.join(", ")+", "+aAlpha+")";
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
          this.stop();
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
          this.start();
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
  multiplexed : true,
  get multiplexCount() {
    return this._multiplexCount || (this._multiplexCount = this.system.cpu.count);
  },
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

    var parts = [];
    for (let i in aValues) {
      parts[i] = this.bundle.getFormattedString(
                   'cpu_usage_tooltip_part',
                   [parseInt(aValues[i] * 100)]
                 );
    }
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
  get tooltip() {
    return document.getElementById('system-monitor-memory-usage-tooltip-label');
  },
  self              : "#FFEE00",
  selfGradient      : ["#FFEE00", "#FFEE00"],
  selfGradientStyle : null,
  start : function() {
    this.__proto__.__proto__.start.apply(this, arguments);
    if (this.item)
      this.onChangePref(this.domain+this.id+".color.self");
  },
  drawGraph : function() {
    this.__proto__.__proto__.drawGraph.apply(this, arguments);

    var canvas = this.canvas;
    var h = canvas.height;
    var values = this.valueArray;
    if (this.style & this.STYLE_POLYGONAL) {
      let graphValues = [];
      for (let i in values) {
        graphValues[i] = values[i] && values[i][1] || 0;
      }
      this.drawGraphPolygon(graphValues || 0, h, this.self);
    } else { // bar graph
      let x = 0;
      for each (let value in values) {
        if (value) {
          this.drawGraphBar(this.selfGradientStyle, x, h, h * (value[0] - value[1]), h * value[0]);
        }
        x += this.unit;
      }
    }
  },
  // clISystemMonitor
  monitor : function(aValue) {
    var hasSelfValue = 'self' in aValue && aValue.self > -1;
    this.valueArray.shift();
    var value = [aValue.used / aValue.total,
                 0];
    if (hasSelfValue)
      value[1] = aValue.self / aValue.total;
    this.valueArray.push(value);

    this.drawGraph();

    var params = [parseInt(aValue.total / 1024 / 1024),
                  parseInt(aValue.used / 1024 / 1024),
                  parseInt(aValue.used / aValue.total * 100)];
    this.tooltip.textContent = hasSelfValue ?
      this.bundle.getFormattedString('memory_usage_self_tooltip',
        params.concat([
          parseInt(aValue.self / 1024 / 1024),
          parseInt(aValue.self / aValue.total * 100)
        ])) :
      this.bundle.getFormattedString('memory_usage_tooltip', params) ;
  }
};


window.addEventListener("load", SystemMonitorService, false);
