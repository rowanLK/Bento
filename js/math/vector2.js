/*
 * 2 dimensional vector
 * @copyright (C) HeiGames
 */
bento.define('bento/math/vector2', [], function () {
    'use strict';
    var isVector2 = function () {
            return true;
        },
        add = function (vector) {
            var v = this.clone();
            v.addTo(vector);
            return v;
        },
        addTo = function (vector) {
            this.x += vector.x;
            this.y += vector.y;
            return this;
        },
        substract = function (vector) {
            var v = this.clone();
            v.substractFrom(vector);
            return v;
        },
        substractFrom = function (vector) {
            this.x -= vector.x;
            this.y -= vector.y;
            return this;
        },
        angle = function () {
            return Math.atan2(this.y, this.x);
        },
        angleBetween = function (vector) {
            return Math.atan2(
                vector.y - this.y,
                vector.x - this.x
            );
        },
        dotProduct = function (vector) {
            return this.x * vector.x + this.y * vector.y;
        },
        multiply = function (vector) {
            var v = this.clone();
            v.multiplyWith(vector);
            return v;
        },
        multiplyWith = function (vector) {
            this.x *= vector.x;
            this.y *= vector.y;
            return this;
        },
        divide = function (vector) {
            var v = this.clone();
            v.divideBy(vector);
            return v;
        },
        divideBy = function (vector) {
            this.x /= vector.x;
            this.y /= vector.y;
            return this;
        },
        scale = function (value) {
            this.x *= value;
            this.y *= value;
            return this;
        },
        length = function () {
            return Math.sqrt(this.dotProduct(this));
        },
        normalize = function () {
            var length = this.length();
            this.x /= length;
            this.y /= length;
            return this;
        },
        distance = function (vector) {
            return vector.substract(this).length();
        },
        clone = function () {
            return module(this.x, this.y);
        },
        toMatrix = function () {
            var matrix = Matrix(1, 3);
            matrix.set(0, 0, this.x);
            matrix.set(0, 1, this.y);
            matrix.set(0, 2, 1);
            return matrix;
        },
        module = function (x, y) {
            return {
                x: x,
                y: y,
                isVector2: isVector2,
                add: add,
                addTo: addTo,
                substract: substract,
                substractFrom: substractFrom,
                angle: angle,
                angleBetween: angleBetween,
                dotProduct: dotProduct,
                multiply: multiply,
                multiplyWith: multiplyWith,
                divide: divide,
                divideBy: divideBy,
                scale: scale,
                length: length,
                normalize: normalize,
                distance: distance,
                clone: clone
            };
        };
    return module;
});