var description = 'CPU component tests'

var gCPUMonitor;
var gCPUTime;

function setUp() {
}

function tearDown() {
}

testCreateCPU.description = "create instance test";
testCreateCPU.priority = 'must';
function testCreateCPU() {
  let cpu = Cc["@clear-code.com/system/cpu;1"].getService(Ci.clICPU);
  assert.isDefined(cpu);
}

testCreate.description = "create instance test";
testCreate.priority = 'must';
function testCreate() {
  gCPUMonitor = Cc["@clear-code.com/cpu/monitor;1"].getService(Ci.clICPUMonitor);
  assert.isDefined(gCPUMonitor);
}

testMeasure.description = "user property test";
testMeasure.priority = 'must';
function testMeasure() {
  testCreate();
  gCPUTime = gCPUMonitor.measure();
  assert.isDefined(gCPUTime);
}

testUser.description = "user property test";
testUser.priority = 'must';
function testUser() {
  testMeasure();
  assert.isNumber(gCPUTime.user);
}

testSystem.description = "system property test";
testSystem.priority = 'must';
function testSystem() {
  testMeasure();
  assert.isNumber(gCPUTime.system);
}

testIdle.description = "idle property test";
testIdle.priority = 'must';
function testIdle() {
  testMeasure();
  assert.isNumber(gCPUTime.idle);
}

