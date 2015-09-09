/**
 * Animation component. Draws an animated sprite on screen at the entity position.
 * <br>Exports: Function
 * @module bento/components/animation
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/animation', [
    'bento',
    'bento/utils',
], function (Bento, Utils) {
    'use strict';
    var Animation = function (settings) {
        this.entity = null;
        this.name = 'animation';

        this.animationSettings = settings || {
            frameCountX: 1,
            frameCountY: 1
        };

        this.spriteImage;

        this.frameCountX = 1,
        this.frameCountY = 1,
        this.frameWidth = 0,
        this.frameHeight = 0,

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
    Animation.prototype.setup = function (settings) {
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
        this.setAnimation('default')

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.width = this.frameWidth;
            this.entity.dimension.height = this.frameHeight;
        }
    };

    Animation.prototype.attached = function (data) {
        this.entity = data.entity;
        // set dimension of entity object
        this.entity.dimension.width = this.frameWidth;
        this.entity.dimension.height = this.frameHeight;
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
    Animation.prototype.setAnimation = function (name, callback, keepCurrentFrame) {
        var anim = this.animations[name];
        if (!anim) {
            console.log('Warning: animation ' + name + ' does not exist.');
            return;
        }
        if (anim && this.currentAnimation !== anim) {
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
     * @name getAnimation
     */
    Animation.prototype.getAnimation = function () {
        return this.currentAnimation;
    };
    /**
     * Set current animation to a certain frame
     * @function
     * @instance
     * @param {Number} frameNumber - Frame number.
     * @name setFrame
     */
    Animation.prototype.setFrame = function (frameNumber) {
        this.currentFrame = frameNumber;
    };
    /**
     * Set speed of the current animation.
     * @function
     * @instance
     * @param {Number} speed - Speed at which the animation plays.
     * @name setCurrentSpeed
     */
    Animation.prototype.setCurrentSpeed = function (value) {
        this.currentAnimation.speed = value;
    };
    /**
     * Returns the current frame number
     * @function
     * @instance
     * @returns {Number} frameNumber - Not necessarily a round number.
     * @name getCurrentFrame
     */
    Animation.prototype.getCurrentFrame = function () {
        return this.currentFrame;
    };
    /**
     * Returns the frame width
     * @function
     * @instance
     * @returns {Number} width - Width of the image frame.
     * @name getFrameWidth
     */
    Animation.prototype.getFrameWidth = function () {
        return this.frameWidth;
    };
    /**
     * Updates the component. Called by the entity holding the component every tick.
     * @function
     * @instance
     * @param {Object} data - Game data object
     * @name update
     */
    Animation.prototype.update = function () {
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
    Animation.prototype.draw = function (data) {
        var cf, sx, sy,
            entity = data.entity,
            origin = entity.origin;

        if (!this.currentAnimation) {
            return;
        }
        cf = Math.min(Math.floor(this.currentFrame), this.currentAnimation.frames.length - 1);
        sx = (this.currentAnimation.frames[cf] % this.frameCountX) * this.frameWidth;
        sy = Math.floor(this.currentAnimation.frames[cf] / this.frameCountX) * this.frameHeight;

        data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));
        data.renderer.drawImage(
            this.spriteImage,
            sx,
            sy,
            this.frameWidth,
            this.frameHeight,
            0,
            0,
            this.frameWidth,
            this.frameHeight
        );
        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };
    return Animation;
});