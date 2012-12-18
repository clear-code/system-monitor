var memory;

function setUp() {
  var slot = { value: null };
  system.addMonitor('memory-usage', function callback(aMemory) {
    slot.value = aMemory;
    system.removeMonitor('memory-usage', callback);
  });
  utils.wait(slot);
  memory = slot.value;
}

function tearDown() {
  memory = undefined;
}

var MEMORY_PROPERTIES = ['total', 'used', 'free', 'self', 'virtualUsed'].sort();
function assertMemory(value, message) {
  assert.isDefined(value, message);
  assert.isObject(value, message);

  var actualProperties = [];
  var actual = {};
  var expected = {};
  Object.keys(value).sort().map(function(property) {
    var propertyValue = value[property];
    actual[property] = {
      value: propertyValue,
      type:  typeof propertyValue
    };
    expected[property] = {
      value: parseInt(propertyValue),
      type:  'number'
    };
    actualProperties.push(property);
  });
  assert.equals(MEMORY_PROPERTIES, actualProperties, message);
  assert.equals(expected, actual, message);
}

testCreate.priority = 'must';
function testCreate() {
  assert.isDefined(memory);
  assertMemory(memory);
}
