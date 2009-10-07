var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testProperty.description = "property test";
testProperty.priority = 'must';
function testProperty() {
  assert.isDefined(window.system);
  assert.isDefined(window.system.clock);
  window.system.clock();
}

testClock.description = "clock test";
testClock.priority = 'must';
function testClock() {
  testProperty();
  assert.isDefined(window.system.clock);
  assert.isNumber(window.system.clock());
}

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let system = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(system);
}

