var EXPORTED_SYMBOLS = ["SystemMonitorItem"];

function SystemMonitorItem() {}
SystemMonitorItem.prototype = {
  item : null,
  itemId : null,
  id   : null,
  setWindow: function SystemMonitorItem_setWindow(window) {
    this.window = window;
  },
  setConfig: function SystemMonitorItem_setConfig(config) {
    this.config = config;
  },
  get document() {
    return this.window.document;
  },
  get domain() {
    return this.config.domain;
  },
  init : function SystemMonitorItem_init() {
  },
  destroy : function SystemMonitorItem_destroy() {
  }
};
