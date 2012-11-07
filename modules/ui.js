// function log(s) { dump(s + "\n"); }

var EXPORTED_SYMBOLS = [
//      "SystemMonitorItem",
//      "SystemMonitorSimpleGraphItem",
//      "SystemMonitorScalableGraphItem",
      "SystemMonitorCPUItem",
      "SystemMonitorMemoryItem",
      "SystemMonitorNetworkItem"
    ];

var packageName = "system-monitor";
var modulesRoot = packageName + "-modules";

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

Components.utils.import("resource://" + modulesRoot + "/SystemMonitorManager.js");

XPCOMUtils.defineLazyGetter(this, "Services", function () {
	var { Services } = Components.utils.import("resource://gre/modules/Services.jsm", {});
	return Services;
});

XPCOMUtils.defineLazyGetter(this, "prefs", function () {
	var { prefs } = Components.utils.import("resource://" + modulesRoot + "/lib/prefs.js", {});
	return prefs;
});

XPCOMUtils.defineLazyGetter(this, "Deferred", function () {
	var { Deferred } = Components.utils.import("resource://" + modulesRoot + "/lib/jsdeferred.js", {});
	return Deferred;
});

XPCOMUtils.defineLazyGetter(this, "TextUtil", function () {
	var { TextUtil } = Components.utils.import("resource://" + modulesRoot + "/lib/TextUtil.js", {});
	return TextUtil;
});

XPCOMUtils.defineLazyGetter(this, "bundle", function () {
	var { stringBundle } = Components.utils.import("resource://" + modulesRoot + "/lib/stringBundle.js", {});
	return stringBundle.get("chrome://"+packageName+"/locale/system-monitor.properties");
});

XPCOMUtils.defineLazyGetter(this, "resizableToolbarItem", function () {
	var { resizableToolbarItem } = Components.utils.import("resource://" + modulesRoot + "/lib/resizableToolbarItem.jsm", {});
	return resizableToolbarItem;
});


function SystemMonitorItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorItem.instances = [];
SystemMonitorItem.prototype = {
  master : SystemMonitorItem,

  domain : SystemMonitorManager.DOMAIN,
  item   : null,
  itemId : null,
  id     : null,

  init : function SystemMonitorItem_init() {
    this.master.instances.push(this);
  },

  destroy : function SystemMonitorItem_destroy() {
    this.master.instances.splice(this.master.instances.indexOf(this), 1);
  }
};


function SystemMonitorSimpleGraphItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorSimpleGraphItem.__proto__ = SystemMonitorItem;
SystemMonitorSimpleGraphItem.instances = [];
SystemMonitorSimpleGraphItem.prototype = {
  __proto__ : SystemMonitorItem.prototype,
  master    : SystemMonitorSimpleGraphItem,

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
  multiplexType  : (1 << 0), // SHARED
  MULTIPLEX_SHARED   : (1 << 0),
  MULTIPLEX_SEPARATE : (1 << 1),
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

  init : function SystemMonitorSimpleGraph_init() {
    SystemMonitorItem.prototype.init.apply(this, arguments);
    resizableToolbarItem.allowResize(this.item);
    this.start();
  },

  destroy : function SystemMonitorSimpleGraph_destroy() {
    SystemMonitorItem.prototype.destroy.apply(this, arguments);
    this.stop();
  },

  start : function SystemMonitorSimpleGraph_start() {
    var item = this.item;
    if (!item || this.observing)
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
      Services.obs.addObserver(this, this.topic, false);

      this.drawGraph(true);

      prefs.addPrefListener(this);
      this.startObserve();

      this.observing = true;
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
    if (!item || !this.observing)
        return;

    try {
      Services.obs.removeObserver(this, this.topic);
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

    this.observing = false;
  },

  startObserve : function SystemMonitorSimpleGraph_startObserve() {
    if (this.listening) return;
    this.listening = true;
    this.document.addEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    this.document.addEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    this.document.addEventListener(resizableToolbarItem.EVENT_TYPE_RESET, this, false);
  },

  stopObserve : function SystemMonitorSimpleGraph_stopObserve() {
    if (!this.listening) return;
    this.listening = false;
    this.document.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_BEGIN, this, false);
    this.document.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESIZE_END, this, false);
    this.document.removeEventListener(resizableToolbarItem.EVENT_TYPE_RESET, this, false);
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

  STYLE_BAR                : (1 << 0),
  STYLE_POLYGONAL          : (1 << 1),

  STYLE_UNIFIED            : (1 << 7),
  STYLE_STACKED            : (1 << 8),
  STYLE_MULTICOLOR_STACKED : (1 << 11),
  STYLE_LAYERED            : (1 << 9),
  STYLE_SEPARATED          : (1 << 10),

  drawGraph : function SystemMonitorSimpleGraph_drawGraph(aDrawAll) {
    var canvas = this.canvas;
    var w = canvas.width;
    var h = canvas.height;

    var values = this.valueArray;
    if (this.style & this.STYLE_SEPARATED)
      values = values.slice(-parseInt(values.length / this.multiplexCount));

    this.clearAll();
    if (this.style & this.STYLE_POLYGONAL) {
      let last = values[values.length-1];
      if (last && typeof last == "object") {
        this.drawGraphMultiplexedPolygon(values, w, h);
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
    if (this.style & this.STYLE_MULTICOLOR_STACKED) {
      context.save();
      let color = this.foregroundDecimalRGB;
      let gradient = context.createLinearGradient(0, this.canvas.height, 0, 0);
      gradient.addColorStop(0, "rgba("+color+", "+this.foregroundStartAlpha+")");
      let total = this.unifyValues(aValues);
      if (this.multiplexType == this.MULTIPLEX_SEPARATE) total = total / count;
      let current = 0;
      for (let i = 0; i < count; i++) {
        let delta = aValues[i] / total; // this can be NaN when 0/0
        current += isNaN(delta) ? 0 : delta ;
        let alpha = this.foregroundStartAlpha + (current * (this.foregroundEndAlpha - this.foregroundStartAlpha));
        gradient.addColorStop(current, "rgba("+color+", "+alpha+")");
        color = this["foregroundDecimalRGB."+(i+1)] || color;
        if (i < count - 1) gradient.addColorStop(current, "rgba("+color+", "+alpha+")");
      }
      if (current < 1)
        gradient.addColorStop(1, "rgba("+color+", "+this.foregroundEndAlpha+")");
      this.drawGraphBar(gradient, aX, aMaxY, 0, aMaxY * total);
      context.restore();
    } else if (this.style & this.STYLE_STACKED) {
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
      let value = this.unifyValues(aValues);
      this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, 0, aMaxY * value);
    }
    context.restore();
  },
  unifyValues : function SystemMonitorSimpleGraph_unifyValues(aValues) {
    let value = 0;
    for (let i = 0, maxi = aValues.length; i < maxi; i++) {
      value += aValues[i];
    }
    return value;
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

  drawGraphMultiplexedPolygon : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygon(aValues, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    var count = this.multiplexCount;
    var style = this.foreground;
    if (this.style & this.STYLE_STACKED ||
        this.style & this.STYLE_MULTICOLOR_STACKED) {
      let lastValues = [];
      let reversedScale = 1;
      if (this.multiplexType == this.MULTIPLEX_SEPARATE)
        reversedScale = count;
      for (let i = 0; i < count; i++)
      {
        for (let j in aValues) {
          let value = aValues[j];
          lastValues[j] = value ?
                   ((j in lastValues ? lastValues[j] : 0 ) + (value[i] / reversedScale)) :
                   0 ;
        }
        if (this.style & this.STYLE_MULTICOLOR_STACKED)
          style = this["foreground." + i] || style;
        this.drawGraphPolygon(lastValues, aMaxY, style);
      }
    } else if (this.style & this.STYLE_LAYERED) {
      for (let i = 0; i < count; i++)
      {
        let values = [];
        for (let j in aValues) {
          let value = aValues[j];
          values[j] = value && value[i] || 0 ;
        }
        this.drawGraphPolygon(values, aMaxY, style);
      }
    } else if (this.style & this.STYLE_SEPARATED) {
      let width = Math.round(aMaxX / count) - 1;
      for (let i = 0; i < count; i++)
      {
        context.save();
        context.translate((width + 1) * i, 0);
        let values = [];
        for (let j in aValues) {
          let value = aValues[j];
          values[j] = value && value[i] || 0 ;
        }
        this.drawGraphPolygon(values, aMaxY, style);
        context.restore();
      }
    } else { // unified (by default)
      this.drawGraphPolygon(aValues.map(this.getSum), aMaxY, style);
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
        if (this.observing)
          this.update();
        break;

      case "color.foregroundMinAlpha":
        this.foregroundMinAlpha = Number(prefs.getPref(aData));
        break;

      case "style":
        this.style = prefs.getPref(this.domain+this.id+".style");
        if (this.observing)
          this.drawGraph(true);
        break;

      default:
        if (part.indexOf("color.") == 0) {
          this.updateColors(part.match(/^color\.([^A-Z\.]+)/)[1]);
          if (this.observing)
            this.drawGraph(true);
        }
        break;
    }
  },

  updateColors : function SystemMonitorSimpleGraph_updateColors(aTarget) {
    var key = this.domain+this.id+".color."+aTarget;
    var base = prefs.getPref(key);
    if (!base) return;

    var startAlpha = Number(prefs.getPref(key+"StartAlpha"));
    var endAlpha   = Math.max(startAlpha, Number(prefs.getPref(key+"EndAlpha")));
    this[aTarget+"StartAlpha"] = startAlpha;
    this[aTarget+"EndAlpha"]   = endAlpha;

    var canvas = this.canvas;
    var context = canvas.getContext("2d");

    var startColor = base,
        endColor = base,
        decimalRGB = base;
    if (base.charAt(0) == "#") {
      let baseCode = base.substr(1);
      startColor = this.RGBToRGBA(baseCode, startAlpha);
      endColor = this.RGBToRGBA(baseCode, endAlpha);
      decimalRGB = this.hexToDecimal(baseCode);
    } else if (base.indexOf("rgb") == 0) {
      decimalRGB = base.replace(/^rgba?\(|\)/g, "");
    }
    this[aTarget+"DecimalRGB"] = decimalRGB;

    this[aTarget] = base;
    this[aTarget+"Gradient"] = [startColor, endColor];

    var gradient = context.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    this[aTarget+"GradientStyle"] = gradient;

    var number = 1;
    do {
      let color = prefs.getPref(key + "." + number);
      if (color === null) break;

      this[aTarget+"."+number] = color;

      let decimalRGB = color;
      if (color.charAt(0) == "#") {
        decimalRGB = this.hexToDecimal(color.substr(1));
      } else if (color.indexOf("rgb") == 0) {
        decimalRGB = color.replace(/^rgba?\(|\)/g, "");
      }
      this[aTarget+"DecimalRGB."+number] = decimalRGB;

      number++;
    } while (true);
  },
  RGBToRGBA : function SystemMonitorSimpleGraph_RGBToRGBA(aBase, aAlpha) {
    return "rgba("+this.hexToDecimal(aBase)+", "+aAlpha+")";
  },
  hexToDecimal : function SystemMonitorSimpleGraph_hexToDecimal(aBase) {
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
    return rgb.join(", ");
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
  }
};

function SystemMonitorScalableGraphItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorScalableGraphItem.__proto__ = SystemMonitorSimpleGraphItem;
SystemMonitorScalableGraphItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  master    : SystemMonitorScalableGraphItem,

  valueArray        : null,
  rawValueArray     : null,
  unifiedValueArray : null,
  maxValues         : null,
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
  get maxValue() {
    return this.maxValues ? this.maxValues[0] : 0 ;
  },
  scaleValue: function SystemMonitorScalableGraphItem_scaleValue(value) {
    if (Array.isArray(value)) {
      return value.map(this.scaleValue, this);
    } else {
      if (this.logMode)
        return value === 0 ? 0 : Math.log(value) / Math.log(this.maxValue);
      else
        return value / this.maxValue;
    }
  },
  // @Override
  initValueArray: function SystemMonitorScalableGraphItem_initValueArray() {
    // init this.valueArray
    SystemMonitorSimpleGraphItem.prototype.initValueArray.call(this);

    if (this.rawValueArray === null)
      this.rawValueArray = [];
    var arraySize = parseInt(this.size / this.unit);
    this.rawValueArray = this.resizeArray(this.rawValueArray, arraySize);

    if (this.unifiedValueArray === null)
      this.unifiedValueArray = [];
    this.unifiedValueArray = this.resizeArray(this.unifiedValueArray, arraySize);
  },
  rescaleValueArray: function SystemMonitorScalableGraphItem_rescaleValueArray() {
    if (!this.valueArray || !this.rawValueArray)
      return;

    for (let [i, value] in Iterator(this.rawValueArray)) {
      this.valueArray[i] = this.scaleValue(value);
    }
  },
  addNewValue: function SystemMonitorScalableGraphItem_addNewValue(newValue) {
    this.rawValueArray.push(newValue);
    this.valueArray.push(this.scaleValue(newValue));
    var unifiedValue = Array.isArray(newValue) ? this.unifyValues(newValue) : newValue ;
    this.unifiedValueArray.push(unifiedValue);

    // See: http://d.hatena.ne.jp/kumagi/20121007
    // update maxvalue array when enqueuing
    if (this.maxValues === null) this.maxValues = [];
    while (this.maxValues.length && this.maxValues[this.maxValues.length-1] < unifiedValue) {
      this.maxValues.pop();
    }
    this.maxValues.push(unifiedValue);

    this.rawValueArray.shift();
    this.valueArray.shift();
    var expiredValue = this.unifiedValueArray.shift();

    // update maxvalue array when dequeuing
    if (expiredValue == this.maxValues[0])
      this.maxValues.shift();
  },
  // @Override
  onChangePref: function SystemMonitorScalableGraphItem_onChangePref(aPrefName) {
    var prefLeafName = aPrefName.replace(this.domain + this.id + ".", "");
    switch (prefLeafName) {
      case "logscale":
        this.logMode = prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      default:
        return SystemMonitorSimpleGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  }
};

function SystemMonitorCPUItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorCPUItem.__proto__ = SystemMonitorSimpleGraphItem;
SystemMonitorCPUItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  master    : SystemMonitorCPUItem,

  id       : "cpu-usage",
  type     : "cpu-usages",
  itemId   : "system-monitor-cpu-usage",
  multiplexed : true,
  get multiplexCount() {
    return this._multiplexCount || (this._multiplexCount = SystemMonitorManager.cpuCount);
  },
  multiplexType : SystemMonitorSimpleGraphItem.prototype.MULTIPLEX_SEPARATE,
  get tooltip() {
    return this.document.getElementById("system-monitor-cpu-usage-tooltip-label");
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
      parts[i] = bundle.getFormattedString(
                   "cpu_usage_tooltip_part",
                   [parseInt(aValues[i] * 100)]
                 );
    }
    parts = parts.join(bundle.getString("cpu_usage_tooltip_delimiter"));
    this.tooltip.textContent = bundle.getFormattedString(
                                 "cpu_usage_tooltip",
                                 [parts]
                               );
  }
};

function SystemMonitorMemoryItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorMemoryItem.__proto__ = SystemMonitorSimpleGraphItem;
SystemMonitorMemoryItem.prototype = {
  __proto__ : SystemMonitorSimpleGraphItem.prototype,
  master    : SystemMonitorMemoryItem,

  id       : "memory-usage",
  type     : "memory-usage",
  itemId   : "system-monitor-memory-usage",
  get tooltip() {
    return this.document.getElementById("system-monitor-memory-usage-tooltip-label");
  },
  multiplexCount : 2,
  multiplexType  : SystemMonitorSimpleGraphItem.prototype.MULTIPLEX_SHARED,
  // clISystemMonitor
  monitor : function SystemMonitorMemoryMonitor_monitor(aValue) {
    var hasSelfValue = "self" in aValue && aValue.self > -1;
    this.valueArray.shift();
    var value = [aValue.used / aValue.total, 0];
    if (hasSelfValue) {
      value[0] = (aValue.used - aValue.self) / aValue.total;
      value[1] = aValue.self / aValue.total;
    }
    this.valueArray.push(value);

    this.drawGraph();

    var params = [TextUtil.formatBytes(aValue.total, 10240).join(" "),
                  TextUtil.formatBytes(aValue.used, 10240).join(" "),
                  parseInt(aValue.used / aValue.total * 100)];
    this.tooltip.textContent = hasSelfValue ?
      bundle.getFormattedString("memory_usage_self_tooltip",
        params.concat([
          TextUtil.formatBytes(aValue.self, 10240).join(" "),
          parseInt(aValue.self / aValue.total * 100)
        ])) :
      bundle.getFormattedString("memory_usage_tooltip", params) ;
  }
};

function SystemMonitorNetworkItem(aDocument)
{
  this.document = aDocument;
}
SystemMonitorNetworkItem.__proto__ = SystemMonitorScalableGraphItem;
SystemMonitorNetworkItem.prototype = {
  __proto__ : SystemMonitorScalableGraphItem.prototype,
  master    : SystemMonitorNetworkItem,

  id             : "network-usage",
  type           : "network-usages",
  itemId         : "system-monitor-network-usage",
  multiplexed    : true,
  multiplexCount : 2,
  multiplexType  : SystemMonitorSimpleGraphItem.prototype.MULTIPLEX_SHARED,
  maxValueMargin : 0.9,
  get tooltip() {
    return this.document.getElementById("system-monitor-network-usage-tooltip-label");
  },
  get maxValue() {
    var maxValue = this.maxValues ? this.maxValues[0] : 0 ;
    return Math.max(this.redZone, maxValue);
  },
  get actualMaxValue() {
    return this.maxValues ? this.maxValues[0] : 0 ;
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
        this.redZone = prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      case "color.redZone":
        this.redZoneColor = prefs.getPref(aPrefName);
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
    if (Array.isArray(value)) {
      return value.map(this.scaleValue, this);
    } else {
      value = SystemMonitorScalableGraphItem.prototype.scaleValue.apply(this, arguments);
      return value * this.maxValueMargin;
    }
  },
  // @Override
  drawGraph : function SystemMonitorNetworkItem_drawGraph() {
    SystemMonitorScalableGraphItem.prototype.drawGraph.apply(this, arguments);
    this.drawRedZone();
  },
  // @Override
  addNewValue : function SystemMonitorNetworkItem_addNewValue() {
    this.lastmaxValue = this.maxValue;
    SystemMonitorScalableGraphItem.prototype.addNewValue.apply(this, arguments);
    if (this.maxValue != this.lastmaxValue)
      this.rescaleValueArray();
  },
  lastmaxValue: -1,
  drawRedZone : function SystemMonitorNetworkItem_drawRedZone() {
    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var h = canvas.height;
    var y = h * (this.redZone / this.maxValue) * this.maxValueMargin;

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
    var upBytesDelta = aNetworkLoad.upBytes - this.previousNetworkLoad.upBytes;
    this.previousNetworkLoad = aNetworkLoad;

    // Compute bytes/s
    var downBytesPerSec = elapsedTime ? downBytesDelta / elapsedSec : 0;
    var upBytesPerSec = elapsedTime ? upBytesDelta / elapsedSec : 0;
    // Refresh chart
    this.addNewValue([downBytesPerSec, upBytesPerSec]);
    this.drawGraph();

    // Setup the tooltip text
    this.tooltip.textContent = bundle.getFormattedString(
                                 "network_usage_tooltip",
                                 [TextUtil.formatBytes(upBytesPerSec).join(" "),
                                  TextUtil.formatBytes(downBytesPerSec).join(" "),
                                  TextUtil.formatBytes(this.actualMaxValue).join(" ")]
                               );
  }
};
