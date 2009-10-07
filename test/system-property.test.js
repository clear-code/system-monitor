var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testProperty.description = "system property test";
testProperty.priority = 'must';
function testProperty() {
  assert.isDefined(window.system);
}

