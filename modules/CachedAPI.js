const EXPORTED_SYMBOLS = ['CachedAPI'];

function CachedAPI(aInterval) {
	this.defaultInterval = aInterval || 1000;
}

CachedAPI.prototype = {
	register: function (aName, aObject, aCachingMethods, aInterval) {
		// intentionally use methods as it is (do not copy)
		var wrapped = {
				__noSuchMethod__ : function(aId, aArgs) aObject[aId].apply(aObject, aArgs)
			};
		this[aName] = wrapped;

		// curtail function call for specified methods
		if (aCachingMethods) {
			for (let [i, methodName] in Iterator(aCachingMethods)) {
				wrapped[methodName] = CachedAPI.curtailFunctionCall(
					aObject,
					methodName,
					aInterval || this.defaultInterval
				);
			}
		}
	}
};

CachedAPI.curtailFunctionCall = function (aObject, aMethodName, aInterval) {
	var args = arguments;
	var lastCallTime = null;
	var lastReturnValue = null;

	return function curtailedFunction() {
		var nowTime = Date.now();
		if (!lastCallTime || nowTime >= (lastCallTime + aInterval)) {
			lastCallTime = nowTime;
			lastReturnValue = aObject[aMethodName].apply(aObject, args);
		}

		return lastReturnValue;
	};
};
