/**
 * 2 dimensional vector
 * (Note: to perform matrix multiplications, one must use toMatrix)
 * <br>Exports: Function
 * @module bento/math/vector2
 * @param {Number} x - x position
 * @param {Number} y - y position
 * @returns {Vector2} Returns a 2d vector.
 */
bento.define('bento/math/vector2', ['bento/math/matrix'], function (Matrix) {
    'use strict';
    var Vector2 = function (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    };

    Vector2.prototype.isVector2 = function () {
        return true;
    };
    Vector2.prototype.add = function (vector) {
        var v = this.clone();
        v.addTo(vector);
        return v;
    };
    Vector2.prototype.addTo = function (vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    };
    Vector2.prototype.substract = function (vector) {
        var v = this.clone();
        v.substractFrom(vector);
        return v;
    };
    Vector2.prototype.substractFrom = function (vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    };
    Vector2.prototype.angle = function () {
        return Math.atan2(this.y, this.x);
    };
    Vector2.prototype.angleBetween = function (vector) {
        return Math.atan2(
            vector.y - this.y,
            vector.x - this.x
        );
    };
    Vector2.prototype.dotProduct = function (vector) {
        return this.x * vector.x + this.y * vector.y;
    };
    Vector2.prototype.multiply = function (vector) {
        var v = this.clone();
        v.multiplyWith(vector);
        return v;
    };
    Vector2.prototype.multiplyWith = function (vector) {
        this.x *= vector.x;
        this.y *= vector.y;
        return this;
    };
    Vector2.prototype.divide = function (vector) {
        var v = this.clone();
        v.divideBy(vector);
        return v;
    };
    Vector2.prototype.divideBy = function (vector) {
        this.x /= vector.x;
        this.y /= vector.y;
        return this;
    };
    Vector2.prototype.scalarMultiply = function (value) {
        var v = this.clone();
        v.scalarMultiplyWith(value);
        return v;
    };
    Vector2.prototype.scalarMultiplyWith = function (value) {
        this.x *= value;
        this.y *= value;
        return this;
    };
    Vector2.prototype.scale = function (value) {
        this.x *= value;
        this.y *= value;
        return this;
    };
    Vector2.prototype.magnitude = function () {
        return Math.sqrt(this.dotProduct(this));
    };
    Vector2.prototype.normalize = function () {
        var magnitude = this.magnitude();
        this.x /= magnitude;
        this.y /= magnitude;
        return this;
    };
    Vector2.prototype.distance = function (vector) {
        return vector.substract(this).magnitude();
    };
    Vector2.prototype.rotateRadian = function (angle) {
        var x = this.x * Math.cos(angle) - this.y * Math.sin(angle),
            y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
        this.x = x;
        this.y = y;
        return this;
    };
    Vector2.prototype.rotateDegree = function (angle) {
        return this.rotateRadian(angle * Math.PI / 180);
    };
    Vector2.prototype.clone = function () {
        return new Vector2(this.x, this.y);
    };
    Vector2.prototype.toMatrix = function () {
        var matrix = new Matrix(1, 3);
        matrix.set(0, 0, this.x);
        matrix.set(0, 1, this.y);
        matrix.set(0, 2, 1);
        return matrix;
    };
    /**
     * Reflects the vector using the parameter as the 'mirror'
     * @function
     * @param {Vector2} mirror - Vector2 through which the current vector is reflected.
     * @instance
     * @name reflect
     */
    Vector2.prototype.reflect = function (mirror) {
        var normal = mirror.normalize(); // reflect through this normal
        var dot = this.dotProduct(normal);
        return this.substractFrom(normal.scalarMultiplyWith(dot + dot));
    };
    Vector2.prototype.toString = function () {
        return '[object Vector2]';
    };

    return Vector2;
});