/**
 * Sprite component with a pixi sprite exposed. Must be used with pixi renderer.
 * Useful if you want to use pixi features.
 * <br>Exports: Constructor
 * @module bento/components/pixi/sprite
 * @moduleName PixiSprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/pixi/sprite', [
    'bento',
    'bento/utils',
    'bento/components/canvas2d/sprite'
], function (Bento, Utils, Sprite) {
    'use strict';
    var PixiSprite = function (settings) {
        if (!(this instanceof PixiSprite)) {
            return new PixiSprite(settings);
        }
        Sprite.call(this, settings);
        this.sprite = new window.PIXI.Sprite();
        this.scaleMode = settings.scaleMode || (Bento.getAntiAlias() ? window.PIXI.SCALE_MODES.LINEAR : window.PIXI.SCALE_MODES.NEAREST);
    };
    PixiSprite.prototype = Object.create(Sprite.prototype);
    PixiSprite.prototype.constructor = PixiSprite;
    PixiSprite.prototype.draw = function (data) {
        var entity = data.entity;

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
        data.renderer.translate(-Math.round(this.origin.x), -Math.round(this.origin.y));
        data.renderer.render(this.sprite);
        data.renderer.translate(Math.round(this.origin.x), Math.round(this.origin.y));
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
            image.texture = PixiSprite.imageToTexture(packedImage, this.scaleMode);
            image.frame = new window.PIXI.Texture(image.texture);
        }
        texture = image.frame;
        rectangle = texture._frame;
        rectangle.x = packedImage.x + sx;
        rectangle.y = packedImage.y + sy;
        rectangle.width = sw;
        rectangle.height = sh;
        if (texture._updateUvs) {
            texture._updateUvs();
        } else if (texture.updateUvs) {
            texture.updateUvs();
        } else {
            console.warn('Warning: Texture.updateUvs function not found');
        }

        this.sprite.texture = texture;
    };

    PixiSprite.prototype.toString = function () {
        return '[object PixiSprite]';
    };

    PixiSprite.imageToTexture = function (image, antiAlias) {
        var imagePack = Utils.isString(image) ? Bento.assets.getImage(image) : image;
        return new window.PIXI.BaseTexture(imagePack.image, antiAlias);
    };

    return PixiSprite;
});