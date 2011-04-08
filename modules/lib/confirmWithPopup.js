/**
 * @fileOverview Popup Notification (Door Hanger) Based Confirmation Library for Firefox 4.0 or later
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 * Basic usage:
 *
 * @example
 *   Components.utils.import('resource://my-modules/confirmWithPopup.js');
 *
 *   confirmWithPopup({
 *     browser : gBrowser.selectedBrowser,            // the related browser
 *     label   : 'Ara you ready?',                    // the message
 *     value   : 'treestyletab-undo-close-tree',      // the internal key (optional)
 *     image   : 'chrome://....png',                  // the icon (optional)
 *     imageWidth : 32,                               // the width of the icon (optional)
 *     imageHeight : 32,                              // the height of the icon (optional)
 *     buttons : ['Yes', 'Yes forever', 'No forever], // button labels
 *     options : {
 *       // persistence, timeout, persistWhileVisible, dismissed,
 *       // eventCallback, neverShow
 *     }
 *   })
 *   .next(function(aButtonIndex) {
 *     // the next callback receives the index of the clicked button.
 *     switch (aButtonIndex) {
 *       case 0: // Yes
 *         ...
 *         break;
 *       case 1: // Yes forever
 *         ...
 *         break;
 *       case 2: // No forever
 *         ...
 *         break;
 *     }
 *     ...
 *   })
 *   .error(function(aError) {
 *     ...
 *   });
 *
 * @license
 *   The MIT License, Copyright (c) 2011 SHIMODA "Piro" Hiroshi
 *   http://github.com/piroor/fxaddonlibs/blob/master/license.txt
 * @url http://github.com/piroor/fxaddonlibs/blob/master/confirmWithPopup.js
 * @url http://github.com/piroor/fxaddonlibs
 */

if (typeof window == 'undefined')
	this.EXPORTED_SYMBOLS = ['confirmWithPopup'];

// var namespace;
if (typeof namespace == 'undefined') {
	// If namespace.jsm is available, export symbols to the shared namespace.
	// See: http://github.com/piroor/fxaddonlibs/blob/master/namespace.jsm
	try {
		let ns = {};
		Components.utils.import('resource://system-monitor-modules/lib/namespace.jsm', ns);
		namespace = ns.getNamespaceFor('piro.sakura.ne.jp');
	}
	catch(e) {
		namespace = (typeof window != 'undefined' ? window : null ) || {};
	}
}

// This depends on JSDeferred.
// See: https://github.com/cho45/jsdeferred
if (typeof namespace.Deferred == 'undefined')
	Components.utils.import('resource://system-monitor-modules/lib/jsdeferred.js', namespace);

var available = false;
try {
	Components.utils.import('resource://gre/modules/PopupNotifications.jsm');
	available = true;
}
catch(e) {
}

var confirmWithPopup;
(function() {
	const currentRevision = 1;

	var loadedRevision = 'confirmWithPopup' in namespace ?
			namespace.confirmWithPopup.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		confirmWithPopup = namespace.confirmWithPopup;
		return;
	}

	if (!available)
		return confirmWithPopup = unavailable;

	confirmWithPopup = function confirmWithPopup(aOptions) 
	{
		var deferred = new namespace.Deferred();
		if (!aOptions.buttons) {
			return deferred
					.next(function() {
						throw new Error('confirmWithPopup requires one or more buttons!');
					});
		}

		var browser = aOptions.browser ?
						aOptions.browser :
					aOptions.tab ?
						aOptions.tab.linkedBrowser :
						null ;
		if (!browser)
			return deferred
					.next(function() {
						throw new Error('confirmWithPopup requires a <xul:browser/>!');
					});

		var doc = browser.ownerDocument;
		var style;
		namespace.Deferred.next(function() {
			var accessKeys = [];
			var numericAccessKey = 0;
			var buttons = aOptions.buttons.map(function(aLabel, aIndex) {
					var accessKey;
					var match = aLabel.match(/\s*\(&([0-9a-z])\)/i);
					if (match) {
						accessKey = match[1];
						aLabel = aLabel.replace(match[0], '');
					}
					else {
						let lastUniqueKey;
						let sanitizedLabel = [];
						for (let i = 0, maxi = aLabel.length; i < maxi; i++)
						{
							let possibleAccessKey = aLabel.charAt(i);
							if (possibleAccessKey == '&' && i < maxi-1) {
								possibleAccessKey = aLabel.charAt(i+1);
								if (possibleAccessKey != '&') {
									accessKey = possibleAccessKey;
								}
								i++;
							}
							else if (!lastUniqueKey &&
									accessKeys.indexOf(possibleAccessKey) < 0) {
								lastUniqueKey = possibleAccessKey;
							}
							sanitizedLabel.push(possibleAccessKey);
						}
						if (!accessKey)
							accessKey = lastUniqueKey;
						if (!accessKey || !/[0-9a-z]/i.test(accessKey))
							accessKey = ++numericAccessKey;

						aLabel = sanitizedLabel.join('');
					}

					accessKeys.push(accessKey);

					return {
						label     : aLabel,
						accessKey : accessKey,
						callback  : function() {
							deferred.call(aIndex);
						}
					};
				});

			var secondaryActions = buttons.length > 1 ? buttons.slice(1) : null ;

			var options = {
					__proto__     : aOptions.options,
					eventCallback : function(aEventType) {
						if (aEventType == 'dismissed')
							deferred.fail(aEventType);
						if (aOptions.options && 
							aOptions.options.eventCallback)
							aOptions.options.eventCallback(aEventType);
					}
				};

			var id = aOptions.value || 'confirmWithPopup-'+encodeURIComponent(aOptions.label);

			if (aOptions.image) {
				style = doc.createProcessingInstruction('xml-stylesheet',
						'type="text/css" href="data:text/css,'+encodeURIComponent(
							'.popup-notification-icon[popupid="'+id+'"] {'+
							'	list-style-image: url("'+aOptions.image+'");'+
							(aOptions.imageWidth ? 'width: '+aOptions.imageWidth+'px;' : '' )+
							(aOptions.imageHeight ? 'height: '+aOptions.imageHeight+'px;' : '' )+
							'}'
						)+'"'
				);
				doc.insertBefore(style, doc.documentElement);
			}

			try {
				doc.defaultView.PopupNotifications.show(
					browser,
					id,
					aOptions.label,
					null,
					buttons[0],
					secondaryActions,
					options
				);
			}
			catch(e) {
				deferred.fail(e);
			}
		});

		return deferred
				.next(function(aButtonIndex) {
//					if (doc && style) doc.removeChild(style);
					return aButtonIndex;
				})
				.error(function(aError) {
//					if (doc && style) doc.removeChild(style);
					throw aError;
				})
				.next(function(aButtonIndex) {
					return aButtonIndex;
				});
	};

	namespace.confirmWithPopup = confirmWithPopup;
})();
