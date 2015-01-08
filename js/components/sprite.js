rice.define('rice/components/sprite', [
    'rice/sugar',
], function (Sugar) {
    'use strict';
    return function (base, settings) {
        var image,
            animationSettings,
            animations = {},
            currentAnimation = {
                frames: [0]
            },
            currentFrame = 0,
            frameCountX = 1,
            frameCountY = 1,
            frameWidth = 0,
            frameHeight = 0,
            onCompleteCallback,
            origin = base.getOrigin(),
            component = {
                name: 'sprite',
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
                    image = settings.image;
                    // use frameWidth if specified (overrides frameCountX and frameCountY)
                    if (animationSettings.frameWidth && animationSettings.frameHeight) {
                        frameWidth = animationSettings.frameWidth;
                        frameHeight = animationSettings.frameHeight;
                        frameCountX = Math.floor(image.width / frameWidth);
                        frameCountY = Math.floor(image.height / frameHeight);
                    } else {
                        frameCountX = animationSettings.frameCountX || 1;
                        frameCountY = animationSettings.frameCountY || 1;
                        frameWidth = image.width / frameCountX;
                        frameHeight = image.height / frameCountY;
                    }
                    // set dimension of base object
                    base.getDimension().width = frameWidth;
                    base.getDimension().height = frameHeight;
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
                        if (!Sugar.isDefined(anim.loop)) {
                            anim.loop = true;
                        }
                        if (!Sugar.isDefined(anim.backTo)) {
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

                    data.context.translate(Math.round(-origin.x), Math.round(-origin.y));
                    data.context.drawImage(
                        image,
                        sx,
                        sy,
                        frameWidth,
                        frameHeight,
                        0,
                        0,
                        frameWidth,
                        frameHeight
                    );
                }
            };

        // call setup 
        if (settings && settings[component.name]) {
            component.setup(settings[component.name]);
        }

        base.attach(component);
        if (base) {
            Sugar.combine(base, {
                sprite: component
            });
        }
        return base;
    };
});