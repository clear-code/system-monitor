function resetValue(aNode, aProperty) {
  if (!aProperty) aProperty = 'value';
  var preference = document.getElementById(aNode.getAttribute('preference'));
  aNode[aProperty] = preference.value = preference.defaultValue;
}
