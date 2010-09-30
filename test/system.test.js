var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testDefined.description = "defined test";
testDefined.priority = 'must';
function testDefined() {
  assert.isDefined(system);
  // assert.isInstanceOf(Ci.clISystem, system);

  assert.isDefined(system.cpu);
  assert.isInstanceOf(Ci.clICPU, system.cpu);

  assert.isFunction(system.addMonitor);
  assert.isFunction(system.removeMonitor);
}

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let systemService = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(systemService);
}

testAddRemoveMonitor.description = "monitoring test";
testAddRemoveMonitor.priority = 'must';
testAddRemoveMonitor.parameters = {
	'cpu-time' : { target : 'cpu-time', expected : TypeOf(Ci.clICPUTime) },
	'cpu-usage' : { target : 'cpu-usage', expected : TypeOf(Number) },
	'memory-usage' : { target : 'memory-usage', expected : TypeOf(Ci.clIMemory) }
};
function testAddRemoveMonitor(aParameter) {
  testDefined();

  var functionListenerMock = new FunctionMock(aParameter.target+' function');
  functionListenerMock.expect(aParameter.expected);
  system.addMonitor(aParameter.target, functionListenerMock, 300);

  var objectListenerMock = new Mock(aParameter.target+' object');
  objectListenerMock.expect('monitor', aParameter.expected);
  system.addMonitor(aParameter.target, objectListenerMock, 300);

  utils.wait(500);

  system.removeMonitor(aParameter.target, functionListenerMock);
  system.removeMonitor(aParameter.target, objectListenerMock);

  utils.wait(500);
}

testAutoStop.priority = 'must';
function testAutoStop() {
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  assert.isDefined(content.system);

  var monitor = content.wrappedJSObject.monitor = new FunctionMock('added on a context in a content window');
  monitor.expect(TypeOf(Ci.clICPUTime));
  content.setTimeout('system.addMonitor("cpu-time", monitor, 500);', 0);
  utils.wait(600);
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  utils.wait(600);

  monitor = new FunctionMock('added on a context in a chrome window');
  monitor.expect(TypeOf(Ci.clICPUTime));
  content.system.addMonitor("cpu-time", monitor, 500);
  utils.wait(600);
  utils.loadURI('about:blank?'+parseInt(Math.random() * 10000));
  utils.wait(600);
}


