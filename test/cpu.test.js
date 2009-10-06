var description = 'CPU component tests'

var gCPU;

function setUp() {
}

function tearDown() {
}

testCreate.description = "create instance test";
testCreate.priority = 'must';
function testCreate() {
  gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance(Ci.clICPUMonitor);
  assert.isDefined(gCPU);
}

testUser.description = "user property test";
testUser.priority = 'must';
function testUser() {
  gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance(Ci.clICPUMonitor);
  assert.equal(0, gCPU.user);
}

testSystem.description = "system property test";
testSystem.priority = 'must';
function testSystem() {
  gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance(Ci.clICPUMonitor);
  assert.equal(0, gCPU.system);
}

testIdle.description = "idle property test";
testIdle.priority = 'must';
function testIdle() {
  gCPU = Cc["@clear-code.com/cpu/monitor;1"].createInstance(Ci.clICPUMonitor);
  assert.equal(0, gCPU.idle);
}

