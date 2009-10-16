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

testMonitor.description = "monitoring test";
testMonitor.priority = 'must';
function testMonitor() {
  testDefined();

  assert.isDefined(system.registerMonitor);
  system.registerMonitor("cpu-time", function(aCPUTime){}, 1000);
  system.registerMonitor("cpu-usage", function(usage){}, 1000);
}

