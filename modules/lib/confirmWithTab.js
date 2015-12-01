/**
 * @fileOverview Tab Related Confirmation Library for Firefox 31 or later
 * @author       YUKI "Piro" Hiroshi
 * @version      10
 * Basic usage:
 *
 * @example
 *   Components.utils.import('resource://my-modules/confirmWithTab.js');
 *
 *   var checkbox = {
 *         label   : 'Never ask me',
 *         checked : false
 *       };
 *   
 *   confirmWithTab({
 *     tab      : gBrowser.selectedTab,           // the related tab
 *     label    : 'Ara you ready?',               // the message
 *     value    : 'treestyletab-undo-close-tree', // the internal key (optional)
 *     buttons  : ['Yes', 'No'],                  // button labels
 *     checkbox : checkbox,                       // checkbox definition (optional)
 *     cancelEvents : ['SSTabRestoring']          // events to reject this promise (optional)
 *   })
 *   .then(function(aButtonIndex) {
 *     // the next callback receives the index of the clicked button.
 *     switch (aButtonIndex) {
 *       case 0: // Yes
 *         ...
 *         break;
 *       case 1: // No
 *         ...
 *         break;
 *     }
 *     // after the notification bar is closed, "checked" indicates
 *     // the state of the checkbox when the user clicks a button.
 *     var checked = checkbox.checked;
 *     ...
 *   })
 *   .catch(function(aError) {
 *     // if the tab is closed, or any event in the cancelEvents array
 *     // is fired, then an exception is raised.
 *     ...
 *   });
 *
 * @license
 *   The MIT License, Copyright (c) 2010-2015 YUKI "Piro" Hiroshi
 * @url http://github.com/piroor/fxaddonlib-confirm-tab
 */

if (typeof window == 'undefined')
	this.EXPORTED_SYMBOLS = ['confirmWithTab'];

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

Components.utils.import('resource://gre/modules/Timer.jsm');
Components.utils.import('resource://gre/modules/Promise.jsm');

var confirmWithTab;
(function() {
	const currentRevision = 10;

	var loadedRevision = 'confirmWithTab' in namespace ?
			namespace.confirmWithTab.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		confirmWithTab = namespace.confirmWithTab;
		return;
	}

	const Cc = Components.classes;
	const Ci = Components.interfaces;

	function normalizeOptions(aOptions) {
		// we should accept single button type popup
		if (!aOptions.buttons && aOptions.button)
			aOptions.buttons = [aOptions.button];
		return aOptions;
	}

	confirmWithTab = function confirmWithTab(aOptions) 
	{
		var options = normalizeOptions(aOptions);

		if (!options.buttons) {
			return Promise.reject(new Error('confirmWithTab requires any button!'));
		}

		return new Promise((function(aResolve, aReject) {

		var done = false;
		var checkbox;
		var postProcess = function () {
			done = true;
			if (options.checkbox)
				options.checkbox.checked = checkbox.checked;
		};
		var showBar = function() {
			options.cancelEvents = (options.cancelEvents || [])
										.concat(['TabClose'])
										.sort()
										.join('\n')
										.replace(/^(.+)$\n(\1\n)+/gm, '$1\n')
										.split('\n');

			var tab = options.tab;
			var b = getTabBrowserFromChild(tab);
			var box = b.getNotificationBox(tab.linkedBrowser);
			var accessKeys = [];
			var numericAccessKey = 0;
			var notification = box.appendNotification(
					options.label,
					options.value || 'confirmWithTab-'+encodeURIComponent(options.label),
					options.image || null,
					(options.priority ?
						(typeof options.priority == 'number' ? options.priority : box[options.priority] ) :
						box.PRIORITY_INFO_MEDIUM
					),
					options.buttons.map(function(aLabel, aIndex) {
						// see resource://gre/modules/CommonDialog.jsm
						var accessKey;
						var match;
						if (match = aLabel.match(/^\s*(.*?)\s*\(\&([^&])\)(:)?$/)) {
							aLabel = (match[1] + (match[3] || '')).replace(/\&\&/g, '&');
							accessKey = match[2];
						}
						else if (match = aLabel.match(/^\s*(.*[^&])?\&(([^&]).*$)/)) {
							aLabel = ((match[1] || '') + match[2]).replace(/\&\&/g, '&');
							accessKey = match[3];
						}
						else {
							let lastUniqueKey;
							let sanitizedLabel = [];
							for (let i = 0, maxi = aLabel.length; i < maxi; i++)
							{
								let possibleAccessKey = aLabel.charAt(i);
								if (!lastUniqueKey &&
									accessKeys.indexOf(possibleAccessKey) < 0) {
									lastUniqueKey = possibleAccessKey;
								}
								sanitizedLabel.push(possibleAccessKey);
							}
							if (!accessKey)
								accessKey = lastUniqueKey;
							if (!accessKey || !/[0-9a-z]/i.test(accessKey))
								accessKey = ++numericAccessKey;

							aLabel = sanitizedLabel.join('').replace(/\&\&/g, '&');
						}

						accessKeys.push(accessKey);

						return {
							label     : aLabel,
							accessKey : accessKey,
							callback  : function() {
								done = true;
								try {
									aResolve(aIndex);
								}
								finally {
									postProcess();
								}
							}
						};
					})
				);

			if (options.checkbox) {
				checkbox = notification.ownerDocument.createElement('checkbox');
				checkbox.setAttribute('label', options.checkbox.label);
				if (options.checkbox.checked)
					checkbox.setAttribute('checked', 'true');

				let container = notification.ownerDocument.createElement('hbox');
				container.setAttribute('align', 'center');
				container.appendChild(checkbox);

				notification.appendChild(container);
			}

			if (options.persistence)
				notification.persistence = options.persistence;

			var strip = b.tabContainer || b.mTabContainer;
			var handleEvent = function handleEvent(aEvent) {
					if (aEvent.type == 'DOMNodeRemoved' && aEvent.target != notification)
						return;
					if (options.cancelEvents)
						options.cancelEvents.forEach(function(aEventType) {
							strip.removeEventListener(aEventType, handleEvent, false);
						});
					if (notification.parentNode)
						notification.parentNode.removeEventListener('DOMNodeRemoved', handleEvent, false);
					try {
						if (aEvent.type != 'DOMNodeRemoved')
							notification.close();
						if (!done)
							aReject(aEvent);
					}
					finally {
						postProcess();
					}
				};
			if (options.cancelEvents)
				options.cancelEvents.forEach(function(aEventType) {
					strip.addEventListener(aEventType, handleEvent, false);
				});
			notification.parentNode.addEventListener('DOMNodeRemoved', handleEvent, false);
		};

		setTimeout(showBar, 0);

		}).bind(this));
	};

	function getTabBrowserFromChild(aTabBrowserChild)
	{
		var b = aTabBrowserChild.ownerDocument.evaluate(
				'ancestor::*[local-name()="tabbrowser"] | '+
				'ancestor::*[local-name()="tabs"][@tabbrowser] |'+
				'ancestor::*[local-name()="toolbar"]/descendant::*[local-name()="tabs"]',
				aTabBrowserChild,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
		return (b && b.tabbrowser) || b;
	}

	namespace.confirmWithTab = confirmWithTab;
})();
