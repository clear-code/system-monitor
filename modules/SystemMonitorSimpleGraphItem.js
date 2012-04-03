var EXPORTED_SYMBOLS = ["SystemMonitorSimpleGraphItem"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var { SystemMonitorItem } = Cu.import("resource://system-monitor-modules/SystemMonitorItem.js", {});
var { SystemMonitorManager } = Cu.import("resource://system-monitor-modules/SystemMonitorManager.js", {});

var { resizableToolbarItem } = Cu.import("resource://system-monitor-modules/lib/resizableToolbarItem.jsm", {});
var { prefs } = Cu.import("resource://system-monitor-modules/lib/prefs.js", {});

// this.monitor?

function SystemMonitorSimpleGraphItem() {}
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
    return this.document.getElementById(this.itemId);
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
      var { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
      this._Services = Services;
    }
    return this._Services;
  },

  init : function SystemMonitorSimpleGraph_init() {
    resizableToolbarItem.allowResize(this.item);
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

    this.size = prefs.getPref(this.domain+this.id+".size");
    this.interval = prefs.getPref(this.domain+this.id+".interval");

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

      prefs.addPrefListener(this);
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
      prefs.removePrefListener(this);
      this.stopObserve();
    }
    catch(e) {
    }

    this.listening = false;
  },

  startObserve : function SystemMonitorSimpleGraph_startObserve() {
    if (this.observing) return;
    this.observing = true;
    this.window.addEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    this.window.addEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    this.window.addEventListener(resizableToolbarItem.EVENT_TYPE_RESET, this, false);
  },

  stopObserve : function SystemMonitorSimpleGraph_stopObserve() {
    if (!this.observing) return;
    this.observing = false;
    this.window.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    this.window.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    this.window.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESET, this, false);
  },

  update : function SystemMonitorSimpleGraph_update() {
    this.stop();
    this.start();
  },

  initValueArray : function SystemMonitorSimpleGraph_initValueArray() {
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
      last = values[values.length-1];
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
    case "interval":
      this.unit = Math.ceil(prefs.getPref(aData) / 500);
    case "size":
      if (this.listening)
        this.update();
      break;

    case "color.foregroundMinAlpha":
      this.foregroundMinAlpha = Number(prefs.getPref(aData));
      break;

    case "style":
      this.style = prefs.getPref(this.domain+this.id+".style");
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
    var base = prefs.getPref(key);
    var startAlpha = Number(prefs.getPref(key+"StartAlpha"));
    var endAlpha   = Math.max(startAlpha, Number(prefs.getPref(key+"EndAlpha")));

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
    case resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN:
      let canvas = this.canvas;
      this.image.src = canvas.toDataURL();
      this.stop();
      this.startObserve();
      canvas.style.width = (canvas.width = 1)+"px";
      break;

    case resizableToolbarItem.EVENT_TYPE_RESIZE_END:
      prefs.setPref(
        this.domain+this.id+".size",
        this.canvas.parentNode.boxObject.width
      );
      this.start();
      break;

    case resizableToolbarItem.EVENT_TYPE_RESET:
      if (target == item) {
        prefs.setPref(
          this.domain+this.id+".size",
          prefs.getDefaultPref(this.domain+this.id+".size")
        );
        this.start();
      }
      break;
    }
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
  }
};
// );
