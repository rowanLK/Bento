/**
 * Sprite component that uses pixi (alternative version of animation component).
 * TODO: merge with the Animation component. Lots of duplicate code here
 * <br>Exports: Function
 * @module bento/components/pixi
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/pixi', [
    'bento',
    'bento/utils'
], function (
    Bento,
    Utils
) {
    'use strict';
    if (!window.PIXI) {
        console.log('Warning: PIXI is not available');
        return function () {};
    }

    var Pixi = function (settings) {
        this.pixiBaseTexture = null;
        this.pixiTexture = null;
        this.pixiSprite = null;
        this.opacityComponent = null;

        this.entity = null;
        this.name = 'animation';
        this.visible = true;

        this.animationSettings = settings || {
            frameCountX: 1,
            frameCountY: 1
        };

        this.spriteImage = null;

        this.frameCountX = 1;
        this.frameCountY = 1;
        this.frameWidth = 0;
        this.frameHeight = 0;

        // set to default
        this.animations = {};
        this.currentAnimation = null;

        this.onCompleteCallback = function () {};
        this.setup(settings);
    };
    /**
     * Sets up animation
     * @function
     * @instance
     * @param {Object} settings - Settings object
     * @name setup
     */
    Pixi.prototype.setup = function (settings) {
        var rectangle,
            crop;
        this.animationSettings = settings || this.animationSettings;

        // add default animation
        if (!this.animations['default']) {
            if (!this.animationSettings.animations) {
                this.animationSettings.animations = {};
            }
            if (!this.animationSettings.animations['default']) {
                this.animationSettings.animations['default'] = {
                    frames: [0]
                };
            }
        }

        // get image
        if (settings.image) {
            this.spriteImage = settings.image;
        } else if (settings.imageName) {
            // load from string
            if (Bento.assets) {
                this.spriteImage = Bento.assets.getImage(settings.imageName);
            } else {
                throw 'Bento asset manager not loaded';
            }
        } else {
            // no image specified
            return;
        }
        // use frameWidth if specified (overrides frameCountX and frameCountY)
        if (this.animationSettings.frameWidth) {
            this.frameWidth = this.animationSettings.frameWidth;
            this.frameCountX = Math.floor(this.spriteImage.width / this.frameWidth);
        } else {
            this.frameCountX = this.animationSettings.frameCountX || 1;
            this.frameWidth = this.spriteImage.width / this.frameCountX;
        }
        if (this.animationSettings.frameHeight) {
            this.frameHeight = this.animationSettings.frameHeight;
            this.frameCountY = Math.floor(this.spriteImage.height / this.frameHeight);
        } else {
            this.frameCountY = this.animationSettings.frameCountY || 1;
            this.frameHeight = this.spriteImage.height / this.frameCountY;
        }
        // set default
        Utils.extend(this.animations, this.animationSettings.animations, true);
        this.setAnimation('default');

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.width = this.frameWidth;
            this.entity.dimension.height = this.frameHeight;
        }

        // PIXI
        // initialize pixi
        if (this.spriteImage) {
            // search texture
            if (!this.spriteImage.image.texture) {
                this.spriteImage.image.texture = new PIXI.BaseTexture(this.spriteImage.image, PIXI.SCALE_MODES.NEAREST);
            }

            this.pixiBaseTexture = this.spriteImage.image.texture;
            rectangle = new PIXI.Rectangle(this.spriteImage.x, this.spriteImage.y, this.frameWidth, this.frameHeight);
            this.pixiTexture = new PIXI.Texture(this.pixiBaseTexture, rectangle);
            this.pixiSprite = new PIXI.Sprite(this.pixiTexture);
        }
    };

    Pixi.prototype.attached = function (data) {
        this.entity = data.entity;
        // set dimension of entity object
        this.entity.dimension.width = this.frameWidth;
        this.entity.dimension.height = this.frameHeight;
        this.opacityComponent = data.entity.getComponent('opacity');
    };
    /**
     * Set component to a different animation
     * @function
     * @instance
     * @param {String} name - Name of the animation.
     * @param {Function} callback - Called when animation ends.
     * @param {Boolean} keepCurrentFrame - Prevents animation to jump back to frame 0
     * @name setAnimation
     */
    Pixi.prototype.setAnimation = function (name, callback, keepCurrentFrame) {
        var anim = this.animations[name];
        if (!anim) {
            console.log('Warning: animation ' + name + ' does not exist.');
            return;
        }
        if (anim && (this.currentAnimation !== anim || (this.onCompleteCallback !== null && Utils.isDefined(callback)))) {
            if (!Utils.isDefined(anim.loop)) {
                anim.loop = true;
            }
            if (!Utils.isDefined(anim.backTo)) {
                anim.backTo = 0;
            }
            // set even if there is no callback
            this.onCompleteCallback = callback;
            this.currentAnimation = anim;
            this.currentAnimation.name = name;
            if (!keepCurrentFrame) {
                this.currentFrame = 0;
            }
        }
    };
    /**
     * Returns the name of current animation playing
     * @function
     * @instance
     * @returns {String} Name of the animation playing, null if not playing anything
     * @name getAnimationName
     */
    Pixi.prototype.getAnimationName = function () {
        return this.currentAnimation.name;
    };
    /**
     * Set current animation to a certain frame
     * @function
     * @instance
     * @param {Number} frameNumber - Frame number.
     * @name setFrame
     */
    Pixi.prototype.setFrame = function (frameNumber) {
        this.currentFrame = frameNumber;
    };
    /**
     * Set speed of the current animation.
     * @function
     * @instance
     * @param {Number} speed - Speed at which the animation plays.
     * @name setCurrentSpeed
     */
    Pixi.prototype.setCurrentSpeed = function (value) {
        this.currentAnimation.speed = value;
    };
    /**
     * Returns the current frame number
     * @function
     * @instance
     * @returns {Number} frameNumber - Not necessarily a round number.
     * @name getCurrentFrame
     */
    Pixi.prototype.getCurrentFrame = function () {
        return this.currentFrame;
    };
    /**
     * Returns the frame width
     * @function
     * @instance
     * @returns {Number} width - Width of the image frame.
     * @name getFrameWidth
     */
    Pixi.prototype.getFrameWidth = function () {
        return this.frameWidth;
    };
    /**
     * Updates the component. Called by the entity holding the component every tick.
     * @function
     * @instance
     * @param {Object} data - Game data object
     * @name update
     */
    Pixi.prototype.update = function (data) {
        var reachedEnd;
        if (!this.currentAnimation) {
            return;
        }
        reachedEnd = false;
        this.currentFrame += this.currentAnimation.speed || 1;
        if (this.currentAnimation.loop) {
            while (this.currentFrame >= this.currentAnimation.frames.length) {
                this.currentFrame -= this.currentAnimation.frames.length - this.currentAnimation.backTo;
                reachedEnd = true;
            }
        } else {
            if (this.currentFrame >= this.currentAnimation.frames.length) {
                reachedEnd = true;
            }
        }
        if (reachedEnd && this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    };
    /**
     * Draws the component. Called by the entity holding the component every tick.
     * @function
     * @instance
     * @param {Object} data - Game data object
     * @name draw
     */
    Pixi.prototype.draw = function (data) {
        var origin = data.entity.origin,
            position = data.entity.position,
            rotation = data.entity.rotation,
            scale = data.entity.scale,
            rectangle,
            cf,
            sx,
            sy;

        if (!this.currentAnimation || !this.pixiSprite || !this.visible) {
            return;
        }
        cf = Math.min(Math.floor(this.currentFrame), this.currentAnimation.frames.length - 1);
        sx = (this.currentAnimation.frames[cf] % this.frameCountX) * this.frameWidth;
        sy = Math.floor(this.currentAnimation.frames[cf] / this.frameCountX) * this.frameHeight;

        rectangle = new PIXI.Rectangle(this.spriteImage.x + sx, this.spriteImage.y + sy, this.frameWidth, this.frameHeight);
        this.pixiTexture.frame = rectangle;
        this.pixiSprite.x = position.x;
        this.pixiSprite.y = position.y;
        // pixiSprite.pivot.x = origin.x;
        // pixiSprite.pivot.y = origin.y;
        this.pixiSprite.anchor.x = origin.x / this.frameWidth;
        this.pixiSprite.anchor.y = origin.y / this.frameHeight;

        if (data.entity.float) {
            this.pixiSprite.x -= viewport.x;
            this.pixiSprite.y -= viewport.y;
        }
        this.pixiSprite.scale.x = scale.x;
        this.pixiSprite.scale.y = scale.y;
        this.pixiSprite.rotation = rotation;
        if (this.opacityComponent) {
            this.pixiSprite.alpha = this.opacityComponent.getOpacity();
        }
        this.pixiSprite.visible = data.entity.visible;
        this.pixiSprite.z = data.entity.z;
    };

    Pixi.prototype.destroy = function (data) {
        // remove from parent
        if (this.pixiSprite && this.pixiSprite.parent) {
            this.pixiSprite.parent.removeChild(this.pixiSprite);
        }
    };
    Pixi.prototype.start = function (data) {
        if (!this.pixiSprite) {
            console.log('call setup first');
            return;
        }
    };
    Pixi.prototype.onParentAttached = function (data) {
        var parent;

        if (!this.pixiSprite) {
            console.log('Warning: pixi sprite does not exist, creating pixi container');
            this.pixiSprite = new PIXI.Container();
        }

        if (data.renderer) {
            // attach to root
            data.renderer.addChild(this.pixiSprite);
        } else if (data.entity) {
            // attach to parent
            parent = data.entity.parent;
            // get pixi component
            if (parent) {
                parent.getComponent('animation', function (component) {
                    if (!component.pixiSprite) {
                        console.log('Warning: pixi sprite does not exist, creating pixi container');
                        component.pixiSprite = new PIXI.Container();
                    }
                    component.pixiSprite.addChild(this.pixiSprite);
                });
            }
        }
    };

    Pixi.prototype.toString = function () {
        return '[object Pixi]';
    };
    return Pixi;
});