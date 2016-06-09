/**
 * 3x 3 Matrix specifically used for transformations
 * [ a c tx ]
 * [ b d ty ]
 * [ 0 0 1  ]
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

    Matrix.prototype.translate = function (x, y) {
        this.tx += x;
        this.ty += y;

        return this;
    };

    Matrix.prototype.scale = function (x, y) {
        this.a *= x;
        this.b *= y;
        this.c *= x;
        this.d *= y;
        this.tx *= x;
        this.ty *= y;

        return this;
    };

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
    Matrix.prototype.multiply = function (matrix) {
        return this.clone().multiplyWith(matrix);
    };

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

    Matrix.prototype.reset = function () {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;        
    };

    return Matrix;
});