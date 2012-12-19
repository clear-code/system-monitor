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

var contentURI = 'chrome://system-monitor/content/icon.png';

testAutoStop_inContent.priority = 'must';
function testAutoStop_inContent() {
  utils.wait(utils.loadURI(contentURI + '?' + parseInt(Math.random() * 10000)));
  assert.isDefined(content.system);

  content.setTimeout(
    'window.lastCall = 0; \
     window.monitor = function(aValue) { \
       window.lastCall = Date.now(); \
     }; \
     system.addMonitor("cpu-time", monitor, 50);',
    0
  );
  utils.wait(200);
  utils.wait(utils.loadURI('data:text/plain,' + parseInt(Math.random() * 10000)));
  utils.wait(200);
  var afterUnload = Date.now();
  utils.wait(200);
  assert.compare(afterUnload, '>', content.wrappedJSObject.lastCall);
}

testAutoStop_inChrome.priority = 'must';
function testAutoStop_inChrome() {
  utils.wait(utils.loadURI(contentURI + '?' + parseInt(Math.random() * 10000)));
  assert.isDefined(content.system);

  var lastCall = 0;
  var monitor = function(aValue) {
        lastCall = Date.now();
      };
  assert.isTrue(content.system.addMonitor("cpu-time", monitor, 50));
  utils.wait(200);
  utils.wait(utils.loadURI('data:text/plain,' + parseInt(Math.random() * 10000)));
  utils.wait(200);
  var afterUnload = Date.now();
  utils.wait(200);
  assert.compare(afterUnload, '>', lastCall);
}
