var updateTime = 1000;

var gCPUMonitor = Cc["@clear-code.com/cpu/monitor;1"].getService(Ci.clICPUMonitor);

var gCPUTimeArray = initCPUArray();

window.setInterval(function() {drawGraph()}, updateTime);

function initCPUArray() {
  var cpuArray = new Array(32)

  return cpuArray;
}

function drawLine(context, color, x, y) {
  context.strokeStyle = color;
  Application.console.log(x + ":" + y);
  context.lineTo(x, y);
}

function drawGraph() {
  var canvasElement = document.getElementById("system-monitor-canvas");
  let context = canvasElement.getContext("2d")
  let y = canvasElement.height;
  let x = 0;
  let ratio = 0.0;

  context.save();
  context.strokeStyle = "black";
  context.lineWidth = 1.0;
  context.lineCap = "square";

  cpuTime = gCPUMonitor.measure();
  gCPUTimeArray.shift();
  gCPUTimeArray.push(cpuTime);

  context.beginPath();
  gCPUTimeArray.forEach(function(aCPUTime) {
    context.moveTo(x, y);
    if (aCPUTime != undefined) {
      drawLine(context, "blue", x, y * aCPUTime.user);
      drawLine(context, "gray", x, y * aCPUTime.system);
      drawLine(context, "black", x, y * aCPUTime.idle);
    }
    x++;
  });
  context.stroke();
  context.restore();
}


