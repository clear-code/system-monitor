var memory;

var { clMemory } = utils.import('../modules/clSystem.js', {});

function setUp() {
  memory = new clMemory();
}

function tearDown() {
  memory = undefined;
}

testCreate.priority = 'must';
function testCreate() {
  assert.isDefined(memory);
}

testProperties.priority = 'must';
testProperties.parameters = {
  total:       { name: 'total',       type: 'int' },
  used:        { name: 'used',        type: 'int' },
  free:        { name: 'free',        type: 'int' },
  virtualUsed: { name: 'virtualUsed', type: 'int' }
};
function testProperties(aParameter) {
  var value = memory[aParameter.name];
  assert.isDefined(value);
  if (aParameter.type == 'int') {
    assert.isNumber(value);
    let intVersion = parseInt(value);
    assert.equals(intVersion, value);
  }
}

