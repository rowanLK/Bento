/**
 * Component that fills a square.
 * <br>Exports: Constructor
 * @module bento/components/fill
 * @moduleName Fill
 * @param {Object} settings - Settings
 * @param {Array} settings.color - Color ([1, 1, 1, 1] is pure white). Alternatively use the Color module.
 * @param {Rectangle} settings.dimension - Size to fill up (defaults to viewport size)
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/fill', [
    'bento/utils',
    'bento'
], function (Utils, Bento) {
    'use strict';
    var Fill = function (settings) {
        var viewport = Bento.getViewport();
        settings = settings || {};
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'fill';
        this.color = settings.color || [0, 0, 0, 1];
        this.dimension = settings.dimension || viewport;
    };
    Fill.prototype.draw = function (data) {
        var dimension = this.dimension;
        data.renderer.fillRect(this.color, dimension.x, dimension.y, dimension.width, dimension.height);
    };
    Fill.prototype.setup = function (settings) {
        this.color = settings.color;
    };
    Fill.prototype.toString = function () {
        return '[object Fill]';
    };

    return Fill;
});