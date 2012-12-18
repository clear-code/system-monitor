var description = 'CPU component tests'

var cpu;

function setUp() {
  cpu = system.cpu;
}

function tearDown() {
  cpu = undefined;
}

testCreate.description = 'create instance test';
testCreate.priority = 'must';
function testCreate() {
  assert.isDefined(cpu);
}

test_count.priority = 'must';
function test_count() {
  assert.isNumber(cpu.count);
  assert.equals(parseInt(cpu.count), cpu.count);
}

test_getUsage.priority = 'must';
function test_getUsage() {
  assert.isFunction(cpu.getUsage);
  assert.isNumber(cpu.getUsage());
}

test_getUsages.priority = 'must';
function test_getUsages() {
  assert.isFunction(cpu.getUsages);
  assert.isArray(cpu.getUsages());
  cpu.getUsages().forEach(function(aUsage, aIndex) {
    assert.isNumber(aUsage, 'usages[' + aIndex + '] is not a number!');
  });
}

var CPU_TIME_PROPERTIES = ['user', 'nice', 'system', 'idle', 'io_wait'].sort();
function assertCPUTime(value, message) {
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
      value: parseFloat(propertyValue),
      type:  'number'
    };
    actualProperties.push(property);
  });
  assert.equals(CPU_TIME_PROPERTIES, actualProperties, message);
  assert.equals(expected, actual, message);
}

test_getCurrentTime.priority = 'must';
function test_getCurrentTime() {
  assert.isFunction(cpu.getCurrentTime);
  assertCPUTime(cpu.getCurrentTime());
}

test_getCurrentTimes.priority = 'must';
function test_getCurrentTimes() {
  assert.isFunction(cpu.getCurrentTimes);
  var values = cpu.getCurrentTimes();
  assert.isArray(values);
  values.forEach(function(aValue, aIndex) {
    assertCPUTime(aValue, 'values[' + aIndex + ']');
  });
}
