bento.define('bento/components/pixi', [
    'bento/utils'
], function (
    Utils
) {
    'use strict';
    if (!window.PIXI) {
        console.log('Warning: PIXI is not available');
        return function () {};
    }

    return function (entity, settings) {
        var pixiBaseTexture,
            pixiTexture,
            pixiSprite,
            animationSettings,
            animations = {},
            currentAnimation,
            mixin = {},
            currentFrame = 0,
            frameCountX = 1,
            frameCountY = 1,
            frameWidth = 0,
            frameHeight = 0,
            spriteImage,
            onCompleteCallback,
            component = {
                name: 'pixi',
                setup: function (settings) {
                    var rectangle,
                        crop;
                    if (settings) {
                        animationSettings = settings;
                    } else {
                        // create default animation
                        animationSettings = {
                            frameCountX: 1,
                            frameCountY: 1
                        };
                    }
                    // add default animation
                    if (!animationSettings.animations) {
                        animationSettings.animations = {};
                    }
                    if (!animationSettings.animations['default']) {
                        animationSettings.animations['default'] = {
                            frames: [0]
                        };
                    }

                    // get image
                    if (settings.image) {
                        spriteImage = settings.image;
                    } else if (settings.imageName) {
                        // load from string
                        if (Bento.assets) {
                            spriteImage = Bento.assets.getImage(settings.imageName);
                        } else {
                            throw 'Bento asset manager not loaded';
                        }
                    } else {
                        // no image specified
                        return;
                    }
                    // use frameWidth if specified (overrides frameCountX and frameCountY)
                    if (animationSettings.frameWidth) {
                        frameWidth = animationSettings.frameWidth;
                        frameCountX = Math.floor(spriteImage.width / frameWidth);
                    } else {
                        frameCountX = animationSettings.frameCountX || 1;
                        frameWidth = spriteImage.width / frameCountX;
                    }
                    if (animationSettings.frameHeight) {
                        frameHeight = animationSettings.frameHeight;
                        frameCountY = Math.floor(spriteImage.height / frameHeight);
                    } else {
                        frameCountY = animationSettings.frameCountY || 1;
                        frameHeight = spriteImage.height / frameCountY;
                    }
                    // set dimension of entity object
                    entity.getDimension().width = frameWidth;
                    entity.getDimension().height = frameHeight;
                    // set to default
                    animations = animationSettings.animations;
                    currentAnimation = animations['default'];

                    // PIXI
                    // initialize pixi
                    pixiBaseTexture = new PIXI.BaseTexture(spriteImage.image, PIXI.SCALE_MODES.NEAREST);
                    rectangle = new PIXI.Rectangle(spriteImage.x, spriteImage.y, frameWidth, frameHeight);
                    pixiTexture = new PIXI.Texture(pixiBaseTexture, rectangle);
                    pixiSprite = new PIXI.Sprite(pixiTexture);
                },
                /**
                 * Updates the component. Called by the entity holding the component every tick.
                 * @function
                 * @instance
                 * @param {Object} data - Game data object
                 * @name update
                 */
                update: function () {
                    var reachedEnd;
                    if (!currentAnimation) {
                        return;
                    }
                    reachedEnd = false;
                    currentFrame += currentAnimation.speed || 1;
                    if (currentAnimation.loop) {
                        while (currentFrame >= currentAnimation.frames.length) {
                            currentFrame -= currentAnimation.frames.length - currentAnimation.backTo;
                            reachedEnd = true;
                        }
                    } else {
                        if (currentFrame >= currentAnimation.frames.length) {
                            reachedEnd = true;
                        }
                    }
                    if (reachedEnd && onCompleteCallback) {
                        onCompleteCallback();
                    }
                },
                draw: function (data) {
                    // update pixi sprite, doesnt actually draw
                    var origin = entity.getOrigin(),
                        position = entity.getPosition(),
                        rotation,
                        scale,
                        rectangle,
                        cf,
                        sx,
                        sy;
                    if (!currentAnimation) {
                        //return;
                    }
                    cf = Math.min(Math.floor(currentFrame), currentAnimation.frames.length - 1);
                    sx = (currentAnimation.frames[cf] % frameCountX) * frameWidth;
                    sy = Math.floor(currentAnimation.frames[cf] / frameCountX) * frameHeight;

                    rectangle = new PIXI.Rectangle(spriteImage.x + sx, spriteImage.y + sy, frameWidth, frameHeight);

                    pixiTexture.frame = rectangle;

                    pixiSprite.x = position.x;
                    pixiSprite.y = position.y;
                    pixiSprite.pivot.x = origin.x;
                    pixiSprite.pivot.y = origin.y;

                    if (entity.scale) {
                        scale = entity.scale.getScale();
                        pixiSprite.scale.x = scale.x;
                        pixiSprite.scale.y = scale.y;
                    }
                    if (entity.rotation) {
                        rotation = entity.rotation.getAngleRadian();
                        pixiSprite.rotation = rotation;
                    }
                },
                destroy: function () {
                    data.renderer.removeChild(pixiSprite);
                },
                start: function (data) {
                    if (!pixiSprite) {
                        console.log('call setup first')
                        return;
                    }
                    if (data) {
                        // attach to roor
                        data.renderer.addChild(pixiSprite);
                    } else {
                        // attach to parent?
                    }
                },
                /**
                 * Set component to a different animation
                 * @function
                 * @instance
                 * @param {String} name - Name of the animation.
                 * @param {Function} callback - Called when animation ends.
                 * @param {Boolean} keepCurrentFrame - Prevents animation to jump back to frame 0
                 * @name setAnimation
                 */
                setAnimation: function (name, callback, keepCurrentFrame) {
                    var anim = animations[name];
                    if (!anim) {
                        console.log('Warning: animation ' + name + ' does not exist.');
                        return;
                    }
                    if (anim && currentAnimation !== anim) {
                        if (!Utils.isDefined(anim.loop)) {
                            anim.loop = true;
                        }
                        if (!Utils.isDefined(anim.backTo)) {
                            anim.backTo = 0;
                        }
                        // set even if there is no callback
                        onCompleteCallback = callback;
                        currentAnimation = anim;
                        currentAnimation.name = name;
                        if (!keepCurrentFrame) {
                            currentFrame = 0;
                        }
                    }
                },
                /**
                 * Returns the name of current animation playing
                 * @function
                 * @instance
                 * @returns {String} Name of the animation playing, null if not playing anything
                 * @name getAnimation
                 */
                getAnimation: function () {
                    return currentAnimation ? currentAnimation.name : null;
                },
                /**
                 * Set current animation to a certain frame
                 * @function
                 * @instance
                 * @param {Number} frameNumber - Frame number.
                 * @name setFrame
                 */
                setFrame: function (frameNumber) {
                    currentFrame = frameNumber;
                },
                /**
                 * Set speed of the current animation.
                 * @function
                 * @instance
                 * @param {Number} speed - Speed at which the animation plays.
                 * @name setCurrentSpeed
                 */
                setCurrentSpeed: function (value) {
                    currentAnimation.speed = value;
                },
                /**
                 * Returns the current frame number
                 * @function
                 * @instance
                 * @returns {Number} frameNumber - Not necessarily a round number.
                 * @name getCurrentFrame
                 */
                getCurrentFrame: function () {
                    return currentFrame;
                },
                /**
                 * Returns the frame width
                 * @function
                 * @instance
                 * @returns {Number} width - Width of the image frame.
                 * @name getFrameWidth
                 */
                getFrameWidth: function () {
                    return frameWidth;
                }
            };
        // call setup 
        if (settings && settings[component.name]) {
            component.setup(settings[component.name]);
        }

        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});