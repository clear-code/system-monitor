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
test_properties.properties = {
  total  : { name : 'total',  type : 'int' },
  used   : { name : 'used',   type : 'int' },
  free   : { name : 'free',   type : 'int' },
  shared : { name : 'shared', type : 'int' },
  buffer : { name : 'buffer', type : 'int' },
  cached : { name : 'cached', type : 'int' },
  user   : { name : 'user',   type : 'int' },
  locked : { name : 'locked', type : 'int' }
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

