var gMemory;

function setUp() {
}

function tearDown() {
}

testCreate.priority = 'must';
function testCreate() {
  gMemory = Cc["@clear-code.com/system/memory;1"].getService(Ci.clIMemory);
  assert.isDefined(gMemory);
}

test_properties.priority = 'must';
test_properties.parameters = {
  total  : { name : 'total',  type : 'int' },
  used   : { name : 'used',   type : 'int' },
  free   : { name : 'free',   type : 'int' },
  virtualUsed : { name : 'virtualUsed', type : 'int' }
};
function test_properties(aParameter) {
  testCreate()
  var value = gMemory[aParameter.name];
  assert.isDefined(value);
  if (aParameter.type == 'int') {
    assert.isNumber(value);
    let intVersion = parseInt(value);
    assert.equals(intVersion, value);
  }
}

