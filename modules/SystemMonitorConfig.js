var EXPORTED_SYMBOLS = ["SystemMonitorConfig"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

function SystemMonitorConfig() {}
SystemMonitorConfig.prototype = {
  setDomain: function (domain) {
    this.domain = domain;
  }
};
