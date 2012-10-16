/*
 string bundle utility

 Usage:
   var bundle = window['piro.sakura.ne.jp']
                         .stringBundle
                         .get('chrome://example/locale/example.properties');
   bundle.getString('key1');
   bundle.getFormattedString('key2', [val1, val2]);

 license: The MIT License, Copyright (c) 2009 YUKI "Piro" Hiroshi
   http://github.com/piroor/fxaddonlibs/blob/master/license.txt
 original:
   http://github.com/piroor/fxaddonlibs/blob/master/stringBundle.js
*/

/* To work as a JS Code Module */
if (typeof window == 'undefined' ||
	(window && typeof window.constructor == 'function')) {
	this.EXPORTED_SYMBOLS = ['stringBundle'];

	// If namespace.jsm is available, export symbols to the shared namespace.
	// See: http://github.com/piroor/fxaddonlibs/blob/master/namespace.jsm
	try {
		let ns = {};
		Components.utils.import('resource://system-monitor-modules/lib/namespace.jsm', ns);
		/* var */ window = ns.getNamespaceFor('piro.sakura.ne.jp');
	}
	catch(e) {
		window = {};
	}
}

(function() {
	const currentRevision = 1;

	if (!('piro.sakura.ne.jp' in window)) window['piro.sakura.ne.jp'] = {};

	var loadedRevision = 'stringBundle' in window['piro.sakura.ne.jp'] ?
			window['piro.sakura.ne.jp'].stringBundle.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		return;
	}

	var Cc = Components.classes;
	var Ci = Components.interfaces;

	window['piro.sakura.ne.jp'].stringBundle = {
		revision : currentRevision,

		get : function(aURI)
		{
			if (!(aURI in this._cache)) {
				this._cache[aURI] = new StringBundle(aURI);
			}
			return this._cache[aURI];
		},
		_cache : {}
	};

	const Service = Cc['@mozilla.org/intl/stringbundle;1']
						.getService(Ci.nsIStringBundleService);

	function StringBundle(aURI) 
	{
		this._bundle = Service.createBundle(aURI);
	}
	StringBundle.prototype = {
		getString : function(aKey) {
			try {
				return this._bundle.GetStringFromName(aKey);
			}
			catch(e) {
			}
			return '';
		},
		getFormattedString : function(aKey, aArray) {
			try {
				return this._bundle.formatStringFromName(aKey, aArray, aArray.length);
			}
			catch(e) {
			}
			return '';
		},
		get strings() {
			return this._bundle.getSimpleEnumeration();
		}
	};
})();

if (window != this) { // work as a JS Code Module
	this.stringBundle = window['piro.sakura.ne.jp'].stringBundle;
}
