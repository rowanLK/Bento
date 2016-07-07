/**
 * Sprite component with a pixi sprite exposed. Must be used with pixi renderer.
 * Useful if you want to use pixi features.
 * <br>Exports: Constructor
 * @module bento/components/pixi/sprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/pixi/sprite', [
    'bento',
    'bento/utils',
    'bento/components/sprite'
], function (Bento, Utils, Sprite) {
    'use strict';
    var PixiSprite = function (settings) {
        Sprite.call(this, settings);
        this.sprite = new PIXI.Sprite();
    };
    PixiSprite.prototype = Object.create(Sprite.prototype);
    PixiSprite.prototype.constructor = PixiSprite;
    PixiSprite.prototype.draw = function (data) {
        var entity = data.entity,
            origin = entity.origin;

        if (!this.currentAnimation || !this.visible) {
            return;
        }
        this.updateFrame();
        this.updateSprite(
            this.spriteImage,
            this.sourceX,
            this.sourceY,
            this.frameWidth,
            this.frameHeight
        );

        // draw with pixi
        data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));
        data.renderer.drawPixi(this.sprite);
        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };
    PixiSprite.prototype.updateSprite = function (packedImage, sx, sy, sw, sh) {
        var rectangle;
        var sprite;
        var texture;
        var image;

        if (!packedImage) {
            return;
        }
        image = packedImage.image;
        if (!image.texture) {
            // initialize pixi baseTexture
            image.texture = new PIXI.BaseTexture(image, PIXI.SCALE_MODES.NEAREST);
        }
        rectangle = new PIXI.Rectangle(sx, sy, sw, sh);
        texture = new PIXI.Texture(image.texture, rectangle);
        texture._updateUvs();

        this.sprite.texture = texture;
    };

    PixiSprite.prototype.toString = function () {
        return '[object PixiSprite]';
    };

    return PixiSprite;
});