var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testDefined.description = 'defined test';
testDefined.priority = 'must';
function testDefined() {
  assert.isDefined(system);
  assert.isDefined(system.cpu);
  assert.isFunction(system.addMonitor);
  assert.isFunction(system.removeMonitor);
}

testAddRemoveMonitor.description = 'monitoring test';
testAddRemoveMonitor.priority = 'must';
testAddRemoveMonitor.parameters = {
	'cpu-time':      { target: 'cpu-time',      expected: TypeOf('object') },
	'cpu-times':     { target: 'cpu-times',     expected: TypeOf('array') },
	'cpu-usage':     { target: 'cpu-usage',     expected: TypeOf('number') },
	'cpu-usages':    { target: 'cpu-usages',    expected: TypeOf('array') },
	'memory-usage':  { target: 'memory-usage',  expected: TypeOf('object') },
	'network-usage': { target: 'network-usage', expected: TypeOf('object') }
};
function testAddRemoveMonitor(aParameter) {
  var functionListenerMock = new FunctionMock(aParameter.target + ' function');
  functionListenerMock.expect(aParameter.expected);
  assert.isTrue(system.addMonitor(aParameter.target, functionListenerMock, 30));

  var objectListenerMock = new Mock(aParameter.target + ' object');
  objectListenerMock.expect('monitor', aParameter.expected);
  assert.isTrue(system.addMonitor(aParameter.target, objectListenerMock, 30));

  utils.wait(50);

  assert.isTrue(system.removeMonitor(aParameter.target, functionListenerMock));
  assert.isTrue(system.removeMonitor(aParameter.target, objectListenerMock));

  utils.wait(50);
}

testAutoStop.priority = 'must';
function testAutoStop() {
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  assert.isDefined(content.system);

  var monitor = content.wrappedJSObject.monitor = new FunctionMock('added on a context in a content window');
  monitor.expect(TypeOf('object'));
  content.setTimeout('system.addMonitor("cpu-time", monitor, 500);', 0);
  utils.wait(600);
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  utils.wait(600);

  monitor = new FunctionMock('added on a context in a chrome window');
  monitor.expect(TypeOf('object'));
  assert.isTrue(content.system.addMonitor("cpu-time", monitor, 500));
  utils.wait(600);
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  utils.wait(600);
}
