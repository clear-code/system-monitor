var EXPORTED_SYMBOLS = ['addShutdownListener'];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'prefs', 'resource://system-monitor-modules/lib/prefs.js');

function log(aMessage) {
	if (prefs.getPref('extensions.system-monitor@clear-code.com.debug.ShutdownListener')
		dump(aMessage+'\n');
}

XPCOMUtils.defineLazyGetter(this, 'shutdownListener', function () {
	const ObserverService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
	var shutdownListener = {
			type : 'quit-application-granted',
			observe : function(aSubject, aTopic, aData) {
				ObserverService.removeObserver(this, this.type);
				for each (var listener in this.listeners) {
					try {
						listener();
					}
					catch(e) {
						log(e);
					}
				}
			},
			init : function() {
				ObserverService.addObserver(this, this.type, false);
			},
			listeners : []
		};
	shutdownListener.init();
	return shutdownListener;
});

function addShutdownListener(aListener) {
	shutdownListener.listeners.push(aListener);
}

