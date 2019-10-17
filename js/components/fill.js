/**
 * Component that fills a square.
 * Uses a PIXI sprite under the hood, to avoid performance issues.
 * <br>Exports: Constructor
 * @module bento/components/fill
 * @moduleName Fill
 * @param {Object} settings - Settings
 * @param {Array} settings.color - Color ([1, 1, 1, 1] is pure white). Alternatively use the Color module.
 * @param {Rectangle} settings.dimension - Size to fill up (defaults to viewport size)
 * @param {Rectangle} settings.origin - Origin point
 * @param {Rectangle} settings.originRelative - Set origin with relative to the dimension
 * @returns Returns a component object to be attached to an entity.
 * @snippet Fill|constructor
Fill({
    name: 'fill',
    dimension: viewport.getSize(),
    color: [${1:0}, ${2:0}, ${3:0}, 1], // [1, 1, 1, 1] is pure white
    originRelative: new Vector2(${4:0}, ${5:0})
})
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
    var PIXI = window.PIXI;

    var texture = (function () {
        var canvas = Bento.createCanvas();
        canvas.width = 3;
        canvas.height = 3;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var baseTexture = PIXI.BaseTexture.fromCanvas(canvas, PIXI.SCALE_MODES.LINEAR);
        var frame = new PIXI.Rectangle(1, 1, 1, 1);
        return new PIXI.Texture(baseTexture, frame);
    })();

    var Fill = function (settings) {
        if (!(this instanceof Fill)) {
            return new Fill(settings);
        }
        var viewport = Bento.getViewport();
        settings = settings || {};
        this.parent = null;
        this.rootIndex = -1;
        this.sprite = new PIXI.Sprite(texture);
        this.name = settings.name || 'fill';
        /**
         * Color array
         * @instance
         * @name color
         * @snippet #Fill.color|Array
            color
         */
        this.color = settings.color || [0, 0, 0, 1];
        while (this.color.length < 4) {
            this.color.push(1);
        }
        /**
         * Dimension/size of the rectangle to fill
         * @instance
         * @name dimension
         * @snippet #Fill.dimension|Rectangle
            dimension
         */
        this.dimension = settings.dimension || settings.size || settings.rectangle || viewport.getSize();
        /**
         * Origin of the fill size
         * @instance
         * @name origin
         * @snippet #Fill.origin|Vector2
            origin
         */
        this.origin = settings.origin || new Vector2(0, 0);
        if (settings.originRelative) {
            this.origin.x = this.dimension.width * settings.originRelative.x;
            this.origin.y = this.dimension.height * settings.originRelative.y;
        }
    };
    Fill.prototype.draw = function (data) {
        var dimension = this.dimension;
        var origin = this.origin;
        var sprite = this.sprite;
        var color = this.color;

        sprite.tint = (color[0] * 255) << 16
                    | (color[1] * 255) << 8
                    | (color[2] * 255) << 0;

        sprite.alpha = color[3];

        sprite.x = dimension.x - origin.x;
        sprite.y = dimension.y - origin.y;
        sprite.width = dimension.width;
        sprite.height = dimension.height;

        data.renderer.drawPixi(this.sprite);
    };
    /**
     * Set origin relative to size
     * @instance
     * @function
     * @name setOriginRelative
     * @param {Vector2} originRelative - Vector2 with the origin relative to its dimension
     * @snippet #Fill.setOriginRelative()|snippet
        setOriginRelative(${1:new Vector2(0, 0)})
     */
    Fill.prototype.setOriginRelative = function (originRelative) {
        this.origin.x = this.dimension.width * originRelative.x;
        this.origin.y = this.dimension.height * originRelative.y;
    };
    Fill.prototype.toString = function () {
        return '[object Fill]';
    };

    return Fill;
});