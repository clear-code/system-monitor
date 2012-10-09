var EXPORTED_SYMBOLS = ["TextUtil"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var TextUtil = {
  formatBytes: function (bytes, base) {
    base = base || 1024;

    var notations = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];
    var number = bytes;

    while (number >= base && notations.length > 1) {
      number /= base;
      notations.shift();
    }

    return [number.toFixed(0), notations[0] + "B"];
  }
};
