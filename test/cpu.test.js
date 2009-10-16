var description = 'CPU component tests'

var gCPU;
var gCPUTime;

function setUp() {
}

function tearDown() {
}

testCreate.description = "create instance test";
testCreate.priority = 'must';
function testCreate() {
  gCPU = Cc["@clear-code.com/system/cpu;1"].getService(Ci.clICPU);
  assert.isDefined(gCPU);
  assert.isDefined(gCPU.getCurrentCPUTime);
}

testGetCurrentCPUTime.description = "user property test";
testGetCurrentCPUTime.priority = 'must';
function testGetCurrentCPUTime() {
  testCreate();
  gCPUTime = gCPU.getCurrentCPUTime();
  assert.isDefined(gCPUTime);
}

testUser.description = "user property test";
testUser.priority = 'must';
function testUser() {
  testGetCurrentCPUTime();
  assert.isNumber(gCPUTime.user);
}

testSystem.description = "system property test";
testSystem.priority = 'must';
function testSystem() {
  testGetCurrentCPUTime();
  assert.isNumber(gCPUTime.system);
}

testIdle.description = "idle property test";
testIdle.priority = 'must';
function testIdle() {
  testGetCurrentCPUTime();
  assert.isNumber(gCPUTime.idle);
}

