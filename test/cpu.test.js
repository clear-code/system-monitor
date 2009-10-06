var description = 'CPU component tests'

var gCPU;

function setUp() {
}

function tearDown() {
}

testCreate.description = "create instance test";

function testCreate() {
  gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance().QueryInterface(Ci.clICPUMonitor);
}

