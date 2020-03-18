/**
 * Sprite component using the pixi renderer.
 * <br>Exports: Constructor
 * @extends {Canvas2DSprite}
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
    var PIXI = window.PIXI;
    var PixiSprite = function (settings) {
        if (!(this instanceof PixiSprite)) {
            return new PixiSprite(settings);
        }
        Sprite.call(this, settings);

        /**
         * Pixi sprite, can be used to append other Pixi objects
         * @instance
         * @name sprite
         * @type {PIXI.Sprite}
         */
        this.sprite = new PIXI.Sprite();
        this.sprite.visible = false;
        
        this.scaleMode = settings.scaleMode || (Bento.getAntiAlias() ? PIXI.SCALE_MODES.LINEAR : PIXI.SCALE_MODES.NEAREST);
        // checking if frame changed
        this.lastFrame = null;
        this.lastAnimation = null;
    };
    PixiSprite.prototype = Object.create(Sprite.prototype);
    PixiSprite.prototype.constructor = PixiSprite;
    PixiSprite.prototype.start = function (data) {
        // add the parent object to the main scene
        data.renderer.pixi.stage.addChild(this.sprite);
    };
    PixiSprite.prototype.destroy = function (data) {
        // remove the parent object from the main scene
        data.renderer.pixi.stage.removeChild(this.sprite);
    };
    PixiSprite.prototype.draw = function (data) {
        var entity = data.entity;
        var currentFrame = Math.floor(this.currentFrame);
        var currentAnimation = this.currentAnimation;

        if (!this.currentAnimation || !this.visible || !this.spriteImage) {
            this.sprite.visible = false;
            return;
        }
        if (this.lastFrame !== currentFrame || this.lastAnimation !== currentAnimation) {
            // prevent updating the uvs all the time
            this.updateFrame();
            this.updateSprite(
                this.spriteImage,
                this.sourceX,
                this.sourceY,
                this.frameWidth,
                this.frameHeight
            );
            this.lastFrame = currentFrame;
            this.lastAnimation = currentAnimation;
        }

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
        }

        var frame = new PIXI.Rectangle(
            packedImage.x + sx,
            packedImage.y + sy,
            sw,
            sh
        );
        this.sprite.texture = new PIXI.Texture(image.texture, frame);
    };

    PixiSprite.prototype.setup = function (data) {
        Sprite.prototype.setup.call(this, data);
        
        // reset frame cache
        this.lastFrame = null;
        this.lastAnimation = null;
    };

    PixiSprite.prototype.toString = function () {
        return '[object PixiSprite]';
    };

    PixiSprite.imageToTexture = function (image, antiAlias) {
        var imagePack = Utils.isString(image) ? Bento.assets.getImage(image) : image;
        var majorVersion = parseInt((PIXI.VERSION || '0.0.0').split('.')[0]);
        var options = {};
        if (majorVersion < 4) {
            options = antiAlias;
        } else {
            options.scaleMode = antiAlias;
        }
        return new PIXI.BaseTexture(imagePack.image, options);
    };

    return PixiSprite;
});