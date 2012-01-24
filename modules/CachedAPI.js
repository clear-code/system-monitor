const EXPORTED_SYMBOLS = ['CachedAPI'];

function CachedAPI(aSource, aCachedMethods, aLifetime) {
	this._init(aSource, aCachedMethods, aLifetime);
}

CachedAPI.prototype = {
	__noSuchMethod__ : function(aId, aArgs) this._source[aId].apply(this._source, aArgs),
	_init : function (aSource, aCachedMethods, aLifetime) {
		this._source = aSource;
		this._lifetime = aLifetime || 1000;

		// curtail function call for specified methods
		if (aCachedMethods) {
			for (let [i, methodName] in Iterator(aCachedMethods)) {
				this[methodName] = CachedAPI.createCachedFunctionCall(
					aSource,
					methodName,
					this._lifetime
				);
			}
		}
	}
};

CachedAPI.createCachedFunctionCall = function (aObject, aMethodName, aLifetime) {
	var args = arguments;
	var lastCallTime = null;
	var lastReturnValue = null;

	return function cachedFunctionCall() {
		var nowTime = Date.now();
		if (!lastCallTime || nowTime >= (lastCallTime + aLifetime)) {
			lastCallTime = nowTime;
			lastReturnValue = aObject[aMethodName].apply(aObject, args);
		}
		return lastReturnValue;
	};
};
