/**
 * Component that fills a rectangle using Pixi
 * <br>Exports: Constructor
 * @module bento/components/pixi/fill
 * @moduleName PixiFill
 */
bento.define('bento/components/pixi/fill', [
    'bento/utils',
    'bento',
    'bento/math/vector2',
    'bento/components/canvas2d/fill'
], function (
    Utils,
    Bento,
    Vector2,
    Canvas2DFill
) {
    'use strict';
    var PIXI = window.PIXI;
    var PixiFill = function (settings) {
        if (!(this instanceof PixiFill)) {
            return new PixiFill(settings);
        }
        Canvas2DFill.call(this, settings);
        
        this.graphics = new PIXI.Graphics();

        // if this.dimension is edited, the fill should be redone
        this.cacheDimension = null;

        // start a fill
        this.startFill();
    };
    PixiFill.prototype = Object.create(Canvas2DFill.prototype);
    PixiFill.prototype.constructor = PixiFill;

    PixiFill.prototype.startFill = function () {
        var color = this.color;
        var dimension = this.dimension;
        var origin = this.origin;
        var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);
        var graphics = this.graphics;
        graphics.clear();
        graphics.beginFill(colorInt);
        graphics.drawRect(
            dimension.x - origin.x,
            dimension.y - origin.y,
            dimension.width,
            dimension.height
        );
        graphics.endFill();

        // cache dimension
        this.cacheDimension = dimension.clone();
    };
    PixiFill.prototype.update = function (data) {
        var dimension = this.dimension;
        var cacheDimension = this.cacheDimension;
        // update fill
        if (
            dimension.x !== cacheDimension.x ||
            dimension.y !== cacheDimension.y || 
            dimension.width !== cacheDimension.width ||
            dimension.height !== cacheDimension.height
        ) {
            this.startFill();
        }
    };
    PixiFill.prototype.draw = function (data) {
        data.renderer.render(this.graphics);
    };

    PixiFill.prototype.toString = function () {
        return '[object PixiFill]';
    };

    return PixiFill;
});