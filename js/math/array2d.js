/*
 * 2 dimensional array 
 * @copyright (C) HeiGames
 */
bento.define('bento/math/array2d', function () {
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
            isArray2d: function () {
                return true;
            },
            iterate: function (callback) {
                var i, j;
                for (j = 0; j < height; ++j) {
                    for (i = 0; i < width; ++i) {
                        callback(i, j, array[i][j]);
                    }
                }
            },
            get: function (x, y) {
                return array[x][y];
            },
            set: function (x, y, value) {
                array[x][y] = value;
            },
            width: function () {
                return width;
            },
            height: function () {
                return height;
            }
        };
    };
});