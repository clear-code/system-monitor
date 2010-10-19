function initCPUUsagePane() {
  updateStyleUIFromPref('cpu-usage');
}

function initMemoryUsagePane() {
  updateStyleUIFromPref('memory-usage');
}

function updateStyleUIFromPref(aKey) {
  var slot = document.getElementById('extensions.system-monitor@clear-code.com.'+aKey+'.style');
  var value = parseInt(slot.value);

  var baseStyle = document.getElementById(aKey+'.style.base.radiogroup');
  if (value & 1)
    baseStyle.value = 1;
  else if (value & 2)
    baseStyle.value = 2;

  var extraStyle = document.getElementById(aKey+'.style.extra.radiogroup');
  if (extraStyle) {
    if (value & 128)
      extraStyle.value = 128;
    else if (value & 256)
      extraStyle.value = 256;
    else if (value & 512)
      extraStyle.value = 512;
  }
}

function updateStylePrefFromUI(aKey) {
  var slot = document.getElementById('extensions.system-monitor@clear-code.com.'+aKey+'.style');
  var value = parseInt(slot.value);

  var baseStyle = document.getElementById(aKey+'.style.base.radiogroup');
  if (value & 1) value ^= 1;
  if (value & 2) value ^= 2;
  value |= parseInt(baseStyle.value);

  var extraStyle = document.getElementById(aKey+'.style.extra.radiogroup');
  if (extraStyle) {
    if (value & 128) value ^= 128;
    if (value & 256) value ^= 256;
    if (value & 512) value ^= 512;
    value |= parseInt(extraStyle.value);
  }

  slot.value = value;
}

function resetValue(aNode, aProperty) {
  if (!aProperty) aProperty = 'value';
  var preference = document.getElementById(aNode.getAttribute('preference'));
  aNode[aProperty] = preference.value = preference.defaultValue;
}

