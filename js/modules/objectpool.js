/**
 * General object pool
 * <br>Exports: Constructor
 * @param {Object} settings - Settings object is required
 * @param {Function} settings.constructor - function that returns the object for pooling
 * @param {Function} settings.destructor - function that resets object for reuse
 * @param {Number} settings.poolSize - amount to pre-initialize
 * @module bento/objectpool
 * @module ObjectPool
 * @returns ObjectPool
 */
bento.define('bento/objectpool', [
    'bento',
    'bento/utils'
], function (
    Bento,
    Utils
) {
    'use strict';
    return function (specs) {
        var pool = [],
            isInitialized = false,
            constructor = specs.constructor,
            destructor = specs.destructor,
            pushObject = function () {
                pool.push(constructor());
            };

        if (!constructor) {
            throw 'Error: Must pass a settings.constructor function that returns an object';
        }
        if (!destructor) {
            throw 'Error: Must pass a settings.destructor function that cleans the object';
        }

        // return interface
        return {
            /**
             * Returns a new object from the pool, the pool is populated automatically if empty
             */
            get: function () {
                // pool is empty!
                if (pool.length === 0) {
                    pushObject();
                }
                // get the last in the pool
                return pool.pop();
            },
            /**
             * Puts object back in the pool
             */
            discard: function (obj) {
                // reset the object
                destructor(obj);
                // put it back
                pool.push(obj);
            },
            init: function () {
                if (isInitialized) {
                    return;
                }
                isInitialized = true;
                Utils.repeat(specs.poolSize || 0, pushObject);

            }
        };
    };
});