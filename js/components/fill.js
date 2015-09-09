/**
 * Component that fills the screen
 * <br>Exports: Function
 * @module bento/components/fill
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/fill', [
    'bento/utils',
    'bento'
], function (Utils, Bento) {
    'use strict';
    var viewport = Bento.getViewport(),
        component = function (settings) {
            settings = settings || {};
            this.name = 'fill';
            this.color = settings.color || [0, 0, 0, 1];
            this.dimension = settings.dimension || viewport;
        };
    component.prototype.draw = function (data) {
        var dimension = this.dimension;
        data.renderer.fillRect(this.color, dimension.x, dimension.y, dimension.width, dimension.height);
    };
    component.prototype.setup = function (settings) {
        this.color = settings.color;
    };
    return component;
});