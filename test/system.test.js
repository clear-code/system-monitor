var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testProperty.description = "property test";
testProperty.priority = 'must';
function testProperty() {
  assert.isDefined(window.system);
}

testThree.description = "three test";
testThree.priority = 'must';
function testThree() {
  testProperty();
  assert.isDefined(window.system.three);
  assert.isNumber(window.system.three());
  assert.equal(3, window.system.three());
}

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let system = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(system);
}

