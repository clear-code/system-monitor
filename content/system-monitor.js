var updateTime = 1000;

var gCPUMonitor = Cc["@clear-code.com/cpu/monitor;1"].getService(Ci.clICPUMonitor);

var gCPUTimeArray = initCPUArray(24);

window.setInterval(function() {drawGraph()}, updateTime);

function initCPUArray(size) {
  var cpuArray = new Array();

  for (let i = 0; i < size; i++) {
    cpuArray.push(undefined);
  }

  return cpuArray;
}

function drawLine(context, color, x, y_from, y_to) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = 1.0;
  context.lineCap = "square";
  context.globalCompositeOperation = "copy";
  context.moveTo(x, y_from);
  context.lineTo(x, y_to);
  context.closePath();
  context.stroke();
  return y_to;
}

function drawGraph() {
  var canvasElement = document.getElementById("system-monitor-canvas");
  let context = canvasElement.getContext("2d")
  let y = canvasElement.height;
  let x = 0;

  context.fillStyle = "black";
  context.fillRect(0, 0, canvasElement.width, canvasElement.height);
  context.globalCompositeOperation = "copy";

  cpuTime = gCPUMonitor.measure();
  gCPUTimeArray.shift();
  gCPUTimeArray.push(cpuTime);

  context.save();
  gCPUTimeArray.forEach(function(aCPUTime) {
    y_from = canvasElement.height;
    y_to = y_from;
    if (aCPUTime == undefined) {
      drawLine(context, "black", x, y_from, 0);
    } else {
      y_to = y_to - (y * aCPUTime.user);
      y_from = drawLine(context, "blue", x, y_from, y_to);
      y_to = y_to - (y * aCPUTime.system);
      y_from = drawLine(context, "green", x, y_from, y_to);
      y_to = y_to - (y * aCPUTime.nice);
      y_from = drawLine(context, "grey", x, y_from, y_to);
      y_to = y_to - (y * aCPUTime.io_wait);
      y_from = drawLine(context, "red", x, y_from, y_to);
      y_to = y_to - (y * aCPUTime.idle);
      drawLine(context, "black", x, y_from, y_to);
    }
    x = x + 2;
  });
  context.restore();
}

