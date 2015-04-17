bento.define('bento/components/animation', [
    'bento',
    'bento/utils',
], function (Bento, Utils) {
    'use strict';
    return function (entity, settings) {
        var spriteImage,
            animationSettings,
            animations = {},
            currentAnimation = {
                frames: [0]
            },
            mixin = {},
            currentFrame = 0,
            frameCountX = 1,
            frameCountY = 1,
            frameWidth = 0,
            frameHeight = 0,
            onCompleteCallback,
            origin = entity.getOrigin(),
            component = {
                name: 'animation',
                setup: function (settings) {
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
                },
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
                getAnimation: function () {
                    return currentAnimation ? currentAnimation.name : null;
                },
                setFrame: function (frameNumber) {
                    currentFrame = frameNumber;
                },
                setCurrentSpeed: function (value) {
                    currentAnimation.speed = value;
                },
                getCurrentFrame: function () {
                    return currentFrame;
                },
                getFrameWidth: function () {
                    return frameWidth;
                },
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
                    var cf = Math.min(Math.floor(currentFrame), currentAnimation.frames.length - 1),
                        sx = (currentAnimation.frames[cf] % frameCountX) * frameWidth,
                        sy = Math.floor(currentAnimation.frames[cf] / frameCountX) * frameHeight;
                    data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));
                    data.renderer.drawImage(
                        spriteImage,
                        sx,
                        sy,
                        frameWidth,
                        frameHeight,
                        0,
                        0,
                        frameWidth,
                        frameHeight
                    );
                    data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
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