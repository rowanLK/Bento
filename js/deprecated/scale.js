/**
 * Component that sets the context scale for drawing.
 * <br>Exports: Constructor
 * @module bento/components/scale
 * @param {Object} settings - Settings (unused)
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/scale', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    var Scale = function (settings) {
        this.entity = null;
        this.name = 'scale';
    };
    Scale.prototype.draw = function (data) {
        // data.renderer.scale(data.entity.scale.x, data.entity.scale.y);
    };
    Scale.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    /**
     * Scales the parent entity in x direction
     * @function
     * @param {Number} value - Scale value (1 is normal, -1 is mirrored etc.)
     * @instance
     * @name setScaleX
     */
    Scale.prototype.setScaleX = function (value) {
        this.entity.scale.x = value;
    };
    /**
     * Scales the parent entity in y direction
     * @function
     * @param {Number} value - Scale value (1 is normal, -1 is mirrored etc.)
     * @instance
     * @name setScaleY
     */
    Scale.prototype.setScaleY = function (value) {
        this.entity.scale.y = value;
    };
    Scale.prototype.toString = function () {
        return '[object Scale]';
    };

    return Scale;
});