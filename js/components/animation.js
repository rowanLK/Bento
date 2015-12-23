/**
 * Animation component. Draws an animated sprite on screen at the entity position.
 * <br>Exports: Constructor
 * @module bento/components/animation
 * @param {Object} settings - Settings
 * @param {String} settings.imageName - Asset name for the image. Calls Bento.assets.getImage() internally. 
 * @param {Number} settings.frameCountX - Number of animation frames horizontally (defaults to 1)
 * @param {Number} settings.frameCountY - Number of animation frames vertically (defaults to 1)
 * @param {Number} settings.frameWidth - Alternative for frameCountX, sets the width manually
 * @param {Number} settings.frameHeight - Alternative for frameCountY, sets the height manually
 * @param {Object} settings.animations - Object literal defining animations, the object literal keys are the animation names
 * @param {Boolean} settings.animations[...].loop - Whether the animation should loop (defaults to true)
 * @param {Number} settings.animations[...].backTo - Loop back the animation to a certain frame (defaults to 0)
 * @param {Number} settings.animations[...].speed - Speed at which the animation is played. 1 is max speed (changes frame every tick). (defaults to 1)
 * @param {Array} settings.animations[...].frames - The frames that define the animation. The frames are counted starting from 0 (the top left)
 * @example
 var sprite = new Sprite({ // note that you can use the Sprite component with the same settings object
        imageName: "mySpriteSheet",
        frameCountX: 3,
        frameCountY: 3, // a 3 x 3 spritesheet
        animations: {
            "idle": {
                frames: [0] // first frame
            },
            "walk": {
                speed: 0.2,
                frames: [1, 2, 3, 4, 5, 6]
            },
            "jump": {
                speed: 0.2,
                frames: [7, 8]
            } // etc.
        }
     }),
     entity = new Entity({});

entity.attach(sprite); // attach sprite to entity
Bento.objects.attach(entity); // attach entity to game
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/animation', [
    'bento',
    'bento/utils',
], function (Bento, Utils) {
    'use strict';
    var Animation = function (settings) {
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
     * Sets up animation. This can be used to overwrite the settings object passed to the constructor.
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
        this.setAnimation('default');

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
     * Set component to a different animation. The animation won't change if it's already playing.
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
    Animation.prototype.getAnimationName = function () {
        return this.currentAnimation.name;
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
     * Get speed of the current animation.
     * @function
     * @instance
     * @returns {Number} Speed of the current animation
     * @name getCurrentSpeed
     */
    Animation.prototype.getCurrentSpeed = function () {
        return this.currentAnimation.speed;
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
    Animation.prototype.update = function () {
        var reachedEnd;
        if (!this.currentAnimation) {
            return;
        }
        reachedEnd = false;
        this.currentFrame += this.currentAnimation.speed || 1;
        if (this.currentAnimation.loop) {
            // TODO: fix this while loop getting stuck
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
    Animation.prototype.draw = function (data) {
        var cf, sx, sy,
            entity = data.entity,
            origin = entity.origin;

        if (!this.currentAnimation || !this.visible) {
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
    Animation.prototype.toString = function () {
        return '[object Animation]';
    };

    return Animation;
});