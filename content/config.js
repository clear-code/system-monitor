function initCPUUsagePane() {
  updateStyleUIFromPref('cpu-usage');
  updateAlphaUIFromPref('cpu-usage.color.backgroundStartAlpha');
  updateAlphaUIFromPref('cpu-usage.color.foregroundStartAlpha');
}

function initMemoryUsagePane() {
  updateStyleUIFromPref('memory-usage');
  updateAlphaUIFromPref('memory-usage.color.backgroundStartAlpha');
  updateAlphaUIFromPref('memory-usage.color.foregroundStartAlpha');
  updateAlphaUIFromPref('memory-usage.color.selfGlobalAlpha');
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
    else if (value & 1024)
      extraStyle.value = 1024;
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
    if (value & 1024) value ^= 1024;
    value |= parseInt(extraStyle.value);
  }

  slot.value = value;
}

function updateAlphaUIFromPref(aKey) {
  var slot = document.getElementById('extensions.system-monitor@clear-code.com.'+aKey);
  var scale = document.getElementById(aKey+'-scale');
  scale.value = Number(slot.value) * 100;
}

function updateAlphaPrefFromUI(aKey) {
  var slot = document.getElementById('extensions.system-monitor@clear-code.com.'+aKey);
  var scale = document.getElementById(aKey+'-scale');
  slot.value = parseInt(scale.value) / 100;
}

function resetValue(aId, aProperty) {
  if (!aProperty) aProperty = 'value';
  var node = document.getElementById(aId);
  node[aProperty] = resetPref(node.getAttribute('preference'));
}

function resetPref(aId) {
  var preference = document.getElementById(aId);
  return preference.value = preference.defaultValue;
}

