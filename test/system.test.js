var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testProperty.description = "property test";
testProperty.priority = 'must';
function testProperty() {
  assert.isDefined(system);
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

