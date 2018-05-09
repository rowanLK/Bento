/**
 * 2 dimensional vector
 * (Note: to perform matrix multiplications, one must use toMatrix)
 * <br>Exports: Constructor
 * @module bento/math/vector2
 * @moduleName Vector2
 * @param {Number} x - x position
 * @param {Number} y - y position
 * @returns {Vector2} Returns a 2d vector.
 * @snippet Vector2|constructor
Vector2(${1:0}, ${2:0})
 * @snippet #Vector2.x|Number
    x
 * @snippet #Vector2.y|Number
    y
 *
 */
bento.define('bento/math/vector2', [], function () {
    'use strict';
    return Vector2;
});