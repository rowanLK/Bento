/**
 * Matrix
 * <br>Exports: Constructor
 * @module bento/math/matrix
 * @param {Number} width - horizontal size of matrix
 * @param {Number} height - vertical size of matrix
 * @returns {Matrix} Returns a matrix object.
 */
bento.define('bento/math/matrix', [
    'bento/utils'
], function (Utils) {
    'use strict';
    var add = function (other) {
            var newMatrix = this.clone();
            newMatrix.addTo(other);
            return newMatrix;
        },
        multiply = function (matrix1, matrix2) {
            var newMatrix = this.clone();
            newMatrix.multiplyWith(other);
            return newMatrix;
        },
        module = function (width, height) {
            var matrix = [],
                n = width || 0,
                m = height || 0,
                i,
                j,
                set = function (x, y, value) {
                    matrix[y * n + x] = value;
                },
                get = function (x, y) {
                    return matrix[y * n + x];
                };

            // initialize as identity matrix
            for (j = 0; j < m; ++j) {
                for (i = 0; i < n; ++i) {
                    if (i === j) {
                        set(i, j, 1);
                    } else {
                        set(i, j, 0);
                    }
                }
            }

            return {
                /**
                 * Returns true
                 * @function
                 * @returns {Boolean} Is always true
                 * @instance
                 * @name isMatrix
                 */
                isMatrix: function () {
                    return true;
                },
                /**
                 * Returns a string representation of the matrix (useful for debugging purposes)
                 * @function
                 * @returns {String} String matrix
                 * @instance
                 * @name stringify
                 */
                stringify: function () {
                    var i,
                        j,
                        str = '',
                        row = '';
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            row += get(i, j) + '\t';
                        }
                        str += row + '\n';
                        row = '';
                    }
                    return str;
                },
                /**
                 * Get the value inside matrix
                 * @function
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 * @returns {Number} The value at the index
                 * @instance
                 * @name get
                 */
                get: function (x, y) {
                    return get(x, y);
                },
                /**
                 * Set the value inside matrix
                 * @function
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 * @param {Number} value - new value
                 * @instance
                 * @name set
                 */
                set: function (x, y, value) {
                    set(x, y, value);
                },
                /**
                 * Set the values inside matrix using an array.
                 * If the matrix is 2x2 in size, then supplying an array with
                 * values [1, 2, 3, 4] will result in a matrix
                 * <br>[1 2]
                 * <br>[3 4]
                 * <br>If the array has more elements than the matrix, the
                 * rest of the array is ignored.
                 * @function
                 * @param {Array} array - array with Numbers
                 * @returns {Matrix} Returns self
                 * @instance
                 * @name setValues
                 */
                setValues: function (array) {
                    var i, l = Math.min(matrix.length, array.length);
                    for (i = 0; i < l; ++i) {
                        matrix[i] = array[i];
                    }
                    return this;
                },
                /**
                 * Get the matrix width
                 * @function
                 * @returns {Number} The width of the matrix
                 * @instance
                 * @name getWidth
                 */
                getWidth: function () {
                    return n;
                },
                /**
                 * Get the matrix height
                 * @function
                 * @returns {Number} The height of the matrix
                 * @instance
                 * @name getHeight
                 */
                getHeight: function () {
                    return m;
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
                 * Iterate through matrix
                 * @function
                 * @param {IterationCallback} callback - Callback function to be called every iteration
                 * @instance
                 * @name iterate
                 */
                iterate: function (callback) {
                    var i, j;
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            if (!Utils.isFunction(callback)) {
                                throw ('Please supply a callback function');
                            }
                            callback(i, j, get(i, j));
                        }
                    }
                },
                /**
                 * Transposes the current matrix
                 * @function
                 * @returns {Matrix} Returns self
                 * @instance
                 * @name transpose
                 */
                transpose: function () {
                    var i, j, newMat = [];
                    // reverse loop so m becomes n
                    for (i = 0; i < n; ++i) {
                        for (j = 0; j < m; ++j) {
                            newMat[i * m + j] = get(i, j);
                        }
                    }
                    // set new matrix
                    matrix = newMat;
                    // swap width and height
                    m = [n, n = m][0];
                    return this;
                },
                /**
                 * Addition of another matrix
                 * @function
                 * @param {Matrix} matrix - matrix to add
                 * @returns {Matrix} Updated matrix
                 * @instance
                 * @name addTo
                 */
                addTo: function (other) {
                    var i, j;
                    if (m != other.getHeight() || n != other.getWidth()) {
                        throw 'Matrix sizes incorrect';
                    }
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            set(i, j, get(i, j) + other.get(i, j));
                        }
                    }
                    return this;
                },
                /**
                 * Addition of another matrix
                 * @function
                 * @param {Matrix} matrix - matrix to add
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name add
                 */
                add: add,
                /**
                 * Multiply with another matrix
                 * If a new matrix C is the result of A * B = C
                 * then B is the current matrix and becomes C, A is the input matrix
                 * @function
                 * @param {Matrix} matrix - input matrix to multiply with
                 * @returns {Matrix} Updated matrix
                 * @instance
                 * @name multiplyWith
                 */
                multiplyWith: function (other) {
                    var i, j,
                        newMat = [],
                        newWidth = n, // B.n
                        oldHeight = m, // B.m
                        newHeight = other.getHeight(), // A.m
                        oldWidth = other.getWidth(), // A.n
                        newValue = 0,
                        k;
                    if (oldHeight != oldWidth) {
                        throw 'Matrix sizes incorrect';
                    }

                    for (j = 0; j < newHeight; ++j) {
                        for (i = 0; i < newWidth; ++i) {
                            newValue = 0;
                            // loop through matbentos
                            for (k = 0; k < oldWidth; ++k) {
                                newValue += other.get(k, j) * get(i, k);
                            }
                            newMat[j * newWidth + i] = newValue;
                        }
                    }
                    // set to new matrix
                    matrix = newMat;
                    // update matrix size
                    n = newWidth;
                    m = newHeight;
                    return this;
                },
                /**
                 * Multiply with another matrix
                 * If a new matrix C is the result of A * B = C
                 * then B is the current matrix and becomes C, A is the input matrix
                 * @function
                 * @param {Matrix} matrix - input matrix to multiply with
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name multiply
                 */
                multiply: multiply,
                /**
                 * Returns a clone of the current matrix
                 * @function
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name clone
                 */
                clone: function () {
                    var newMatrix = module(n, m);
                    newMatrix.setValues(matrix);
                    return newMatrix;
                }
            };
        };
    return module;
});