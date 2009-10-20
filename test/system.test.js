var description = 'system property tests'

function setUp() {
}

function tearDown() {
}

testDefined.description = "defined test";
testDefined.priority = 'must';
function testDefined() {
  assert.isDefined(system);
}

testCPU.description = "cpu attribute test";
testCPU.priority = 'must';
function testCPU() {
  testDefined();
  assert.isDefined(system.cpu);
  assert.implementInterface("clICPU", system.cpu);
}

testGetService.description = "get service test";
testGetService.priority = 'must';
function testGetService() {
  let systemService = Cc["@clear-code.com/system;1"].getService(Ci.clISystem);
  assert.isDefined(systemService);
}

testAddMonitor.description = "monitoring test";
testAddMonitor.priority = 'must';
function testAddMonitor() {
  testDefined();

  assert.isDefined(system.addMonitor);
  system.addMonitor("cpu-time", function(aCPUTime){}, 1000);
  system.addMonitor("cpu-usage", function(usage){}, 1000);
}

testRemoveMonitor.description = "monitoring test";
testRemoveMonitor.priority = 'must';
function testRemoveMonitor() {
  testAddMonitor();

  assert.isDefined(system.removeMonitor);
  system.removeMonitor("cpu-time", function(aCPUTime){}, 1000);
  system.removeMonitor("cpu-usage", function(usage){}, 1000);
}

