var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testDefined.description = "defined test";
testDefined.priority = 'must';
function testDefined() {
  assert.isDefined(system);
}

testCPU.description = "cpu property test";
testCPU.priority = 'must';
function testCPU() {
  testProperty();
  assert.isDefined(system.cpu);
}

testClock.description = "clock test";
testClock.priority = 'must';
function testClock() {
  testProperty();
  assert.isDefined(system.clock);
  assert.isNumber(system.clock());
}

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let system = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(system);
}

