var { SystemMonitorManager } = Components.utils.import("resource://system-monitor-modules/SystemMonitorManager.js", {});

// function log(s) { dump(s + "\n"); }

var SystemMonitorService = {
  domain : SystemMonitorManager.DOMAIN,

  initialized : false,
  resizing : false,
  items : [],

  get bundle() {
    return document.getElementById("system-monitor-bundle");
  },

  get Deferred() {
    if (!this._Deferred) {
      var { Deferred } = Components.utils.import("resource://system-monitor-modules/lib/jsdeferred.js", {});
      this._Deferred = Deferred;
    }
    return this._Deferred;
  },
  _Deferred : null,

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

    this.items = [
      new SystemMonitorCPUItem(),
      new SystemMonitorMemoryItem(),
      new SystemMonitorNetworkItem()
    ];

    window.addEventListener("beforecustomization", this, false);
    window.addEventListener("aftercustomization", this, false);

    this.initialized = true;

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
    this.Deferred
        .next(function() {
            self.resizableToolbarItem.insertSplitters(window);
        });
  },

  destroyToolbarItems : function SystemMonitorService_destroyToolbarItems() {
    for each (let item in this.items) {
      item.destroy();
    }
    this.resizableToolbarItem.removeSplitters(window);
  },

  initialShow : function SystemMonitorService_initialShow() {
    var bar;
    this.prefs.getPref(this.domain+"defaultTargetToolbar")
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
      if (this.prefs.getPref(this.domain+item.id+".initialShow"))
        return;

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
            self.Deferred.next(function() {
              BrowserToolboxCustomizeDone(true);
              self.initToolbarItems();
            });
          }
          else if ("MailToolboxCustomizeDone" in window) {
            self.Deferred.next(function() {
              MailToolboxCustomizeDone(null, 'CustomizeMailToolbar');
              self.initToolbarItems();
            });
          }
        });
  },
  confirmInsertToolbarItems : function SystemMonitorService_confirmInsertToolbarItems() {
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
           .next(function(aButtonIndex) {
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


function SystemMonitorItem()
{
}
SystemMonitorItem.prototype = {
  __proto__ : SystemMonitorService,
  item : null,
  itemId : null,
  id   : null,
  init : function SystemMonitorItem_init() {
  },
  destroy : function SystemMonitorItem_destroy() {
  }
};


function SystemMonitorSimpleGraphItem()
{
}
SystemMonitorSimpleGraphItem.prototype = {
  __proto__ : SystemMonitorItem.prototype,

  id       : "",
  type     : "",
  itemId   : "",

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

  get topic() {
    return SystemMonitorManager.TOPIC_BASE + this.type;
  },

  get item() {
    return document.getElementById(this.itemId);
  },
  get image() {
      if (!this.item) {
        let stack = Components.stack;
        let backtrace = [];
        while (stack) { backtrace.push(stack); stack = stack.caller; }
        throw new Error("unexpected access for the property \"image\"!\n"+backtrace.join("\n"));
      }
      return this.item.getElementsByTagName("image")[0];
  },
  get canvas() {
      if (!this.item) {
        let stack = Components.stack;
        let backtrace = [];
        while (stack) { backtrace.push(stack); stack = stack.caller; }
        throw new Error("unexpected access for the property \"canvas\"!\n"+backtrace.join("\n"));
      }
      return this.item.getElementsByTagName("canvas")[0];
  },

  get Services() {
    if (!this._Services) {
      var { Services } = Components.utils.import("resource://gre/modules/Services.jsm", {});
      this._Services = Services;
    }
    return this._Services;
  },

  init : function SystemMonitorSimpleGraph_init() {
    this.resizableToolbarItem.allowResize(this.item);
    this.start();
  },

  destroy : function SystemMonitorSimpleGraph_destroy() {
    this.stop();
  },

  start : function SystemMonitorSimpleGraph_start() {
    var item = this.item;
    if (!this.initialized ||
        !item ||
        this.listening)
        return;

    this.size = this.prefs.getPref(this.domain+this.id+".size");
    this.interval = this.prefs.getPref(this.domain+this.id+".interval");

    this.onChangePref(this.domain+this.id+".color.background");
    this.onChangePref(this.domain+this.id+".color.foreground");
    this.onChangePref(this.domain+this.id+".color.foregroundMinAlpha");
    this.onChangePref(this.domain+this.id+".style");

    this.image.src = "";

    var canvas = this.canvas;
    canvas.style.width = (canvas.width = item.width = this.size)+"px";
    this.initValueArray();

    try {
        this.Services.obs.addObserver(this, this.topic, false);

        this.drawGraph(true);

        this.prefs.addPrefListener(this);
        this.startObserve();

        this.listening = true;
    }
    catch(e) {
        dump("system-monitor: addMonitor() failed\n"+
             "  type: "+this.type+"\n"+
             "  interval: "+this.interval+"\n"+
             "  error:\n"+e.toString().replace(/^/gm, "    ")+"\n"+
             e.stack+"\n");
        this.drawDisabled();
    }
  },

  stop : function SystemMonitorSimpleGraph_stop() {
    var item = this.item;
    if (!this.initialized ||
        !item ||
        !this.listening)
        return;

    try {
        this.Services.obs.removeObserver(this, this.topic);
    }
    catch(e) {
        dump("system-monitor: removeMonitor() failed\n"+
             "  type: "+this.type+"\n"+
             "  error:\n"+e.toString().replace(/^/gm, "    ")+"\n");
        this.drawDisabled();
    }

    try {
        this.prefs.removePrefListener(this);
        this.stopObserve();
    }
    catch(e) {
    }

    this.listening = false;
  },

  startObserve : function SystemMonitorSimpleGraph_startObserve() {
    if (this.observing) return;
    this.observing = true;
    window.addEventListener(this.resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    window.addEventListener(this.resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    window.addEventListener(this.resizableToolbarItem.EVENT_TYPE_RESET, this, false);
  },

  stopObserve : function SystemMonitorSimpleGraph_stopObserve() {
    if (!this.observing) return;
    this.observing = false;
    window.removeEventListener(this.resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    window.removeEventListener(this.resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    window.removeEventListener(this.resizableToolbarItem.EVENT_TYPE_RESET, this, false);
  },

  update : function SystemMonitorSimpleGraph_update() {
    this.stop();
    this.start();
  },

  resizeArray: function (array, size, defaultValue) {
    if (array.length < size) {
      while (array.length < size) {
        array.unshift(defaultValue);
      }
    } else {
      array = this.valueArray.slice(-size);
    }

    return array;
  },

  initValueArray : function SystemMonitorSimpleGraph_initValueArray() {
    if (this.valueArray === null)
      this.valueArray = [];
    var arraySize = parseInt(this.size / this.unit);
    this.valueArray = this.resizeArray(this.valueArray, arraySize);
  },

  getSum : function SystemMonitorSimpleGraph_getSum(aValues) {
    if (!aValues)
      return 0;

    if (typeof aValues == "number")
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
  drawGraph : function SystemMonitorSimpleGraph_drawGraph(aDrawAll) {
    var canvas = this.canvas;
    var w = canvas.width;
    var h = canvas.height;

    var values = this.valueArray;
    if (this.style & this.STYLE_SEPARATED)
      values = values.slice(-parseInt(values.length / this.multiplexCount));

    this.clearAll();
    if (this.style & this.STYLE_POLYGONAL) {
      var last = values[values.length-1];
      if (last && typeof last == "object") {
        this.drawGraphMultiplexedPolygon(values, w, h, this.foreground);
      } else {
        this.drawGraphPolygon(values || 0, h, this.foreground);
      }
    } else { // bar graph (by default)
      let x = 0;
      for each (let value in values) {
        if (value) {
          if (typeof value == "object") {
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

  clearAll : function SystemMonitorSimpleGraph_clearAll() {
    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.backgroundGradientStyle;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  },

  drawVerticalLine : function SystemMonitorSimpleGraph_drawVerticalLine(aStyle, aX, aMaxY, aBeginY, aEndY, aWidth) {
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

  drawSeparators : function SystemMonitorSimpleGraph_drawSeparators(aMaxX, aMaxY)
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
  drawGraphBar : function SystemMonitorSimpleGraph_drawGraphBar(aStyle, aX, aMaxY, aBeginY, aEndY) {
    this.drawVerticalLine(aStyle, aX, aMaxY, aBeginY, aEndY, this.unit);
  },

  drawGraphMultiplexedBar : function SystemMonitorSimpleGraph_drawGraphMultiplexedBar(aValues, aX, aMaxX, aMaxY) {
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
        let endY = aMaxY * value;
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
  drawGraphPolygon : function SystemMonitorSimpleGraph_drawGraphPolygon(aValues, aMaxY, aStyle) {
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

  drawGraphMultiplexedPolygon : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygon(aValues, aMaxX, aMaxY, aStyle) {
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

  drawDisabled : function SystemMonitorSimpleGraph_drawDisabled() {
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
  monitor : function SystemMonitorSimpleGraph_monitor(aValue) {
    this.valueArray.shift();
    this.valueArray.push(aValue);
    this.drawGraph();
  },

  // preferences listener
  onChangePref : function SystemMonitorSimpleGraph_onChangePref(aData) {
    var part = aData.replace(this.domain+this.id+".", "");
    switch (part) {
      case "size":
        if (this.listening)
          this.update();
        break;

      case "color.foregroundMinAlpha":
        this.foregroundMinAlpha = Number(this.prefs.getPref(aData));
        break;

      case "style":
        this.style = this.prefs.getPref(this.domain+this.id+".style");
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

  updateColors : function SystemMonitorSimpleGraph_updateColors(aTarget) {
    var key = this.domain+this.id+".color."+aTarget;
    var base = this.prefs.getPref(key);
    if (!base) return;

    var startAlpha = Number(this.prefs.getPref(key+"StartAlpha"));
    var endAlpha   = Math.max(startAlpha, Number(this.prefs.getPref(key+"EndAlpha")));

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
  RGBToRGBA : function SystemMonitorSimpleGraph_RGBToRGBA(aBase, aAlpha) {
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
  observe : function SystemMonitorSimpleGraph_observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        this.onChangePref(aData);
        break;
      case this.topic:
        this.monitor(aSubject.wrappedJSObject);
        break;
    }
  },

  // nsIDOMEventListener
  handleEvent : function SystemMonitorSimpleGraph_handleEvent(aEvent) {
    var item = this.item;
    if (!item)
        return;

    var target = aEvent.target;
    if (target != item &&
        target != item.nextSibling &&
        target != item.previousSibling)
      return;

    switch (aEvent.type) {
      case this.resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN:
        let canvas = this.canvas;
        this.image.src = canvas.toDataURL();
        this.stop();
        this.startObserve();
        canvas.style.width = (canvas.width = 1)+"px";
        break;

      case this.resizableToolbarItem.EVENT_TYPE_RESIZE_END:
        this.prefs.setPref(
          this.domain+this.id+".size",
          this.canvas.parentNode.boxObject.width
        );
        this.start();
        break;

      case this.resizableToolbarItem.EVENT_TYPE_RESET:
        if (target == item) {
          this.prefs.setPref(
            this.domain+this.id+".size",
            this.prefs.getDefaultPref(this.domain+this.id+".size")
          );
          this.start();
        }
        break;
    }
  }
};

function SystemMonitorScalableGraphItem() {}

SystemMonitorScalableGraphItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  valueArray : null,
  rawValueArray : null,
  set logMode(value) {
    var changed = this._logMode !== value;
    this._logMode = value;
    if (changed)
      this.rescaleValueArray();
  },
  get logMode() {
    return this._logMode;
  },
  _logMode : true,
  get maximumValue() {
    return Math.max.apply(Math, this.rawValueArray);
  },
  scaleValue: function (value) {
    if (this.logMode)
      return value === 0 ? 0 : Math.log(value) / Math.log(this.maximumValue);
    else
      return value / this.maximumValue;
  },
  // @Override
  initValueArray: function () {
    // init this.valueArray
    SystemMonitorSimpleGraphItem.prototype.initValueArray.call(this);

    if (this.rawValueArray === null)
      this.rawValueArray = [];
    var arraySize = parseInt(this.size / this.unit);
    this.rawValueArray = this.resizeArray(this.rawValueArray, arraySize);
  },
  rescaleValueArray: function () {
    if (!this.valueArray || !this.rawValueArray)
      return;

    for (let [i, value] in Iterator(this.rawValueArray)) {
      this.valueArray[i] = this.scaleValue(value);
    }
  },
  addNewValue: function (newValue) {
    this.rawValueArray.shift();
    this.rawValueArray.push(newValue);
    this.valueArray.shift();
    this.valueArray.push(this.scaleValue(newValue));
  },
  // @Override
  onChangePref: function (aPrefName) {
    var prefLeafName = aPrefName.replace(this.domain + this.id + ".", "");
    switch (prefLeafName) {
      case "logscale":
        this.logMode = this.prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      default:
        return SystemMonitorSimpleGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  }
};

function SystemMonitorCPUItem()
{
}
SystemMonitorCPUItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  id       : "cpu-usage",
  type     : "cpu-usages",
  itemId   : "system-monitor-cpu-usage",
  multiplexed : true,
  get multiplexCount() {
    return this._multiplexCount || (this._multiplexCount = SystemMonitorManager.cpuCount);
  },
  get tooltip() {
    return document.getElementById("system-monitor-cpu-usage-tooltip-label");
  },
  // clISystemMonitor
  monitor : function SystemMonitorCPUMonitor_monitor(aValues) {
    this.valueArray.shift();
    this.valueArray.push(aValues);
    this.drawGraph();

    if (aValues.length > 1 && this.style & this.STYLE_UNIFIED)
      aValues = [this.getSum(aValues)];

    var parts = [];
    for (let i in aValues) {
      parts[i] = this.bundle.getFormattedString(
                   "cpu_usage_tooltip_part",
                   [parseInt(aValues[i] * 100)]
                 );
    }
    parts = parts.join(this.bundle.getString("cpu_usage_tooltip_delimiter"));
    this.tooltip.textContent = this.bundle.getFormattedString(
                                 "cpu_usage_tooltip",
                                 [parts]
                               );
  }
};

function SystemMonitorMemoryItem()
{
}
SystemMonitorMemoryItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  id       : "memory-usage",
  type     : "memory-usage",
  itemId   : "system-monitor-memory-usage",
  get tooltip() {
    return document.getElementById("system-monitor-memory-usage-tooltip-label");
  },
  self              : "#FFEE00",
  selfGradient      : ["#FFEE00", "#FFEE00"],
  selfGradientStyle : null,
  selfGlobalAlpha   : 1,
  start : function SystemMonitorMemoryMonitor_start() {
    SystemMonitorSimpleGraphItem.prototype.start.apply(this, arguments);
    if (this.item) {
      this.onChangePref(this.domain+this.id+".color.selfGlobalAlpha");
      this.onChangePref(this.domain+this.id+".color.self");
    }
  },
  drawGraph : function SystemMonitorMemoryMonitor_drawGraph() {
    SystemMonitorSimpleGraphItem.prototype.drawGraph.apply(this, arguments);

    var canvas = this.canvas;
    var context = canvas.getContext("2d");
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
      context.save();
      context.globalAlpha = this.selfGlobalAlpha;
      for each (let value in values) {
        if (value) {
          this.drawGraphBar(this.selfGradientStyle, x, h, h * (value[0] - value[1]), h * value[0]);
        }
        x += this.unit;
      }
      context.restore();
    }
  },
  onChangePref : function SystemMonitorMemoryMonitor_onChangePref(aData) {
    var part = aData.replace(this.domain+this.id+".", "");
    switch (part) {
      case "color.selfGlobalAlpha":
        this.selfGlobalAlpha = Number(this.prefs.getPref(aData));
        if (this.listening)
          this.drawGraph(true);
        return;

      default:
        return SystemMonitorSimpleGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  },
  // clISystemMonitor
  monitor : function SystemMonitorMemoryMonitor_monitor(aValue) {
    var hasSelfValue = "self" in aValue && aValue.self > -1;
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
      this.bundle.getFormattedString("memory_usage_self_tooltip",
        params.concat([
          parseInt(aValue.self / 1024 / 1024),
          parseInt(aValue.self / aValue.total * 100)
        ])) :
      this.bundle.getFormattedString("memory_usage_tooltip", params) ;
  }
};

function SystemMonitorNetworkItem()
{
}
SystemMonitorNetworkItem.prototype = {
  __proto__      : SystemMonitorScalableGraphItem.prototype,
  id             : "network-usage",
  type           : "network-usages",
  itemId         : "system-monitor-network-usage",
  multiplexed    : false,
  multiplexCount : 1,
  maximumValueMargin : 0.9,
  get tooltip() {
    return document.getElementById("system-monitor-network-usage-tooltip-label");
  },
  get maximumValue() {
    return Math.max.apply(Math, this.rawValueArray.concat(this.redZone));
  },
  redZone : -1,
  redZoneColor : "#FF0000",
  // @Override
  resizeArray: function SystemMonitorNetworkItem_resizeArray(array, size) {
    return SystemMonitorScalableGraphItem.prototype.resizeArray.call(this, array, size, 0);
  },
  // @Override
  onChangePref: function SystemMonitorNetworkItem_onChangePref(aPrefName) {
    var prefLeafName = aPrefName.replace(this.domain + this.id + ".", "");
    switch (prefLeafName) {
      case "redZone":
        this.redZone = this.prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      case "color.redZone":
        this.redZoneColor = this.prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      default:
        return SystemMonitorScalableGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  },
  start : function SystemMonitorNetworkItem_start() {
    SystemMonitorScalableGraphItem.prototype.start.apply(this, arguments);
    if (this.item) {
      this.onChangePref(this.domain+this.id+".color.redZone");
      this.onChangePref(this.domain+this.id+".redZone");
      this.onChangePref(this.domain+this.id+".logscale");
    }
  },
  // @Override
  scaleValue: function SystemMonitorNetworkItem_scaleValue(value) {
    value = SystemMonitorScalableGraphItem.prototype.scaleValue.apply(this, arguments);
    return value * this.maximumValueMargin;
  },
  // @Override
  drawGraph : function SystemMonitorNetworkItem_drawGraph() {
    SystemMonitorScalableGraphItem.prototype.drawGraph.apply(this, arguments);
    this.drawRedZone();
  },
  // @Override
  addNewValue : function SystemMonitorNetworkItem_addNewValue() {
    this.lastMaximumValue = this.maximumValue;
    SystemMonitorScalableGraphItem.prototype.addNewValue.apply(this, arguments);
    if (this.maximumValue != this.lastMaximumValue)
      this.rescaleValueArray();
  },
  lastMaximumValue: -1,
  drawRedZone : function SystemMonitorNetworkItem_drawRedZone() {
    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var h = canvas.height;
    var y = h * (this.redZone / this.maximumValue) * this.maximumValueMargin;

    context.save();

    context.translate(0, h);
    context.scale(1, -1);

    context.beginPath();
    context.strokeStyle = this.redZoneColor;
    context.lineWidth = 0.5;
    context.lineCap = "square";
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.closePath();
    context.stroke();

    context.restore();
  },
  previousNetworkLoad: null,
  previousMeasureTime: null,
  monitor: function SystemMonitorNetworkItem_monitor(aNetworkLoad) {
    // Record measure time
    var currentTime = Date.now();
    if (!this.previousMeasureTime)
      this.previousMeasureTime = currentTime;
    var elapsedTime = currentTime - this.previousMeasureTime;
    var elapsedSec = elapsedTime / 1000;
    this.previousMeasureTime = currentTime;
    // Record network load
    if (!this.previousNetworkLoad)
      this.previousNetworkLoad = aNetworkLoad;
    var downBytesDelta = aNetworkLoad.downBytes - this.previousNetworkLoad.downBytes;
    this.previousNetworkLoad = aNetworkLoad;

    // Compute bytes/s
    var downBytesPerSec = elapsedTime ? downBytesDelta / elapsedSec : 0;
    // Refresh chart
    this.addNewValue(downBytesPerSec);
    this.drawGraph();

    // Setup the tooltip text
    var { TextUtil } = Components.utils.import("resource://system-monitor-modules/lib/TextUtil.js", {});
    this.tooltip.textContent =
      TextUtil.formatBytes(downBytesPerSec).join("") + "/s"
      + " (Max: " + TextUtil.formatBytes(this.maximumValue).join("") + "/s)";
  }
};

window.addEventListener("load", SystemMonitorService, false);
