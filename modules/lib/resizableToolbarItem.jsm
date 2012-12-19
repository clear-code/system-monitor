/**
 * @fileOverview Resizable Toolbar Item Library for Firefox 3.5 or later
 * @author       ClearCode Inc.
 * @version      1
 *
 * @license
 *   The MIT License, Copyright (c) 2011-2012 ClearCode Inc.
 *   http://www.clear-code.com/repos/svn/js-codemodules/license.txt
 * @url http://www.clear-code.com/repos/svn/js-codemodules/resizableToolbarItem.js
 */

if (typeof window == 'undefined')
	this.EXPORTED_SYMBOLS = ['resizableToolbarItem'];

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

var resizableToolbarItem;
(function() {
	const currentRevision = 1;

	var loadedRevision = 'resizableToolbarItem' in namespace ?
			namespace.resizableToolbarItem.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		resizableToolbarItem = namespace.resizableToolbarItem;
		return;
	}

	const Cc = Components.classes;
	const Ci = Components.interfaces;

	if (namespace.resizableToolbarItem && namespace.resizableToolbarItem.destroy)
		namespace.resizableToolbarItem.destroy();

	const SSS = Cc['@mozilla.org/content/style-sheet-service;1']
				.getService(Ci.nsIStyleSheetService);

	resizableToolbarItem = {
		RESIZABLE_CLASS : 'resizableToolbarItem-resizable-item',
		SPLITTER_CLASS  : 'resizableToolbarItem-splitter',

		// "nsDOM" prefix is required!
		// https://developer.mozilla.org/en/Creating_Custom_Events_That_Can_Pass_Data
		EVENT_TYPE_RESIZE_BEGIN : 'nsDOMResizableToolbarItemBeginResize',
		EVENT_TYPE_RESIZE_END   : 'nsDOMResizableToolbarItemEndResize',
		EVENT_TYPE_RESET        : 'nsDOMResizableToolbarItemReset',

		STYLE :
			'.%SPLITTER_CLASS% {\n' +
			'  appearance: none !important;\n' +
			'  -moz-appearance: none !important;\n' +
			'  background: transparent !important;\n' +
			'  border: 0 none !important;\n' +
			'  min-width: 8px !important;\n' +
			'  margin: 0 -4px 0 -3px !important;\n' +
			'  max-width: 8px !important;\n' +
			'}\n' +

			'[orient="vertical"] > .%SPLITTER_CLASS% {\n' +
			'  display: none !important;\n' +
			'}\n' +

			'.%SPLITTER_CLASS%-spacer {\n' +
			'  visibility: hidden !important;\n' +
			'}\n' +

			'.%RESIZABLE_CLASS% + .%RESIZABLE_CLASS%,\n' +
			'toolbarpaletteitem .%RESIZABLE_CLASS% {\n' +
			'  margin-left: 1px;\n' +
			'}\n',

		get sheet() {
			if (!this._sheet) {
				let style = this.STYLE
								.replace(/%RESIZABLE_CLASS%/g, this.RESIZABLE_CLASS)
								.replace(/%SPLITTER_CLASS%/g, this.SPLITTER_CLASS);
				this._sheet = Cc['@mozilla.org/network/io-service;1']
								.getService(Ci.nsIIOService)
								.newURI('data:text/css,'+encodeURIComponent(style), null, null);
			}
			return this._sheet;
		},
		_sheet : null,


		init : function RTI_init() {
			if (!SSS.sheetRegistered(this.sheet, SSS.AGENT_SHEET))
				SSS.loadAndRegisterSheet(this.sheet, SSS.AGENT_SHEET);
		},
		destroy : function RTI_init() {
			if (SSS.sheetRegistered(this.sheet, SSS.AGENT_SHEET))
				SSS.unregisterSheet(this.sheet, SSS.AGENT_SHEET);
		},


		allowResize : function RTI_initItem(aElement) {
			if (!aElement || !(aElement instanceof Ci.nsIDOMElement))
				return;

			var classNames = aElement.className.replace(/^\s+|\s+$/g, '').split(/\s+/);
			if (classNames.indexOf(this.RESIZABLE_CLASS) < 0) {
				classNames.push(this.RESIZABLE_CLASS);
				aElement.className = classNames.join(' ');
			}
		},


		insertSplitters : function RTI_insertSplitters(aWindow) {
			this.removeSplitters(aWindow);
			var nodes = aWindow.document.querySelectorAll('.'+this.RESIZABLE_CLASS);
			for (let i = 0, maxi = nodes.length; i < maxi; i++) {
				let node = nodes[i];
				if (this.isResizableItem(node.previousSibling))
					this.insertSplitterBetween(node.previousSibling, node);
				if (
					!node.nextSibling ||
					(node.nextSibling.boxObject && !node.nextSibling.boxObject.width) ||
					this.isResizableItem(node.nextSibling)
					)
					this.insertSplitterBetween(node, node.nextSibling);
			}
		},

		removeSplitters : function RTI_removeSplitters(aWindow) {
			var nodes = aWindow.document.querySelectorAll('.'+this.SPLITTER_CLASS+', .'+this.SPLITTER_CLASS+'-spacer');
			for (let i = 0, maxi = nodes.length; i < maxi; i++) {
				let node = nodes[i];
				node.removeEventListener('mousedown', this, true);
				node.removeEventListener('mouseup', this, true);
				node.removeEventListener('dblclick', this, true);
				node.parentNode.removeChild(node);
			}
		},


		isResizableItem : function RTI_isResizableItem(aElement) {
			return (
				aElement &&
				aElement.localName != 'splitter' &&
				!aElement.hasAttribute('hidden') &&
				(
					aElement.hasAttribute('flex') ||
					this.hasFlexiblePreceding(aElement) ||
					this.hasFlexibleFollowing(aElement) ||
					aElement.className.indexOf(this.RESIZABLE_CLASS) > -1
				)
			);
		},
		hasFlexiblePreceding : function RTI_hasFlexiblePreceding(aElement) {
			return (
				aElement &&
				aElement.id &&
				aElement.parentNode.querySelector(
					'toolbar > toolbarspring:not([hidden]) ~ #'+aElement.id+', '+
					'toolbar > *[flex]:not([hidden]) ~ #'+aElement.id
				)
			);
		},
		hasFlexibleFollowing : function RTI_hasFlexibleFollowing(aElement) {
			return (
				aElement &&
				aElement.id &&
				aElement.parentNode.querySelector(
					'#'+aElement.id+' ~ toolbarspring:not([hidden]), '+
					'#'+aElement.id+' ~ *[flex]:not([hidden])'
				)
			);
		},

		insertSplitterBetween : function RTI_insertSplitterBetween(aBefore, aAfter) {
			var toolbar = (aAfter || aBefore).parentNode;
			var splitter = toolbar.ownerDocument.createElement('splitter');
			splitter.setAttribute('class', this.SPLITTER_CLASS);
			if (
				!aAfter ||
				(aAfter.boxObject && !aAfter.boxObject.width)
				) {
				// don't insert if there is no following item but a "spring" item.
				if (this.hasFlexiblePreceding(aBefore)) return;
				let spacer = toolbar.ownerDocument.createElement('spacer');
				spacer.setAttribute('flex', 1);
				spacer.setAttribute('class', this.SPLITTER_CLASS+'-spacer');
				aBefore.parentNode.insertBefore(spacer, aBefore.nextSibling);
				aAfter = spacer;
			}
			if (
				(!aBefore || aBefore.className.indexOf(this.RESIZABLE_CLASS) < 0) &&
				this.hasFlexiblePreceding(aAfter)
				) {
				splitter.setAttribute('resizebefore', 'flex');
			}
			else if (
				(!aAfter || aAfter.className.indexOf(this.RESIZABLE_CLASS) < 0) &&
				this.hasFlexibleFollowing(aBefore)
				) {
				splitter.setAttribute('resizeafter', 'flex');
			}
			splitter.addEventListener('mousedown', this, true);
			splitter.addEventListener('mouseup', this, true);
			splitter.addEventListener('dblclick', this, true);
			toolbar.insertBefore(splitter, aAfter);
		},


		onSplitterMouseDown : function RTI_onSplitterMouseDown(aEvent) {
			if (this.resizing ||
				aEvent.button != 0 ||
				aEvent.altKey ||
				aEvent.ctrlKey ||
				aEvent.shiftKey ||
				aEvent.metaKey)
				return;

			var w = aEvent.target.ownerDocument.defaultView;
			var splitter = aEvent.currentTarget;

			var event = w.document.createEvent('Events');
			event.initEvent(this.EVENT_TYPE_RESIZE_BEGIN, true, false);
			splitter.dispatchEvent(event);

			/* canvasを非表示にしたのと同じタイミングでリサイズを行うと、
			   まだ内部的にcanvasの大きさが残ったままなので、その大きさ以下に
			   タブバーの幅を縮められなくなる。手動でイベントを再送してやると
			   この問題を防ぐことができる。 */
			aEvent.preventDefault();
			aEvent.stopPropagation();
			var flags = 0;
			const nsIDOMNSEvent = Ci.nsIDOMNSEvent;
			if (aEvent.altKey) flags |= nsIDOMNSEvent.ALT_MASK;
			if (aEvent.ctrlKey) flags |= nsIDOMNSEvent.CONTROL_MASK;
			if (aEvent.shiftKey) flags |= nsIDOMNSEvent.SHIFT_MASK;
			if (aEvent.metaKey) flags |= nsIDOMNSEvent.META_MASK;
			w.setTimeout(function(aX, aY, aButton, aDetail) {
				w.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIDOMWindowUtils)
					.sendMouseEvent('mousedown', aX, aY, aButton, aDetail, flags);
				flags = null;
			}, 0, aEvent.clientX, aEvent.clientY, aEvent.button, aEvent.detail);

			this.resizing = true;
		},

		onSplitterMouseUp : function RTI_onSplitterMouseUp(aEvent) {
			var w = aEvent.target.ownerDocument.defaultView;
			var splitter = aEvent.currentTarget;

			w.setTimeout(function(aSelf) {
				if (!aSelf.resizing) return;

				var event = w.document.createEvent('Events');
				event.initEvent(aSelf.EVENT_TYPE_RESIZE_END, true, false);
				splitter.dispatchEvent(event);

				aSelf.resizing = false;
			}, 10, this);
		},

		onSplitterDblClick : function RTI_onSplitterDblClick(aEvent) {
			var w = aEvent.target.ownerDocument.defaultView;
			var splitter = aEvent.currentTarget;

			this.resizing = true;

			var previous = splitter.previousSibling;
			previous = (previous &&
			            previous instanceof Ci.nsIDOMElement &&
			            previous.className.indexOf(this.RESIZABLE_CLASS) > -1) ?
							previous :
							null ;
			var next = splitter.nextSibling;
			next = (next &&
			        next instanceof Ci.nsIDOMElement &&
			        next.className.indexOf(this.RESIZABLE_CLASS) > -1) ?
						next :
						null ;
			if (next && previous) {
				if (next.nextSibling && next.nextSibling.localName == 'splitter')
					next = null;
				else
					previous = "";
			}
			var target = next || previous;

			var event = w.document.createEvent('DataContainerEvent');
			event.initEvent(this.EVENT_TYPE_RESET, true, false);
			event.setData('splitter', splitter);
			target.dispatchEvent(event);

			this.resizing = false;
		},

		handleEvent : function RTI_handleEvent(aEvent) {
			switch (aEvent.type) {
				case 'mousedown': return this.onSplitterMouseDown(aEvent);
				case 'mouseup': return this.onSplitterMouseUp(aEvent);
				case 'dblclick': return this.onSplitterDblClick(aEvent);
			}
		}
	};

	resizableToolbarItem.init();
	namespace.resizableToolbarItem = resizableToolbarItem;
})();
