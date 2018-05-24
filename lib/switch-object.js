/**
 * Manager that controls mainloop and all objects. Attach entities to the object manager
 * to add them to the game. The object manager loops through every object's update and
 * draw functions. The settings object passed here is passed through Bento.setup().
 * <br>Exports: Constructor, can be accessed through objectManager namespace.
 * @module bento/managers/object
 * @moduleName ObjectManager
 * @param {Function} getGameData - Function that returns gameData object
 * @param {Object} settings - Settings object
 * @param {Object} settings.defaultSort - Use javascript default sorting with Array.sort (not recommended)
 * @param {Object} settings.useDeltaT - Use delta time (note: untested)
 * @returns ObjectManager
 */
// define cpp components and classes
bento.define('bento/managers/object', [], function () {
    'use strict';
    return function () {
    	var objectManager = new EJObjectManager();
	    objectManager.objectPool = [];
	    objectManager.quickAccess = {};
	    objectManager.attach = function (object) {
	        objectManager.jsAttach(object);

	        var i, l, family;

	        if (!object) {
	            Utils.log("ERROR: trying to attach " + object);
	            return;
	        }

	        if (object.isAdded || object.parent) {
	            Utils.log("ERROR: Entity " + object.name + " was already added.");
	            return;
	        }

	        objectManager.objectPool.push(object);

	        // add object to access pools
	        if (object.family) {
	            family = object.family;
	            for (i = 0, l = family.length; i < l; ++i) {
	                //addObjectToFamily(object, family[i]);
	                if (!objectManager.quickAccess[family[i]]) {
	                    objectManager.quickAccess[family[i]] = [];
	                }
	                if (objectManager.quickAccess[family[i]].indexOf(object) === -1) {
	                    objectManager.quickAccess[family[i]].push(object);
	                }
	            }
	        }
	    };
	    objectManager.add = objectManager.attach;
	    objectManager.remove = function (object) {
	        var i, l,
	            index,
	            family;
	        if (!object) {
	            return;
	        }
	        // remove from access pools
	        if(object.isAdded) {
	            if (object.family) {
	                family = object.family;
	                for (i = 0, l = family.length; i < l; ++i) {
	                    var pool = quickAccess[family[i]];
	                    if (pool) {
	                        Utils.removeFromArray(pool, object);
	                    }
	                }
	            }
	        }
	        objectManager.jsRemove(object);
	        index = objectManager.objectPool.indexOf(object);
	        if (index >= 0) {
	            objectManager.objectPool[index] = null;
	        }
	    };
	    objectManager.removeAll = function (removeGlobal) {
	        var i, l,
	            object;
	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	            if (!object) {
	                continue;
	            }
	            if (!object.global || removeGlobal) {

	                if(object.isAdded) {
	                    if (object.family) {
	                        family = object.family;
	                        for (i = 0, l = family.length; i < l; ++i) {
	                            var pool = quickAccess[family[i]];
	                            if (pool) {
	                                Utils.removeFromArray(pool, object);
	                            }
	                        }
	                    }
	                }
	                objectManager.objectPool[i] = null;
	            }
	        }

	        // loop objects array from end to start and remove null elements
	        for (i = objectManager.objectPool.length - 1; i >= 0; --i) {
	            if (objectManager.objectPool[i] === null) {
	                objectManager.objectPool.splice(i, 1);
	            }
	        }

	        // re-add all global objects
	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	        }

	        objectManager.jsRemoveAll();
	    };
	    objectManager.getByName = function (objectName, callback) {
	        // have to keep objects array
	        var i, l,
	            object,
	            array = [];

	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	            if (!object) {
	                continue;
	            }
	            if (!object.name) {
	                continue;
	            }
	            if (object.name === objectName) {
	                array.push(object);
	            }
	        }
	        if (callback && array.length) {
	            callback(array);
	        }
	        return array;
	    };
	    objectManager.getByFamily = function (type, callback) {
	        var array = objectManager.quickAccess[type];
	        if (!array) {
	            // initialize it
	            array = [];
	            objectManager.quickAccess[type] = array;
	            // Utils.log('Warning: family called ' + type + ' does not exist', true);
	        }
	        if (callback && array.length) {
	            callback(array);
	        }
	        return array;
	    };
	    return objectManager;
	};
});