const PACKAGE_NAME = 'system-monitor';
const MODULES_ROOT = 'resource://system-monitor-modules/';

const PERMISSION_NAME = 'system-monitor';
const PERMISSION_CONFIRM_ID = 'system-monitor-add-monitor';
const PERMISSION_CONFIRM_ICON = 'chrome://'+PACKAGE_NAME+'/content/icon.png';
const STRING_BUNDLE_URL = 'chrome://'+PACKAGE_NAME+'/locale/system-monitor.properties';

const PERMISSION_DENIED_TOPIC = 'system-monitor:permission-denied';
const PERMISSION_UNKNOWN_TOPIC = 'system-monitor:unknown-permission';

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

const ObserverService = Cc['@mozilla.org/observer-service;1']
			.getService(Ci.nsIObserverService);

function getOwnerTab(aWindow) {
	if (!aWindow || !(aWindow instanceof Ci.nsIDOMWindow))
		return null;

	var browser = aWindow
					.top
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIWebNavigation)
					.QueryInterface(Ci.nsIDocShell)
					.chromeEventHandler;
	if (!browser)
		return null;

	var window = browser.ownerDocument.defaultView;
	var gBrowser = (window.wrappedJSObject || window).gBrowser;
	if (!gBrowser)
		return null;

	var tabs = tabs = gBrowser.mTabContainer.childNodes;
	for (let i = 0, maxi = tabs.length; i < maxi; i++) {
		if (tabs[i].linkedBrowser == browser)
			return tabs[i];
	}

	return null;
}

function clSystemPermission() {
}
clSystemPermission.prototype = {
	classDescription : 'clSystemPermission', 
	contractID : '@clear-code.com/system/permission;1',
	classID : Components.ID('{2a112100-6403-11e0-ae3e-0800200c9a66}'),
	_xpcom_categories : [
		{ category : 'app-startup', service : true }
	],
	QueryInterface : XPCOMUtils.generateQI([
		Ci.nsIObserver,
		Ci.nsIPropertyBag2
	]),

	get wrappedJSObject() { return this; },

	temporaryAllowedSites : {},

	get bundle() {
		if (!this._bundle) {
			let ns = {};
			Components.utils.import(MODULES_ROOT+'lib/stringBundle.js', ns);
			this._bundle = ns.stringBundle.get(STRING_BUNDLE_URL);
		}
		return this._bundle;
	},
	_bundle : null,

	get confirmWithTab() {
		if (!this._confirmWithTab) {
			let ns = {};
			Components.utils.import(MODULES_ROOT+'lib/confirmWithTab.js', ns);
			this._confirmWithTab = ns.confirmWithTab;
		}
		return this._confirmWithTab;
	},
	_confirmWithTab : null,

	// nsIObserver
	observe : function(aSubject, aTopic, aData) {
		switch (aTopic)
		{
			case 'app-startup':
				ObserverService.addObserver(this, 'profile-after-change', false);
				return;

			case 'profile-after-change':
				ObserverService.removeObserver(this, 'profile-after-change');
				ObserverService.addObserver(this, PERMISSION_DENIED_TOPIC, false);
				ObserverService.addObserver(this, PERMISSION_UNKNOWN_TOPIC, false);
				return;

			case PERMISSION_DENIED_TOPIC:
				return;

			case PERMISSION_UNKNOWN_TOPIC:
				this.onUnknownPermission(aSubject);
				return;
		}
	},

	// nsIPropertyBag2
	get : function(aHost) {
		if (this.temporaryAllowedSites.hasOwnProperty(aHost))
			return this.temporaryAllowedSites[aHost];
		throw Components.results.NS_ERROR_FAILURE;
	},

	onUnknownPermission : function(aOwner) {
		var tab = getOwnerTab(aOwner);
		if (!tab)
			return;

		var uri = Cc['@mozilla.org/network/io-service;1']
					.getService(Ci.nsIIOService)
					.newURI(aOwner.location.href, null, null);
		var checkbox = {
				label   : this.bundle.getString('permission_confirm_forever'),
				checked : false
			};
		var self = this;
		this.confirmWithTab({
				tab     : tab,
				label   : this.bundle.getFormattedString('permission_confirm_text', [uri.host]),
				value   : PERMISSION_CONFIRM_ID,
				image   : PERMISSION_CONFIRM_ICON,
				buttons : [
					this.bundle.getString('permission_confirm_allow'),
					this.bundle.getString('permission_confirm_deny')
				],
				checkbox : checkbox,
				cancelEvents : ['SSTabRestoring']
			})
			.next(function(aButtonIndex) {
				var permission;
				var allowed;
				switch (aButtonIndex) {
					case 0:
						permission = Ci.nsIPermissionManager.ALLOW_ACTION;
						allowed = true;
						break;
					case 1:
						permission = Ci.nsIPermissionManager.DENY_ACTION;
						allowed = false;
						break;
					default:
						return;
				}

				if (checkbox.checked)
					Cc['@mozilla.org/permissionmanager;1']
						.getService(Ci.nsIPermissionManager)
						.add(uri, PERMISSION_NAME, permission);
				else
					self.temporaryAllowedSites[uri.host] = allowed;

				if (allowed)
					tab.linkedBrowser.reload();
			});
	}
};

if (XPCOMUtils.generateNSGetModule)
	var NSGetModule = XPCOMUtils.generateNSGetModule([clSystemPermission]);
