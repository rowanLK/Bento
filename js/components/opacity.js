/**
 * Component that sets the opacity
 * <br>Exports: Function
 * @module bento/components/opacity
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/opacity', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    var oldOpacity = 1,
        component = function (settings) {
            settings = settings || {};
            this.name = 'opacity';
            this.set = false;
            this.opacity = settings.opacity || 1;
        };
    component.prototype.draw = function (data) {
        if (this.set) {
            oldOpacity = data.renderer.getOpacity();
            data.renderer.setOpacity(this.opacity);
        }
    };
    component.prototype.postDraw = function (data) {
        data.renderer.setOpacity(oldOpacity);
    };
    component.prototype.setOpacity = function (value) {
        this.opacity = value;
    };
    component.prototype.getOpacity = function () {
        return this.opacity;
    };
    return component;
});