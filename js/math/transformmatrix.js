/**
 * 3x 3 Matrix specifically used for transformations
 * <br>[ a c tx ]
 * <br>[ b d ty ]
 * <br>[ 0 0 1  ]
 * <br>Exports: Constructor
 * @module bento/math/transformmatrix
 * @returns {Matrix} Returns a matrix object.
 */
bento.define('bento/math/transformmatrix', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';

    function Matrix() {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
    }

    /**
     * Applies matrix on a vector
     * @function
     * @returns {Vector2} Transformed vector
     * @instance
     * @name multiplyWithVector
     */
    Matrix.prototype.multiplyWithVector = function (vector) {
        var x = vector.x;
        var y = vector.y;

        vector.x = this.a * x + this.c * y + this.tx;
        vector.y = this.b * x + this.d * y + this.ty;

        return vector;
    };

    Matrix.prototype.inverseMultiplyWithVector = function (vector) {
        var x = vector.x;
        var y = vector.y;
        var determinant = 1 / (this.a * this.d - this.c * this.b);

        vector.x = this.d * x * determinant + -this.c * y * determinant + (this.ty * this.c - this.tx * this.d) * determinant;
        vector.y = this.a * y * determinant + -this.b * x * determinant + (-this.ty * this.a + this.tx * this.b) * determinant;

        return vector;
    };

    /**
     * Apply translation transformation on the matrix
     * @function
     * @param {Number} x - Translation in x axis
     * @param {Number} y - Translation in y axis
     * @returns {Matrix} Matrix with translation transform
     * @instance
     * @name translate
     */
    Matrix.prototype.translate = function (x, y) {
        this.tx += x;
        this.ty += y;

        return this;
    };

    /**
     * Apply scale transformation on the matrix
     * @function
     * @param {Number} x - Scale in x axis
     * @param {Number} y - Scale in y axis
     * @returns {Matrix} Matrix with scale transform
     * @instance
     * @name scale
     */
    Matrix.prototype.scale = function (x, y) {
        this.a *= x;
        this.b *= y;
        this.c *= x;
        this.d *= y;
        this.tx *= x;
        this.ty *= y;

        return this;
    };

    /**
     * Apply rotation transformation on the matrix
     * @function
     * @param {Number} angle - Angle to rotate in radians
     * @param {Number} [sin] - Precomputed sin(angle) if known
     * @param {Number} [cos] - Precomputed cos(angle) if known
     * @returns {Matrix} Matrix with rotation transform
     * @instance
     * @name rotate
     */
    Matrix.prototype.rotate = function (angle, sin, cos) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;
        var tx = this.tx;
        var ty = this.ty;

        if (sin === undefined) {
            sin = Math.sin(angle);
        }
        if (cos === undefined) {
            cos = Math.cos(angle);
        }

        this.a = a * cos - b * sin;
        this.b = a * sin + b * cos;
        this.c = c * cos - d * sin;
        this.d = c * sin + d * cos;
        this.tx = tx * cos - ty * sin;
        this.ty = tx * sin + ty * cos;

        return this;
    };

    /**
     * Multiplies matrix
     * @function
     * @param {Matrix} matrix - Matrix to multiply with
     * @returns {Matrix} Self
     * @instance
     * @name multiplyWith
     */
    Matrix.prototype.multiplyWith = function (matrix) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;

        this.a = matrix.a * a + matrix.b * c;
        this.b = matrix.a * b + matrix.b * d;
        this.c = matrix.c * a + matrix.d * c;
        this.d = matrix.c * b + matrix.d * d;
        this.tx = matrix.tx * a + matrix.ty * c + this.tx;
        this.ty = matrix.tx * b + matrix.ty * d + this.ty;

        return this;
    };
    /**
     * Multiplies matrix
     * @function
     * @param {Matrix} matrix - Matrix to multiply with
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name multiply
     */
    Matrix.prototype.multiply = function (matrix) {
        return this.clone().multiplyWith(matrix);
    };

    /**
     * Clones matrix
     * @function
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name clone
     */
    Matrix.prototype.clone = function () {
        var matrix = new Matrix();
        matrix.a = this.a;
        matrix.b = this.b;
        matrix.c = this.c;
        matrix.d = this.d;
        matrix.tx = this.tx;
        matrix.ty = this.ty;

        return matrix;
    };

    /**
     * Resets matrix to identity matrix
     * @function
     * @returns {Matrix} Self
     * @instance
     * @name reset
     */
    Matrix.prototype.reset = function () {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
        return this;
    };
    Matrix.prototype.identity = Matrix.prototype.reset;

    /**
     * Prepend matrix
     * @function
     * @param {Matrix} Other matrix
     * @instance
     * @returns {Matrix} Self
     */
    Matrix.prototype.prependWith = function (matrix) {
        var selfTx = this.tx;
        var selfA = this.a;
        var selfC = this.c;

        this.a = selfA * matrix.a + this.b * matrix.c;
        this.b = selfA * matrix.b + this.b * matrix.d;
        this.c = selfC * matrix.a + this.d * matrix.c;
        this.d = selfC * matrix.b + this.d * matrix.d;

        this.tx = selfTx * matrix.a + this.ty * matrix.c + matrix.tx;
        this.ty = selfTx * matrix.b + this.ty * matrix.d + matrix.ty;

        return this;
    };

    /**
     * Prepends matrix
     * @function
     * @param {Matrix} matrix - Matrix to prepend
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name prepend
     */
    Matrix.prototype.prepend = function (matrix) {
        return this.clone().prependWith(matrix);
    };

    // aliases
    Matrix.prototype.appendWith = Matrix.prototype.multiplyWith;
    Matrix.prototype.append = Matrix.prototype.multiply;


    Matrix.prototype.toString = function () {
        return '[object Matrix]';
    };
    return Matrix;
});