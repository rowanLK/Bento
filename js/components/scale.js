/**
 * Component that scales the entity
 * <br>Exports: Function
 * @module bento/components/scale
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
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
        data.renderer.scale(data.entity.scale.x, data.entity.scale.y);
    };
    Scale.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    Scale.prototype.toString = function () {
        return '[object Scale]';
    };

    return Scale;
});