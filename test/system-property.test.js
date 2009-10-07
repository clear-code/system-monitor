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

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let system = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(system);
}

