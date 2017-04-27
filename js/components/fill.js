/**
 * Component that fills a square.
 * <br>Exports: Constructor
 * @module bento/components/fill
 * @moduleName Fill
 * @param {Object} settings - Settings
 * @param {Array} settings.color - Color ([1, 1, 1, 1] is pure white). Alternatively use the Color module.
 * @param {Rectangle} settings.dimension - Size to fill up (defaults to viewport size)
 * @param {Rectangle} settings.origin - Origin point
 * @param {Rectangle} settings.originRelative - Set origin with relative to the dimension
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/fill', [
    'bento/utils',
    'bento',
    'bento/math/vector2'
], function (
    Utils,
    Bento,
    Vector2
) {
    'use strict';
    var Fill = function (settings) {
        if (!(this instanceof Fill)) {
            return new Fill(settings);
        }
        var viewport = Bento.getViewport();
        settings = settings || {};
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'fill';
        this.color = settings.color || [0, 0, 0, 1];
        this.dimension = settings.dimension || settings.size || viewport;
        this.origin = settings.origin || new Vector2(0, 0);
        if (settings.originRelative) {
            this.origin.x = this.dimension.width * settings.originRelative.x;
            this.origin.y = this.dimension.height * settings.originRelative.y;
        }
    };
    Fill.prototype.draw = function (data) {
        var dimension = this.dimension;
        var origin = this.origin.add(this.parent.origin);
        data.renderer.fillRect(this.color, dimension.x - origin.x, dimension.y - origin.y, dimension.width, dimension.height);
    };
    Fill.prototype.toString = function () {
        return '[object Fill]';
    };

    return Fill;
});