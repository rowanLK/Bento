/**
 * A 2-dimensional array
 * <br>Exports: Constructor
 * @module bento/math/array2d
 * @moduleName Array2D
 * @param {Number} width - horizontal size of array
 * @param {Number} height - vertical size of array
 * @returns {Array} Returns 2d array.
 */
bento.define('bento/math/array2d', [], function () {
    'use strict';
    return function (width, height) {
        var array = [],
            i,
            j;

        // init array
        for (i = 0; i < width; ++i) {
            array[i] = [];
            for (j = 0; j < height; ++j) {
                array[i][j] = null;
            }
        }

        return {
            /**
             * Returns true
             * @function
             * @returns {Boolean} Is always true
             * @instance
             * @name isArray2d
             */
            isArray2d: function () {
                return true;
            },
            /**
             * Callback at every iteration.
             *
             * @callback IterationCallBack
             * @param {Number} x - The current x index
             * @param {Number} y - The current y index
             * @param {Number} value - The value at the x,y index
             */
            /**
             * Iterate through 2d array
             * @function
             * @param {IterationCallback} callback - Callback function to be called every iteration
             * @instance
             * @name iterate
             */
            iterate: function (callback) {
                var i, j;
                for (j = 0; j < height; ++j) {
                    for (i = 0; i < width; ++i) {
                        callback(i, j, array[i][j]);
                    }
                }
            },
            /**
             * Get the value inside array
             * @function
             * @param {Number} x - x index
             * @param {Number} y - y index
             * @returns {Object} The value at the index
             * @instance
             * @name get
             */
            get: function (x, y) {
                return array[x][y];
            },
            /**
             * Set the value inside array
             * @function
             * @param {Number} x - x index
             * @param {Number} y - y index
             * @param {Number} value - new value
             * @instance
             * @name set
             */
            set: function (x, y, value) {
                array[x][y] = value;
            }
        };
    };
});