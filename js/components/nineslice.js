/**
 * Nineslice component
 * @moduleName NineSlice
 */
bento.define('bento/components/nineslice', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
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
    var NineSlice = function (settings) {
        if (!(this instanceof NineSlice)) {
            return new NineSlice(settings);
        }
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'nineslice';
        this.visible = true;

        this.animationSettings = settings || {
            frameCountX: 1,
            frameCountY: 1,
            animations: {
                up: {
                    frames: [0]
                },
                down: {
                    frames: [0]
                },
                inactive: {
                    frames: [0]
                }
            }
        };

        // component settings
        this.width = 0;
        this.height = 0;

        // sprite settings
        this.spriteImage = null;
        this.frameCountX = 1;
        this.frameCountY = 1;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.padding = 0;

        // drawing internals
        this.sliceWidth = 0;
        this.sliceHeight = 0;
        this.sourceX = 0;
        this.sourceY = 0;

        // set to default
        this.animations = {};
        this.currentAnimation = null;
        this.currentAnimationLength = 0;

        this.setup(settings);
    };

    NineSlice.prototype.setup = function (settings) {
        var self = this;
        var padding = 0;

        this.animationSettings = settings || this.animationSettings;
        padding = this.animationSettings.padding || 0;

        // add default animation
        if (!this.animations['up']) {
            if (!this.animationSettings.animations) {
                this.animationSettings.animations = {};
            }
            if (!this.animationSettings.animations['up']) {
                this.animationSettings.animations['up'] = {
                    frames: [0]
                };
            }
        }

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
                Bento.assets.loadImageFromUrl(settings.imageFromUrl, settings.imageFromUrl, function (err, asset) {
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

        // use frameWidth if specified (overrides frameCountX and frameCountY)
        if (this.animationSettings.frameWidth) {
            this.frameWidth = this.animationSettings.frameWidth;
            this.frameCountX = Math.floor(this.spriteImage.width / this.frameWidth);
        } else {
            this.frameCountX = this.animationSettings.frameCountX || 1;
            this.frameWidth = (this.spriteImage.width - padding * (this.frameCountX - 1)) / this.frameCountX;
        }
        if (this.animationSettings.frameHeight) {
            this.frameHeight = this.animationSettings.frameHeight;
            this.frameCountY = Math.floor(this.spriteImage.height / this.frameHeight);
        } else {
            this.frameCountY = this.animationSettings.frameCountY || 1;
            this.frameHeight = (this.spriteImage.height - padding * (this.frameCountY - 1)) / this.frameCountY;
        }

        if (this.spriteImage) {
            this.sliceWidth = Math.floor((this.spriteImage.width - this.padding * 2 * this.frameCountX) / (3 * this.frameCountX));
            this.sliceHeight = Math.floor((this.spriteImage.height - this.padding * 2 * this.frameCountY) / (3 * this.frameCountY));
        }

        if (settings.width) {
            this.width = Math.max(settings.width || 0, this.sliceWidth * 2);
        }
        if (settings.height) {
            this.height = Math.max(settings.height || 0, this.sliceHeight * 2);
        }

        this.padding = this.animationSettings.padding || 0;

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.width = this.width;
            this.entity.dimension.height = this.height;
        }

        // set default
        Utils.extend(this.animations, this.animationSettings.animations, true);
        this.setAnimation('up');
    };

    NineSlice.prototype.attached = function (data) {
        var animation;
        var animations = this.animationSettings.animations;
        var ii = 0;
        var iil = 0;
        var highestFrame = 0;

        this.entity = data.entity;
        // set dimension of entity object
        this.entity.dimension.width = this.width;
        this.entity.dimension.height = this.height;

        // check if the frames of animation go out of bounds
        for (animation in animations) {
            for (ii = 0, iil = animations[animation].frames.length; ii < iil; ++ii) {
                if (animations[animation].frames[ii] > highestFrame) {
                    highestFrame = animations[animation].frames[ii];
                }
            }
            if ( /*!Sprite.suppressWarnings &&*/ highestFrame > this.frameCountX * this.frameCountY - 1) {
                console.log("Warning: the frames in animation " + animation + " of " + (this.entity.name || this.entity.settings.name) + " are out of bounds. Can't use frame " + highestFrame + ".");
            }
        }
    };

    NineSlice.prototype.setAnimation = function (name, callback) {
        var anim = this.animations[name];
        if (Utils.isDefined(callback)) {
            console.warn("LK_WARN: the version of setAnimation in NineSlice doesn't support callbacks.");
        }
        if ( /*!Sprite.suppressWarnings &&*/ !anim) {
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
            this.currentAnimation = anim;
            this.currentAnimation.name = name;
            this.currentAnimationLength = this.currentAnimation.frames.length;
            if ( /*!Sprite.suppressWarnings &&*/ this.currentAnimation.backTo > this.currentAnimationLength) {
                console.log('Warning: animation ' + name + ' has a faulty backTo parameter');
                this.currentAnimation.backTo = this.currentAnimationLength;
            }
        }

        this.updateFrame();
    };

    NineSlice.prototype.updateFrame = function () {
        var sourceFrame = this.currentAnimation.frames[0];
        this.sourceX = (sourceFrame % this.frameCountX) * (this.frameWidth + this.padding);
        this.sourceY = Math.floor(sourceFrame / this.frameCountX) * (this.frameHeight + this.padding);
    };

    NineSlice.prototype.setWidth = function (width) {
        this.width = Utils.isDefined(width) ? width : this.width;
        this.width = Math.max(this.width, this.sliceWidth * 2);
        if (this.entity) {
            var relOriginX = this.entity.origin.x / this.entity.dimension.width;
            this.entity.dimension.width = this.width;
            this.entity.origin.x = relOriginX * this.width;
        }
    };

    NineSlice.prototype.setHeight = function (height) {
        this.height = Utils.isDefined(height) ? height : this.height;
        this.height = Math.max(this.height, this.sliceHeight * 2);
        if (this.entity) {
            var relOriginY = this.entity.origin.y / this.entity.dimension.height;
            this.entity.dimension.height = this.height;
            this.entity.origin.y = relOriginY * this.height;
        }
    };

    NineSlice.prototype.fillArea = function (renderer, frame, x, y, width, height) {
        var sx = (this.sliceWidth + this.padding) * (frame % 3) + this.sourceX;
        var sy = (this.sliceHeight + this.padding) * Math.floor(frame / 3) + this.sourceY;

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

    NineSlice.prototype.draw = function (data) {
        var entity = data.entity;
        var origin = data.entity.origin;

        var innerWidth = this.width - this.sliceWidth * 2;
        var innerHeight = this.height - this.sliceHeight * 2;

        if (this.width === 0 || this.height === 0) {
            return;
        }

        data.renderer.translate(-Math.round(origin.x), -Math.round(origin.y));

        //top left corner
        this.fillArea(data.renderer, 0, 0, 0);
        //top stretch
        this.fillArea(data.renderer, 1, this.sliceWidth, 0, innerWidth, this.sliceHeight);
        //top right corner
        this.fillArea(data.renderer, 2, this.width - this.sliceWidth, 0);
        //left stretch
        this.fillArea(data.renderer, 3, 0, this.sliceHeight, this.sliceWidth, innerHeight);
        //center stretch
        this.fillArea(data.renderer, 4, this.sliceWidth, this.sliceHeight, innerWidth, innerHeight);
        //right stretch
        this.fillArea(data.renderer, 5, this.width - this.sliceWidth, this.sliceHeight, this.sliceWidth, innerHeight);
        //bottom left corner
        this.fillArea(data.renderer, 6, 0, this.height - this.sliceHeight);
        //bottom stretch
        this.fillArea(data.renderer, 7, this.sliceWidth, this.height - this.sliceHeight, innerWidth, this.sliceHeight);
        //bottom right corner
        this.fillArea(data.renderer, 8, this.width - this.sliceWidth, this.height - this.sliceHeight);

        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };

    return NineSlice;
});