var EXPORTED_SYMBOLS = ['addShutdownListener'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

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
						dump(e+'\n');
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

