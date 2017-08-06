/**
 * Nineslice component, takes an image and slices it in 9 equal parts. This image can then be stretched as a box
 * where the corners don't get deformed.
 * <br>Exports: Constructor
 * @module bento/components/nineslice
 * @moduleName NineSlice
 * @param {Object} settings - Settings
 * @param {String} settings.imageName - (Using image assets) Asset name for the image.
 * @param {Vector2} settings.origin - Vector2 of origin
 * @param {Vector2} settings.originRelative - Vector2 of relative origin (relative to dimension size)
 * @param {Vector2} settings.width - Width of the desired box
 * @param {Vector2} settings.height - Height of the desired box
 * @param {Number} settings.frameCountX - Number of animation frames horizontally (defaults to 1)
 * @param {Number} settings.frameCountY - Number of animation frames vertically (defaults to 1)
 * @param {Number} settings.frameWidth - Alternative for frameCountX, sets the width manually
 * @param {Number} settings.frameHeight - Alternative for frameCountY, sets the height manually
 * @param {Number} settings.paddding - Pixelsize between slices
 * @param {Number} settings.framePaddding - Pixelsize between frames
 * @param {Object} settings.animations - Only needed if an image asset) Object literal defining animations, the object literal keys are the animation names.
 * @param {Boolean} settings.animations[...].loop - Whether the animation should loop (defaults to true)
 * @param {Number} settings.animations[...].backTo - Loop back the animation to a certain frame (defaults to 0)
 * @param {Number} settings.animations[...].speed - Speed at which the animation is played. 1 is max speed (changes frame every tick). (defaults to 1)
 * @param {Array} settings.animations[...].frames - The frames that define the animation. The frames are counted starting from 0 (the top left)
 */
bento.define('bento/components/nineslice', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function(
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    /**
     * Describe your settings object parameters
     * @param {Object} settings
     */
    var NineSlice = function(settings) {
        if (!(this instanceof NineSlice)) {
            return new NineSlice(settings);
        }
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'nineslice';
        this.visible = true;
        this.origin = new Vector2(0, 0);

        // component settings
        this._width = 0;
        this._height = 0;
        this._recalculateFlag = false;
        this.frameX = 0;
        this.frameY = 0;

        // sprite settings
        this.spriteImage = null;
        this.padding = 0;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.frameCountX = 1;
        this.frameCountY = 1;
        this.framePadding = 0;

        // drawing internals
        this.sliceWidth = 0;
        this.sliceHeight = 0;

        //animation setttings
        this.animations = {};
        this.currentAnimation = null;
        this.currentAnimationLength = 0;
        this.currentFrame = 0;

        this.onCompleteCallback = function() {};

        this.settings = settings;
        this.setup(settings);
    };

    NineSlice.prototype.setup = function(settings) {
        var self = this;

        if (settings.image) {
            this.spriteImage = settings.image;
        } else if (settings.imageName) {
            // load from string
            if (Bento.assets) {
                this.spriteImage = Bento.assets.getImage(settings.imageName);
            } else {
                throw 'Bento asset manager not loaded';
            }
        } else if (settings.imageFromUrl) {
            // load from url
            if (!this.spriteImage && Bento.assets) {
                Bento.assets.loadImageFromUrl(settings.imageFromUrl, settings.imageFromUrl, function(err, asset) {
                    self.spriteImage = Bento.assets.getImage(settings.imageFromUrl);
                    self.setup(settings);

                    if (settings.onLoad) {
                        settings.onLoad();
                    }
                });
                // wait until asset is loaded and then retry
                return;
            }
        } else {
            // no image specified
            return;
        }
        if (!this.spriteImage) {
            Utils.log("ERROR: something went wrong with loading the sprite.");
            return;
        }

        this.padding = settings.padding || 0;
        this.framePadding = settings.framePadding || 0;


        this.frameWidth = this.spriteImage.width;
        this.frameHeight = this.spriteImage.height;

        if (settings.frameWidth) {
            this.frameWidth = settings.frameWidth;
            this.frameCountX = Math.floor(this.spriteImage.width / settings.frameWidth);
        } else if (settings.frameCountX) {
            this.frameCountX = settings.frameCountX;
            this.frameWidth = (this.spriteImage.width - this.framePadding * (this.frameCountX - 1)) / this.frameCountX;
        }
        if (settings.frameHeight) {
            this.frameHeight = settings.frameHeight;
            this.frameCountY = Math.floor(this.spriteImage.width / settings.frameHeight);
        } else if (settings.frameCountY) {
            this.frameCountY = settings.frameCountY;
            this.frameHeight = (this.spriteImage.height - this.framePadding * (this.frameCountY - 1)) / this.frameCountY;
        }

        if (this.spriteImage) {
            this.sliceWidth = Math.floor((this.frameWidth - this.padding * 2) / 3);
            this.sliceHeight = Math.floor((this.frameHeight - this.padding * 2) / 3);
        }

        if (settings.width) {
            this._width = Math.max(settings.width || 0, 0);
        }
        if (settings.height) {
            this._height = Math.max(settings.height || 0, 0);
        }

        if (this.settings.origin) {
            this.origin.x = this.settings.origin.x;
            this.origin.y = this.settings.origin.y;
        } else if (this.settings.originRelative) {
            this.setOriginRelative(this.settings.originRelative);
        }

        this.animations = settings.animations || {};
        // add default animation
        if (!this.animations['default']) {
            this.animations['default'] = {
                frames: [0]
            };
        }

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.x = -this.origin.x;
            this.entity.dimension.y = -this.origin.y;
            this.entity.dimension.width = this._width;
            this.entity.dimension.height = this._height;
        }
        this.recalculateDimensions();

        this.setAnimation('default');
    };

    NineSlice.prototype.updateEntity = function() {
        if (!this.entity) return;
        // set dimension of entity object
        this.entity.dimension.x = -this.origin.x;
        this.entity.dimension.y = -this.origin.y;
        this.entity.dimension.width = this._width;
        this.entity.dimension.height = this._height;
    };

    NineSlice.prototype.attached = function(data) {
        this.entity = data.entity;

        this.updateEntity();
    };

    NineSlice.prototype.setAnimation = function(name, callback, keepCurrentFrame) {
        var anim = this.animations[name];
        if (!anim) {
            console.log('Warning: animation ' + name + ' does not exist.');
            return;
        };

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
            this.currentAnimationLength = this.currentAnimation.frames.length;
            if (!keepCurrentFrame) {
                this.currentFrame = 0;
            }
            if (this.currentAnimation.backTo > this.currentAnimationLength) {
                console.log('Warning: animation ' + name + ' has a faulty backTo parameter');
                this.currentAnimation.backTo = this.currentAnimationLength;
            }
        }
    };

    NineSlice.prototype.getAnimationName = function() {
        return this.currentAnimation.name;
    };

    NineSlice.prototype.setFrame = function(frameNumber) {
        this.currentFrame = frameNumber;
    };

    NineSlice.prototype.getCurrentSpeed = function() {
        return this.currentAnimation.speed;
    };

    NineSlice.prototype.setCurrentSpeed = function(value) {
        this.currentAnimation.speed = value;
    };

    NineSlice.prototype.getCurrentFrame = function() {
        return this.currentFrame;
    };

    NineSlice.prototype.setWidth = function(width) {
        this._width = Utils.isDefined(width) ? width : this._width;
        this._width = Math.max(this._width, 0);
        if (this.entity) {
            this.entity.dimension.width = this._width;
            if (this.settings.originRelative) {
                // recalculate relative origin
                this.origin.x = this.settings.originRelative.x * this._width;
            }
            this.entity.dimension.x = -this.origin.x;
        }
        this._recalculateFlag = true;
    };

    NineSlice.prototype.setHeight = function(height) {
        this._height = Utils.isDefined(height) ? height : this._height;
        this._height = Math.max(this._height, 0);
        if (this.entity) {
            this.entity.dimension.height = this._height;
            if (this.settings.originRelative) {
                // recalculate relative origin
                this.origin.y = this.settings.originRelative.y * this._height;
            }
            this.entity.dimension.y = -this.origin.y;
        }
        this._recalculateFlag = true;
    };
    /**
     * Sets the origin relatively (0...1), relative to the size of the frame.
     * @function
     * @param {Vector2} origin - Position of the origin (relative to upper left corner)
     * @instance
     * @name setOriginRelative
     */
    NineSlice.prototype.setOriginRelative = function(originRelative) {
        this.origin.x = originRelative.x * this._width;
        this.origin.y = originRelative.y * this._height;
    };

    NineSlice.prototype.update = function(data) {
        var reachedEnd;
        if (!this.currentAnimation) {
            return;
        }

        // no need for update
        if (this.currentAnimationLength <= 1 || this.currentAnimation.speed === 0) {
            return;
        }

        var frameSpeed = this.currentAnimation.speed || 1;
        if (this.currentAnimation.frameSpeeds && this.currentAnimation.frameSpeeds.length - 1 >= this.currentFrame) {
            frameSpeed *= this.currentAnimation.frameSpeeds[Math.floor(this.currentFrame)];
        }

        reachedEnd = false;
        this.currentFrame += (frameSpeed) * data.speed;
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
            //don't repeat callback on non-looping animations
            if (!this.currentAnimation.loop) {
                this.onCompleteCallback = null;
            }
        }

        if (this._recalculateFlag) {
            recalculateDimensions();
        }
    };

    NineSlice.prototype.recalculateDimensions = function() {
        this.innerWidth = Math.max(0, this._width - this.sliceWidth * 2);
        this.innerHeight = Math.max(0, this._height - this.sliceHeight * 2);

        this.leftWidth = Math.min(this.sliceWidth, Math.round(this._width / 2));
        this.rightWidth = Math.min(this.sliceWidth, this._width - this.leftWidth);

        this.topHeight = Math.min(this.sliceHeight, Math.round(this._height / 2));
        this.bottomHeight = Math.min(this.sliceHeight, this._height - this.topHeight);

        this._recalculateFlag = false;
    };

    NineSlice.prototype.fillArea = function(renderer, slice, x, y, width, height) {
        var sx = (this.sliceWidth + this.padding) * (slice % 3) + this.frameX;
        var sy = (this.sliceHeight + this.padding) * Math.floor(slice / 3) + this.frameY;

        if (width === 0 || height === 0) {
            return;
        }

        if (!width) {
            width = this.sliceWidth;
        }
        if (!height) {
            height = this.sliceHeight;
        }

        renderer.drawImage(
            this.spriteImage,
            sx,
            sy,
            this.sliceWidth,
            this.sliceHeight,
            x,
            y,
            width,
            height
        );
    };

    NineSlice.prototype.updateFrame = function() {
        var frameIndex = Math.min(Math.floor(this.currentFrame), this.currentAnimation.frames.length - 1);
        var sourceFrame = this.currentAnimation.frames[frameIndex];
        this.frameX = (sourceFrame % this.frameCountX) * (this.frameWidth + this.padding);
        this.frameY = Math.floor(sourceFrame / this.frameCountX) * (this.frameHeight + this.padding);
    };

    NineSlice.prototype.draw = function(data) {
        var entity = data.entity;
        var origin = this.origin;

        if (this._width === 0 || this._height === 0) {
            return;
        }

        this.updateFrame();

        data.renderer.translate(-Math.round(origin.x), -Math.round(origin.y));

        //top left corner
        this.fillArea(data.renderer, 0, 0, 0, this.leftWidth, this.topHeight);
        //top stretch
        this.fillArea(data.renderer, 1, this.leftWidth, 0, this.innerWidth, this.topHeight);
        //top right corner
        this.fillArea(data.renderer, 2, this._width - this.rightWidth, 0, this.rightWidth, this.topHeight);

        //left stretch
        this.fillArea(data.renderer, 3, 0, this.topHeight, this.leftWidth, this.innerHeight);
        //center stretch
        this.fillArea(data.renderer, 4, this.leftWidth, this.topHeight, this.innerWidth, this.innerHeight);
        //right stretch
        this.fillArea(data.renderer, 5, this._width - this.rightWidth, this.topHeight, this.rightWidth, this.innerHeight);

        //bottom left corner
        this.fillArea(data.renderer, 6, 0, this._height - this.bottomHeight, this.leftWidth, this.bottomHeight);
        //bottom stretch
        this.fillArea(data.renderer, 7, this.leftWidth, this._height - this.bottomHeight, this.innerWidth, this.bottomHeight);
        //bottom right corner
        this.fillArea(data.renderer, 8, this._width - this.rightWidth, this._height - this.bottomHeight, this.rightWidth, this.bottomHeight);

        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };

    return NineSlice;
});