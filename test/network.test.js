var networkUsage;

function setUp() {
  var slot = { value: null };
  system.addMonitor('network-usage', function callback(aNetworkUsage) {
    slot.value = aNetworkUsage;
    system.removeMonitor('network-usage', callback);
  });
  utils.wait(slot);
  networkUsage = slot.value;
}

function tearDown() {
  networkUsage = undefined;
}

var NETWORK_LOAD_PROPERTIES = ['downBytes', 'upBytes', 'totalBytes'].sort();
function assertNetworkLoad(value, message) {
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
  assert.equals(NETWORK_LOAD_PROPERTIES, actualProperties, message);
  assert.equals(expected, actual, message);
}

testCreate.priority = 'must';
function testCreate() {
  assert.isDefined(networkUsage);
  assertNetworkLoad(networkUsage);
}
