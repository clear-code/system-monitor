// var Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);
// function dump(s) { Application.console.log(s); }
// function log(s) { dump(s + "\n"); }

const EXPORTED_SYMBOLS = [
//      "SystemMonitorItem",
//      "SystemMonitorSimpleGraphItem",
//      "SystemMonitorScalableGraphItem",
      "SystemMonitorCPUItem",
      "SystemMonitorMemoryItem",
      "SystemMonitorNetworkItem"
    ];


const packageName = "system-monitor";
const modulesRoot = packageName + "-modules";

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

const DOMAIN = SystemMonitorManager.DOMAIN;



function defineProperties(aTarget, aProperties) {
  Object.keys(aProperties).forEach(function(aProperty) {
    var description = Object.getOwnPropertyDescriptor(aProperties, aProperty);
    Object.defineProperty(aTarget, aProperty, description);
  });
}

function toPropertyDescriptors(aProperties) {
  var descriptors = {};
  Object.keys(aProperties).forEach(function(aProperty) {
    var description = Object.getOwnPropertyDescriptor(aProperties, aProperty);
    descriptors[aProperty] = description;
  });
  return descriptors;
}

function defineSharedProperties(aConstructor, aProperties) {
  aProperties.split(/[\s,\|]+/).forEach(function(aProperty) {
    if (!aProperty) return;
    Object.defineProperty(aConstructor.prototype, aProperty, {
      get : function() { return this.klass[aProperty]; },
      set : function(aValue) { return this.klass[aProperty] = aValue; },
      configurable : true,
      enumerable   : true
    });
  });
}

function defineObserver(aFunctionalObserver) {
  aFunctionalObserver.observer = {
    domain  : aFunctionalObserver.domain,
    observe : function(aSubject, aTopic, aData) { aFunctionalObserver.observe(aSubject, aTopic, aData); }
  };
}

function RGBToRGBA(aBase, aAlpha) {
  return "rgba("+hexToDecimal(aBase)+", "+aAlpha+")";
}

function hexToDecimal(aBase) {
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
}

function resizeArray(aArray, aSize, aDefaultValue) {
  if (aArray.length < aSize) {
    while (aArray.length < aSize) {
      aArray.unshift(aDefaultValue);
    }
  } else {
    aArray = aArray.slice(-aSize);
  }
  return aArray;
};

function unifyValues(aValues) {
  let value = 0;
  for (let i = 0, maxi = aValues.length; i < maxi; i++) {
    value += aValues[i];
  }
  return value;
};



function SystemMonitorItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorItem, {
  instances : [],

  id     : "",
  itemId : "",
  domain : DOMAIN
});
SystemMonitorItem.prototype = {
  klass : SystemMonitorItem,

  item : null,

  init : function SystemMonitorItem_init() {
    this.klass.instances.push(this);
  },

  destroy : function SystemMonitorItem_destroy() {
    this.klass.instances.splice(this.klass.instances.indexOf(this), 1);
  }
};
defineSharedProperties(SystemMonitorItem,
                       'id itemId domain');


const MULTIPLEX_SHARED   = (1 << 0);
const MULTIPLEX_SEPARATE = (1 << 1);

const STYLE_BAR       = (1 << 0);
const STYLE_POLYGONAL = (1 << 1);

const STYLE_UNIFIED   = (1 << 7);
const STYLE_STACKED   = (1 << 8);
const STYLE_LAYERED   = (1 << 9);
const STYLE_SEPARATED = (1 << 10);

function SystemMonitorSimpleGraphItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorSimpleGraphItem, SystemMonitorItem);
defineProperties(SystemMonitorSimpleGraphItem, {
  instances : [],

  id     : "",
  itemId : "",

  type      : "",
  interval  : 1000,
  size      : 48,
  unit      : 2,

  foreground                 : "#33FF33",
  foregroundGradient         : ["#33FF33", "#33FF33"],
  foregroundColors           : [],
  foregroundColorsDecimalRGB : [],
  foregroundStartAlpha       : 0,
  foregroundEndAlpha         : 1,
  foregroundMinAlpha         : 0.2,

  background                 : "#000000",
  backgroundGradient         : ["#000000", "#000000"],

  style : STYLE_BAR | STYLE_UNIFIED,

  multiplexed    : false,
  multiplexCount : 1,
  multiplexType  : MULTIPLEX_SHARED,

  valueArray : null,

  get topic() {
    return SystemMonitorManager.TOPIC_BASE + this.type;
  },

  start : function SystemMonitorSimpleGraph_klass_start() {
    this.size = prefs.getPref(DOMAIN+this.id+".size");
    this.interval = prefs.getPref(DOMAIN+this.id+".interval");

    this.onChangePref(DOMAIN+this.id+".color.background");
    this.onChangePref(DOMAIN+this.id+".color.foreground");
    this.onChangePref(DOMAIN+this.id+".color.foregroundMinAlpha");
    this.onChangePref(DOMAIN+this.id+".style");

    this.initValueArray();

    Services.obs.addObserver(this.observer, this.topic, false);
    prefs.addPrefListener(this.observer);
  },

  stop : function SystemMonitorSimpleGraph_klass_stop() {
    Services.obs.removeObserver(this.observer, this.topic);
    prefs.removePrefListener(this.observer);
  },

  initValueArray : function SystemMonitorSimpleGraph_klass_initValueArray() {
    if (this.valueArray === null)
      this.valueArray = [];
    var arraySize = parseInt(this.size / this.unit);
    this.valueArray = resizeArray(this.valueArray, arraySize);
  },

  // nsIObserver
  observe : function SystemMonitorSimpleGraph_klass_observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        this.onChangePref(aData);
        break;
      case this.topic:
        this.monitor(aSubject.wrappedJSObject);
        break;
    }
  },

  // clISystemMonitor
  monitor : function SystemMonitorSimpleGraph_klass_monitor(aValue) {
    this.valueArray.shift();
    this.valueArray.push(aValue);
  },

  // preferences listener
  onChangePref : function SystemMonitorSimpleGraph_klass_onChangePref(aData) {
    var part = aData.replace(DOMAIN+this.id+".", "");
    switch (part) {
      case "size":
        this.size = prefs.getPref(aData);
        this.initValueArray();
        this.instances.forEach(function(aInstance) {
          if (aInstance.observing)
            aInstance.update();
        });
        break;

      case "color.foregroundMinAlpha":
        this.foregroundMinAlpha = Number(prefs.getPref(aData));
        break;

      case "style":
        this.style = prefs.getPref(DOMAIN+this.id+".style");
        break;

      default:
        if (part.indexOf("color.") == 0)
          this.updateColors(part.match(/^color\.([^A-Z\.]+)/)[1]);
        break;
    }
  },
  updateColors : function SystemMonitorSimpleGraph_updateColors(aTarget) {
    var key = DOMAIN+this.id+".color."+aTarget;
    var base = prefs.getPref(key);
    if (!base) return;

    var startAlpha = Number(prefs.getPref(key+"StartAlpha"));
    var endAlpha   = Math.max(startAlpha, Number(prefs.getPref(key+"EndAlpha")));
    this[aTarget+"StartAlpha"] = startAlpha;
    this[aTarget+"EndAlpha"]   = endAlpha;

    var startColor = base,
        endColor = base,
        decimalRGB = base;
    if (base.charAt(0) == "#") {
      let baseCode = base.substr(1);
      startColor = RGBToRGBA(baseCode, startAlpha);
      endColor = RGBToRGBA(baseCode, endAlpha);
      decimalRGB = hexToDecimal(baseCode);
    } else if (base.indexOf("rgb") == 0) {
      decimalRGB = base.replace(/^rgba?\(|\)/g, "");
    }
    this[aTarget+"ColorsDecimalRGB"] = [decimalRGB];

    this[aTarget] = base;
    this[aTarget+"Colors"] = [base];
    this[aTarget+"Gradient"] = [startColor, endColor];

    this.instances.forEach(function(aInstance) {
      aInstance[aTarget+"GradientStyle"] = null;
    });

    var number = 1;
    do {
      let color = prefs.getPref(key + "." + number);
      if (color === null) break;

      this[aTarget+"Colors"].push(color);

      let decimalRGB = color;
      if (color.charAt(0) == "#") {
        decimalRGB = hexToDecimal(color.substr(1));
      } else if (color.indexOf("rgb") == 0) {
        decimalRGB = color.replace(/^rgba?\(|\)/g, "");
      }
      this[aTarget+"ColorsDecimalRGB"].push(decimalRGB);

      number++;
    } while (true);
  }
});
SystemMonitorSimpleGraphItem.prototype = Object.create(SystemMonitorItem.prototype, toPropertyDescriptors({
  klass : SystemMonitorSimpleGraphItem,

  listening : false,
  observing : false,

  get foregroundGradientStyle() {
    if (!this._foregroundGradientStyle)
      this._foregroundGradientStyle = this.createGradient(this.foregroundGradient);
    return this._foregroundGradientStyle;
  },
  set foregroundGradientStyle(aValue) {
    return this._foregroundGradientStyle = aValue;
  },
  _foregroundGradientStyle : null,

  get backgroundGradientStyle() {
    if (!this._backgroundGradientStyle)
      this._backgroundGradientStyle = this.createGradient(this.backgroundGradient);
    return this._backgroundGradientStyle;
  },
  set backgroundGradientStyle(aValue) {
    return this._backgroundGradientStyle = aValue;
  },
  _backgroundGradientStyle : null,

  createGradient : function SystemMonitorSimpleGraph_createGradient(aColors) {
    var canvas = this.canvas;
    var context = canvas.getContext("2d");
    var gradient = context.createLinearGradient(0, canvas.height, 0, 0);
    var lastPosition = aColors.length - 1;
    aColors.forEach(function(aColor, aIndex) {
      gradient.addColorStop(aIndex / lastPosition, aColors[aIndex]);
    });
    return gradient;
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
    if (this.klass.instances.length == 1) this.klass.start();
    resizableToolbarItem.allowResize(this.item);
    this.start();
  },

  destroy : function SystemMonitorSimpleGraph_destroy() {
    SystemMonitorItem.prototype.destroy.apply(this, arguments);
    if (!this.klass.instances.length) this.klass.stop();
    this.stop();
  },

  start : function SystemMonitorSimpleGraph_start() {
    var item = this.item;
    if (!item || this.observing)
        return;

    try {
      this.image.src = "";

      var canvas = this.canvas;
      canvas.style.width = (canvas.width = item.width = this.size)+"px";

      Services.obs.addObserver(this, this.topic, false);

      this.drawGraph(true);

      prefs.addPrefListener(this);
      this.startObserve();

      this.observing = true;
    }
    catch(e) {
      dump("system-monitor: start failed\n"+
           "  type: "+this.type+"\n"+
           "  error:\n"+e.toString().replace(/^/gm, "    ")+"\n");
      this.drawDisabled();
    }
  },

  stop : function SystemMonitorSimpleGraph_stop() {
    var item = this.item;
    if (!item || !this.observing)
        return;

    try {
      Services.obs.removeObserver(this, this.topic);
      prefs.removePrefListener(this);
      this.stopObserve();
    }
    catch(e) {
      dump("system-monitor: stop failed\n"+
           "  type: "+this.type+"\n"+
           "  error:\n"+e.toString().replace(/^/gm, "    ")+"\n");
      this.drawDisabled();
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

  drawGraph : function SystemMonitorSimpleGraph_drawGraph(aDrawAll) {
    var canvas = this.canvas;
    var w = canvas.width;
    var h = canvas.height;

    var values = this.valueArray;
    if (this.style & STYLE_SEPARATED)
      values = values.slice(-parseInt(values.length / this.multiplexCount));

    this.clearAll();
    if (this.style & STYLE_POLYGONAL) {
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
    if (this.style & STYLE_SEPARATED)
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
    if (this.style & STYLE_STACKED) {
      this.drawGraphMultiplexedBarStacked(aValues, aX, aMaxX, aMaxY);
    } else if (this.style & STYLE_LAYERED) {
      this.drawGraphMultiplexedBarLayered(aValues, aX, aMaxX, aMaxY);
    } else if (this.style & STYLE_SEPARATED) {
      this.drawGraphMultiplexedBarSeparated(aValues, aX, aMaxX, aMaxY);
    } else { // unified (by default)
      let value = unifyValues(aValues);
      if (this.multiplexType == MULTIPLEX_SEPARATE) value /= this.multiplexCount;
      this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, 0, aMaxY * value);
    }
    context.restore();
  },
  drawGraphMultiplexedBarStacked : function SystemMonitorSimpleGraph_drawGraphMultiplexedBarStacked(aValues, aX, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();

    var count      = this.multiplexCount;
    var colors     = this.foregroundColorsDecimalRGB;
    var color      = colors[0];
    var startAlpha = this.foregroundStartAlpha;
    var endAlpha   = this.foregroundEndAlpha;

    var gradient = context.createLinearGradient(0, this.canvas.height, 0, 0);
    gradient.addColorStop(0, "rgba("+color+", "+startAlpha+")");

    var total = unifyValues(aValues);
    var current = 0;
    for (let i = 0; i < count; i++) {
      let delta = aValues[i] / total; // this can be NaN when 0/0
      current += isNaN(delta) ? 0 : delta ;

      let nextColor = colors[i+1] || color;
      if (nextColor == color) {
        gradient.addColorStop(current, "rgba("+color+", "+endAlpha+")");
        if (i < count - 1) gradient.addColorStop(current, "rgba("+color+", "+startAlpha+")");
      } else {
        let alpha = startAlpha + (current * (endAlpha - startAlpha));
        gradient.addColorStop(current, "rgba("+color+", "+alpha+")");
        color = nextColor;
        if (i < count - 1) gradient.addColorStop(current, "rgba("+color+", "+alpha+")");
      }
    }

    gradient.addColorStop(1, "rgba("+color+", "+endAlpha+")");

    if (this.multiplexType == MULTIPLEX_SEPARATE) total /= count;
    this.drawGraphBar(gradient, aX, aMaxY, 0, aMaxY * total);

    context.restore();
  },
  drawGraphMultiplexedBarLayered : function SystemMonitorSimpleGraph_drawGraphMultiplexedBarLayered(aValues, aX, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();

    var count    = this.multiplexCount;
    var minAlpha = this.foregroundMinAlpha;
    var beginY = 0;
    aValues = aValues.slice(0, count);
    aValues.sort();
    for (let i = 0; i < count; i++) {
      let value = aValues[i];
      let endY = aMaxY * value;
      context.globalAlpha = minAlpha + ((1 - minAlpha) / (i + 1));
      this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, beginY, endY);
      beginY = endY + 0.5;
    }

    context.restore();
  },
  drawGraphMultiplexedBarSeparated : function SystemMonitorSimpleGraph_drawGraphMultiplexedBarSeparated(aValues, aX, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();

    var count    = this.multiplexCount;
    var width = Math.round(aMaxX / count) - 1;
    for (let i = 0; i < count; i++) {
      let value = aValues[i];
      let endY = aMaxY * value;
      context.save();
      context.translate((width + 1) * i, 0);
      this.drawGraphBar(this.foregroundGradientStyle, aX, aMaxY, 0, endY);
      context.restore();
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

  drawGraphMultiplexedPolygon : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygon(aValues, aMaxX, aMaxY) {
    if (this.style & STYLE_STACKED) {
      this.drawGraphMultiplexedPolygonStacked(aValues, aMaxX, aMaxY);
    } else if (this.style & STYLE_LAYERED) {
      this.drawGraphMultiplexedPolygonLayered(aValues, aMaxX, aMaxY);
    } else if (this.style & STYLE_SEPARATED) {
      this.drawGraphMultiplexedPolygonSeparated(aValues, aMaxX, aMaxY);
    } else { // unified (by default)
      this.drawGraphPolygon(aValues.map(this.getSum), aMaxY, this.foreground);
    }
  },
  drawGraphMultiplexedPolygonStacked : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygonStacked(aValues, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();

    var count  = this.multiplexCount;
    var color  = this.foreground;
    var colors = this.foregroundColors;
    var lastValues = [];
    var reversedScale = 1;
    if (this.multiplexType == MULTIPLEX_SEPARATE)
      reversedScale = count;

    for (let i = 0; i < count; i++) {
      for (let j in aValues) {
        let value = aValues[j];
        lastValues[j] = value ?
                 ((j in lastValues ? lastValues[j] : 0 ) + (value[i] / reversedScale)) :
                 0 ;
      }
      color = colors[i] || color;
      this.drawGraphPolygon(lastValues, aMaxY, color);
    }

    context.restore();
  },
  drawGraphMultiplexedPolygonLayered : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygonLayered(aValues, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");
    context.save();

    var count  = this.multiplexCount;
    var color  = this.foreground;
    for (let i = 0; i < count; i++) {
      let values = [];
      for (let j in aValues) {
        let value = aValues[j];
        values[j] = value && value[i] || 0 ;
      }
      this.drawGraphPolygon(values, aMaxY, color);
    }

    context.restore();
  },
  drawGraphMultiplexedPolygonSeparated : function SystemMonitorSimpleGraph_drawGraphMultiplexedPolygonSeparated(aValues, aMaxX, aMaxY) {
    var context = this.canvas.getContext("2d");

    var count  = this.multiplexCount;
    var color  = this.foreground;
    var width = Math.round(aMaxX / count) - 1;
    for (let i = 0; i < count; i++) {
      context.save();
      context.translate((width + 1) * i, 0);
      let values = [];
      for (let j in aValues) {
        let value = aValues[j];
        values[j] = value && value[i] || 0 ;
      }
      this.drawGraphPolygon(values, aMaxY, color);
      context.restore();
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
    this.drawGraph();
  },

  // preferences listener
  onChangePref : function SystemMonitorSimpleGraph_onChangePref(aData) {
    var part = aData.replace(DOMAIN+this.id+".", "");
    switch (part) {
      case "style":
        if (this.observing)
          this.drawGraph(true);
        break;

      default:
        if (part.indexOf("color.") == 0) {
          if (this.observing)
            this.drawGraph(true);
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
          DOMAIN+this.id+".size",
          this.canvas.parentNode.boxObject.width
        );
        this.start();
        break;

      case resizableToolbarItem.EVENT_TYPE_RESET:
        if (target == item) {
          prefs.setPref(
            DOMAIN+this.id+".size",
            prefs.getDefaultPref(DOMAIN+this.id+".size")
          );
          this.start();
        }
        break;
    }
  }
}));
defineSharedProperties(SystemMonitorSimpleGraphItem,
                       'type topic interval size unit ' +
                       'foreground foregroundGradient foregroundMinAlpha ' +
                       'foregroundColors foregroundColorsDecimalRGB foregroundStartAlpha foregroundEndAlpha ' +
                       'background backgroundGradient ' +
                       'style multiplexed multiplexCount multiplexType valueArray');
defineObserver(SystemMonitorSimpleGraphItem);


function SystemMonitorScalableGraphItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorScalableGraphItem, SystemMonitorSimpleGraphItem);
defineProperties(SystemMonitorScalableGraphItem, {
  instances : [],

  rawValueArray     : null,
  unifiedValueArray : null,
  maxValues         : null,

  get logMode() {
    return this._logMode;
  },
  set logMode(aValue) {
    var changed = this._logMode !== aValue;
    this._logMode = aValue;
    if (changed)
      this.rescaleValueArray();
  },
  _logMode : false,

  get maxValue() {
    return this.maxValues ? this.maxValues[0] : 0 ;
  },

  scaleValue : function SystemMonitorScalableGraphItem_klass_scaleValue(aValue) {
    if (Array.isArray(aValue)) {
      return aValue.map(this.scaleValue, this);
    } else {
      if (this.logMode)
        return aValue === 0 ? 0 : Math.log(value) / Math.log(this.maxValue);
      else
        return aValue / this.maxValue;
    }
  },

  // @Override
  initValueArray : function SystemMonitorScalableGraphItem_klass_initValueArray() {
    SystemMonitorSimpleGraphItem.initValueArray.call(this);

    if (this.rawValueArray === null)
      this.rawValueArray = [];
    var arraySize = parseInt(this.size / this.unit);
    this.rawValueArray = resizeArray(this.rawValueArray, arraySize);

    if (this.unifiedValueArray === null)
      this.unifiedValueArray = [];
    this.unifiedValueArray = resizeArray(this.unifiedValueArray, arraySize, 0);

    this.maxValues = this.unifiedValueArray.slice(0).sort().reverse();
  },

  rescaleValueArray : function SystemMonitorScalableGraphItem_klass_rescaleValueArray() {
    if (!this.valueArray || !this.rawValueArray)
      return;

    for (let [i, value] in Iterator(this.rawValueArray)) {
      this.valueArray[i] = this.scaleValue(value);
    }
  },

  addNewValue : function SystemMonitorScalableGraphItem_klass_addNewValue(aNewValue) {
    this.rawValueArray.push(aNewValue);
    this.valueArray.push(this.scaleValue(aNewValue));
    var unifiedValue = Array.isArray(aNewValue) ? unifyValues(aNewValue) : aNewValue ;
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
  }
});
SystemMonitorScalableGraphItem.prototype = Object.create(SystemMonitorSimpleGraphItem.prototype, toPropertyDescriptors({
  klass : SystemMonitorScalableGraphItem,

  // @Override
  onChangePref: function SystemMonitorScalableGraphItem_onChangePref(aPrefName) {
    var prefLeafName = aPrefName.replace(DOMAIN + this.id + ".", "");
    switch (prefLeafName) {
      case "logscale":
        this.logMode = prefs.getPref(aPrefName);
        this.drawGraph(true);
        break;

      default:
        return SystemMonitorSimpleGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  }
}));
defineSharedProperties(SystemMonitorScalableGraphItem,
                       'logMode maxValue rawValueArray unifiedValueArray maxValues');
defineObserver(SystemMonitorScalableGraphItem);



function SystemMonitorCPUItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorCPUItem, SystemMonitorSimpleGraphItem);
defineProperties(SystemMonitorCPUItem, {
  instances : [],

  id     : "cpu-usage",
  type   : "cpu-usages",
  itemId : "system-monitor-cpu-usage",

  multiplexed    : true,
  multiplexCount : SystemMonitorManager.cpuCount,
  multiplexType  : MULTIPLEX_SEPARATE,
});
SystemMonitorCPUItem.prototype = Object.create(SystemMonitorSimpleGraphItem.prototype, toPropertyDescriptors({
  klass : SystemMonitorCPUItem,

  get tooltip() {
    return this.document.getElementById("system-monitor-cpu-usage-tooltip-label");
  },

  // clISystemMonitor
  monitor : function SystemMonitorCPUMonitor_monitor(aValues) {
    this.drawGraph();

    if (aValues.length > 1 && this.style & STYLE_UNIFIED)
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
}));
defineObserver(SystemMonitorCPUItem);


function SystemMonitorMemoryItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorMemoryItem, SystemMonitorSimpleGraphItem);
defineProperties(SystemMonitorMemoryItem, {
  instances : [],

  id     : "memory-usage",
  type   : "memory-usage",
  itemId : "system-monitor-memory-usage",

  multiplexed    : true,
  multiplexCount : 2,
  multiplexType  : MULTIPLEX_SHARED,

  // clISystemMonitor
  monitor : function SystemMonitorMemoryItem_klass_monitor(aValue) {
    var hasSelfValue = "self" in aValue && aValue.self > -1;
    this.valueArray.shift();
    var value = [aValue.used / aValue.total, 0];
    if (hasSelfValue) {
      value[0] = (aValue.used - aValue.self) / aValue.total;
      value[1] = aValue.self / aValue.total;
    }
    this.valueArray.push(value);
  }
});
SystemMonitorMemoryItem.prototype = Object.create(SystemMonitorSimpleGraphItem.prototype, toPropertyDescriptors({
  klass : SystemMonitorMemoryItem,

  get tooltip() {
    return this.document.getElementById("system-monitor-memory-usage-tooltip-label");
  },

  // clISystemMonitor
  monitor : function SystemMonitorMemoryMonitor_monitor(aValue) {
    this.drawGraph();

    var params = [TextUtil.formatBytes(aValue.total, 10240).join(" "),
                  TextUtil.formatBytes(aValue.used, 10240).join(" "),
                  parseInt(aValue.used / aValue.total * 100)];
    var hasSelfValue = "self" in aValue && aValue.self > -1;
    this.tooltip.textContent = hasSelfValue ?
      bundle.getFormattedString("memory_usage_self_tooltip",
        params.concat([
          TextUtil.formatBytes(aValue.self, 10240).join(" "),
          parseInt(aValue.self / aValue.total * 100)
        ])) :
      bundle.getFormattedString("memory_usage_tooltip", params) ;
  }
}));
defineObserver(SystemMonitorMemoryItem);


function SystemMonitorNetworkItem(aDocument)
{
  this.document = aDocument;
}
defineProperties(SystemMonitorNetworkItem, SystemMonitorScalableGraphItem);
defineProperties(SystemMonitorNetworkItem, {
  instances : [],

  id     : "network-usage",
  type   : "network-usages",
  itemId : "system-monitor-network-usage",

  multiplexed    : true,
  multiplexCount : 2,
  multiplexType  : MULTIPLEX_SHARED,

  maxValueMargin : 0.9,

  redZone      : -1,
  redZoneColor : "#FF0000",

  previousNetworkLoad : null,
  previousMeasureTime : null,

  get maxValue() {
    var maxValue = this.maxValues ? this.maxValues[0] : 0 ;
    return Math.max(this.redZone, maxValue);
  },

  get actualMaxValue() {
    return this.maxValues ? this.maxValues[0] : 0 ;
  },

  // @Override
  scaleValue : function SystemMonitorNetworkItem_klass_scaleValue(aValue) {
    if (Array.isArray(aValue)) {
      return aValue.map(this.scaleValue, this);
    } else {
      aValue = SystemMonitorScalableGraphItem.scaleValue.apply(this, arguments);
      return aValue * this.maxValueMargin;
    }
  },

  // @Override
  addNewValue : function SystemMonitorNetworkItem_klass_addNewValue() {
    var lastmaxValue = this.maxValue;
    SystemMonitorScalableGraphItem.addNewValue.apply(this, arguments);
    if (this.maxValue != lastmaxValue)
      this.rescaleValueArray();
  },

  // @Override
  start : function SystemMonitorNetworkItem_klass_start() {
    this.onChangePref(DOMAIN+this.id+".color.redZone");
    this.onChangePref(DOMAIN+this.id+".redZone");
    this.onChangePref(DOMAIN+this.id+".logscale");
    SystemMonitorScalableGraphItem.start.apply(this, arguments);
  },

  // @Override
  onChangePref : function SystemMonitorNetworkItem_klass_onChangePref(aPrefName) {
    var prefLeafName = aPrefName.replace(DOMAIN + this.id + ".", "");
    switch (prefLeafName) {
      case "redZone":
        this.redZone = prefs.getPref(aPrefName);
        break;

      case "color.redZone":
        this.redZoneColor = prefs.getPref(aPrefName);
        break;

      default:
        return SystemMonitorScalableGraphItem.onChangePref.apply(this, arguments);
    }
  },

  // clISystemMonitor
  monitor : function SystemMonitorNetworkItem_klass_monitor(aNetworkLoad) {
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
  }
});
SystemMonitorNetworkItem.prototype = Object.create(SystemMonitorScalableGraphItem.prototype, toPropertyDescriptors({
  klass : SystemMonitorNetworkItem,

  get tooltip() {
    return this.document.getElementById("system-monitor-network-usage-tooltip-label");
  },

  // @Override
  onChangePref: function SystemMonitorNetworkItem_onChangePref(aPrefName) {
    var prefLeafName = aPrefName.replace(DOMAIN + this.id + ".", "");
    switch (prefLeafName) {
      case "redZone":
        this.drawGraph(true);
        break;

      case "color.redZone":
        this.drawGraph(true);
        break;

      default:
        return SystemMonitorScalableGraphItem.prototype.onChangePref.apply(this, arguments);
    }
  },

  // @Override
  drawGraph : function SystemMonitorNetworkItem_drawGraph() {
    SystemMonitorScalableGraphItem.prototype.drawGraph.apply(this, arguments);
    this.drawRedZone();
  },
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

  monitor: function SystemMonitorNetworkItem_monitor(aNetworkLoad) {
    this.drawGraph();
    var lastValue = this.rawValueArray[this.rawValueArray.length-1] || [0, 0];
    // Setup the tooltip text
    this.tooltip.textContent = bundle.getFormattedString(
                                 "network_usage_tooltip",
                                 [TextUtil.formatBytes(lastValue[1]).join(" "), // up
                                  TextUtil.formatBytes(lastValue[0]).join(" "), // down
                                  TextUtil.formatBytes(this.actualMaxValue).join(" ")]
                               );
  }
}));
defineSharedProperties(SystemMonitorNetworkItem,
                       'actualMaxValue maxValueMargin redZone redZoneColor previousNetworkLoad previousMeasureTime');
defineObserver(SystemMonitorNetworkItem);