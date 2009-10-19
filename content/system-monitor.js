var updateTime = 1000;
var gCPUTimeArray = initCPUArray(24);

system.addMonitor("cpu-usage", drawCPUUsageGraph, updateTime);

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
  return y_to - 1;
}

function drawCPUUsageGraph(usage) {
  var canvasElement = document.getElementById("system-monitor-canvas");
  let context = canvasElement.getContext("2d")
  let y = canvasElement.height;
  let x = 0;

  context.fillStyle = "black";
  context.fillRect(0, 0, canvasElement.width, canvasElement.height);
  context.globalCompositeOperation = "copy";

  gCPUTimeArray.shift();
  gCPUTimeArray.push(usage);

  context.save();
  gCPUTimeArray.forEach(function(aUsage) {
    let y_from = canvasElement.height;
    let y_to = y_from;
    if (aUsage == undefined) {
      drawLine(context, "black", x, y_from, 0);
    } else {
      y_to = y_to - (y * aUsage);
      y_from = drawLine(context, "green", x, y_from, y_to);
      drawLine(context, "black", x, y_from, y_to);
    }
    x = x + 2;
  });
  context.restore();
}
