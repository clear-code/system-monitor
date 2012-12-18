var description = 'CPU component tests'

var { clCPU } = utils.import('../modules/clSystem.js', {});

var cpu;

function setUp() {
  cpu = new clCPU();
}

function tearDown() {
  cpu = undefined;
}

testCreate.description = "create instance test";
testCreate.priority = 'must';
function testCreate() {
  assert.isDefined(cpu);
}

testUsage.description = "get-usage test";
testUsage.priority = 'must';
function testUsage() {
  assert.isFunction(cpu.getUsage);
  assert.isNumber(cpu.getUsage());
}

testGetCurrentTime.description = "user property test";
testGetCurrentTime.priority = 'must';
function testGetCurrentTime() {
  var time = cpu.getCurrentTime();
  assert.isDefined(time);
}

testCurrentTimeProperties.priority = 'must';
testCurrentTimeProperties.parameters = {
  user:    { name: 'user',    type: 'float' },
  nice:    { name: 'nice',    type: 'float' },
  system:  { name: 'system',  type: 'float' },
  idle:    { name: 'idle',    type: 'float' },
  io_wait: { name: 'io_wait', type: 'float' }
};
function testCurrentTimeProperties(aParameter) {
  var time = cpu.getCurrentTime();
  var value = time[aParameter.name];
  assert.isDefined(value);
  if (aParameter.type == 'float') {
    assert.isNumber(value);
    let floatVersion = parseFloat(value);
    assert.equals(floatVersion, value);
  }
}

