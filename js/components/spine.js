/**
 * Component that draws a Spine animation. A Spine asset must consist of a json, atlas and png with the same name. Developer must add
 [spine-canvas.js]{@link https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/3.6/spine-ts/build/spine-canvas.js} manually.
 * Note: made with canvas2d renderer in mind.
 * Note about skins: Lazy loading can be turned on with Bento.assets.lazyLoadSpine = true before the assets are loaded. This is useful if the spine
 * animations contains many skins and you want to prevent all of the skins to be preloaded. The asset manager will no longer manage the spine images.
 * Instead can call Spine.cleanLazyLoadedImages() to remove all images.
 * <br>Exports: Constructor
 * @module bento/components/spine
 * @moduleName Spine
* @snippet Spine.snippet
Spine({
    spine: '${1}',
    animation: '${2:idle}',
    scale: ${3:1},
    triangleRendering: false
})
 * @param {Object} settings - Settings
 * @param {String} settings.spine - Name of the spine asset
 * @param {String} settings.animation - Initial animation to play, defaults to 'default'
 * @param {Function} settings.onEvent - Animation state callback
 * @param {Function} settings.onComplete - Animation state callback
 * @param {Function} settings.onStart - Animation state callback
 * @param {Function} settings.onEnd - Animation state callback
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/spine', [
    'bento/utils',
    'bento',
    'bento/math/vector2'
], function (
    Utils,
    Bento,
    Vector2
) {
    'use strict';
    /**
     * Fake texture in case of lazy loading
     */
    var fakeTexture;
    var getFakeTexture = function () {
        var image;
        if (!fakeTexture) {
            image = new Image();
            fakeTexture = new window.spine.FakeTexture(image);
        }
        return fakeTexture;
    };
    var lazyLoadedImages = {};
    /**
     * Get/load the asset for the spine sprite
     */
    var loadSkeletonData = function (name, initialAnimation, listeners, skin) {
        var skeletonDataOut;
        var spineData = Bento.assets.getSpine(name);
        var skinsPerImage = spineData.skinImages;
        var spineAssetLoader = Bento.assets.getSpineLoader();
        // returns the textures for an atlas
        var textureLoader = function (path) {
            var output = spineAssetLoader.get(spineData.path + path);
            if (!output) {
                // image may not be loaded (lazyloading spine), return a fake texture for now
                output = getFakeTexture();

                // do we need the image for this skin?
                // Spine will otherwise attempt to load every image related to a TextureAtlas,
                // we made the link between skins and images during the asset loading (see managers/asset.js)
                if (skin === skinsPerImage[path]) {
                    // load correct image asap
                    lazyLoad(path);
                }
            }
            return output;
        };
        var lazyLoad = function (path) {
            // load the real texture now
            spineAssetLoader.loadTexture(
                spineData.path + path,
                function (p, img) {
                    // reload everything
                    var newData = loadSkeletonData(name, initialAnimation, listeners, skin);
                    // pass back to original data
                    skeletonDataOut.skeleton = newData.skeleton;
                    skeletonDataOut.state = newData.state;
                    skeletonDataOut.bounds = bounds.skeleton;
                    // alert the spine component that skeleton data is updated
                    if (skeletonDataOut.onReload) {
                        skeletonDataOut.onReload();
                    }

                    // save path
                    lazyLoadedImages[p] = img;
                },
                function () {
                    // error
                }
            );
        };
        // Load the texture atlas using name.atlas and name.png from the AssetManager.
        // The function passed to TextureAtlas is used to resolve relative paths.
        var atlas = new window.spine.TextureAtlas(spineData.atlas, textureLoader);

        // Create a AtlasAttachmentLoader, which is specific to the WebGL backend.
        var atlasLoader = new window.spine.AtlasAttachmentLoader(atlas);

        // Create a SkeletonJson instance for parsing the .json file.
        var skeletonJson = new window.spine.SkeletonJson(atlasLoader);

        // Set the scale to apply during parsing, parse the file, and create a new skeleton.
        var skeletonData = skeletonJson.readSkeletonData(spineData.skeleton);
        var skeleton = new window.spine.Skeleton(skeletonData);
        skeleton.flipY = true;
        var bounds = calculateBounds(skeleton);
        skeleton.setSkinByName(skin);

        // Create an AnimationState, and set the initial animation in looping mode.
        var animationState = new window.spine.AnimationState(new window.spine.AnimationStateData(skeleton.data));
        animationState.setAnimation(0, initialAnimation, true);
        animationState.addListener({
            event: listeners.onEvent || function (trackIndex, event) {
                // console.log("Event on track " + trackIndex + ": " + JSON.stringify(event));
            },
            complete: listeners.onComplete || function (trackIndex, loopCount) {
                // console.log("Animation on track " + trackIndex + " completed, loop count: " + loopCount);
            },
            start: listeners.onStart || function (trackIndex) {
                // console.log("Animation on track " + trackIndex + " started");
            },
            end: listeners.onEnd || function (trackIndex) {
                // console.log("Animation on track " + trackIndex + " ended");
            }
        });

        // Pack everything up and return to caller.
        skeletonDataOut = {
            skeleton: skeleton,
            state: animationState,
            bounds: bounds,
            onReload: null
        };
        return skeletonDataOut;
    };
    var calculateBounds = function (skeleton) {
        var data = skeleton.data;
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();
        var offset = new window.spine.Vector2();
        var size = new window.spine.Vector2();
        skeleton.getBounds(offset, size, []);
        return {
            offset: offset,
            size: size
        };
    };
    var skeletonRenderer;
    var debugRendering = false;

    var Spine = function (settings) {
        var name = settings.name || 'spine';
        var spineName = settings.spineName || settings.spine;
        var skin = settings.skin || 'default';
        var currentAnimation = settings.animation || 'default';
        var isLooping = true;
        // animation state listeners
        var onEvent = settings.onEvent;
        var onComplete = settings.onComplete;
        var onStart = settings.onStart;
        var onEnd = settings.onEnd;
        // enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
        var useTriangleRendering = settings.triangleRendering || false;
        var skeletonData;
        var skeleton, state, bounds;
        var currentAnimationSpeed = 1;
        var entity;
        // todo: investigate internal scaling
        var scale = settings.scale || 1;
        var component = {
            name: name,
            start: function (data) {
                // load the skeleton data if that's not been done yet
                if (!skeletonData) {
                    skeletonData = loadSkeletonData(spineName, currentAnimation, {
                        onEvent: onEvent,
                        onComplete: function (trackIndex, loopCount) {
                            if (onComplete) {
                                onComplete(trackIndex, loopCount);
                            }
                        },
                        onStart: onStart,
                        onEnd: onEnd
                    }, skin);
                    skeleton = skeletonData.skeleton;
                    state = skeletonData.state;
                    bounds = skeletonData.bounds;

                    // anticipate lazy load
                    skeletonData.onReload = function () {
                        // rebind data
                        skeleton = skeletonData.skeleton;
                        state = skeletonData.state;
                        bounds = skeletonData.bounds;
                        // apply previous state
                        state.setAnimation(0, currentAnimation, isLooping);
                        state.apply(skeleton);
                    };
                }
                // initialize skeleton renderer
                if (!skeletonRenderer) {
                    skeletonRenderer = new window.spine.canvas.SkeletonRenderer(data.renderer.getContext());
                    skeletonRenderer.debugRendering = debugRendering;
                }
                updateEntity();

                if (!Utils.isNumber(scale)) {
                    Utils.log('ERROR: scale must be a number');
                    scale = 1;
                }
            },
            destroy: function (data) {},
            update: function (data) {
                state.update(data.deltaT / 1000 * data.speed * currentAnimationSpeed);
                state.apply(skeleton);
            },
            draw: function (data) {
                // todo: investigate scaling
                data.renderer.scale(scale, scale);
                skeleton.updateWorldTransform();
                skeletonRenderer.triangleRendering = useTriangleRendering;
                skeletonRenderer.draw(skeleton);
                data.renderer.scale(1 / scale, 1 / scale);
            },
            attached: function (data) {
                entity = data.entity;
            },
            /**
             * Set animation
             * @function
             * @instance
             * @param {String} name - Name of animation
             * @param {Function} [callback] - Callback on complete, will overwrite onEnd if set
             * @param {Boolean} [loop] - Loop animation
             * @name setAnimation
             * @snippet #Spine.setAnimation|snippet
                setAnimation('$1');
             * @snippet #Spine.setAnimation|callback
                setAnimation('$1', function () {
                    $2
                });
             */
            setAnimation: function (name, callback, loop) {
                if (currentAnimation === name) {
                    // already playing
                    return;
                }
                // update current animation
                currentAnimation = name;
                // reset speed
                currentAnimationSpeed = 1;
                isLooping = Utils.getDefault(loop, true);
                // apply animation
                state.setAnimation(0, name, isLooping);
                // set callback, even if undefined
                onComplete = callback;
                // apply the skeleton to avoid visual delay
                state.apply(skeleton);
            },
            /**
             * Get current animation name
             * @function
             * @instance
             * @name getAnimation
             * @snippet #Spine.getAnimation|String
                getAnimation();
             * @returns {String} Returns name of current animation.
             */
            getAnimationName: function () {
                return currentAnimation;
            },
            /**
             * Get speed of the current animation, relative to Spine's speed
             * @function
             * @instance
             * @returns {Number} Speed of the current animation
             * @name getCurrentSpeed
             * @snippet #Spine.getCurrentSpeed|Number
                getCurrentSpeed();
             */
            getCurrentSpeed: function () {
                return currentAnimationSpeed;
            },
            /**
             * Set speed of the current animation.
             * @function
             * @instance
             * @param {Number} speed - Speed at which the animation plays.
             * @name setCurrentSpeed
             * @snippet #Spine.setCurrentSpeed|snippet
                setCurrentSpeed(${1:number});
             */
            setCurrentSpeed: function (value) {
                currentAnimationSpeed = value;
            },
            /**
             * Exposes Spine skeleton data and animation state variables for manual manipulation
             * @function
             * @instance
             * @name getSpineData
             * @snippet #Spine.getSpineData|snippet
                getSpineData();
             */
            getSpineData: function () {
                return {
                    skeletonData: skeleton,
                    animationState: state
                };
            }
        };
        var updateEntity = function () {
            if (!entity) {
                return;
            }

            entity.dimension.x = bounds.offset.x * scale;
            entity.dimension.y = bounds.offset.y * scale;
            entity.dimension.width = bounds.size.x * scale;
            entity.dimension.height = bounds.size.y * scale;
        };
        return component;
    };

    Spine.setDebugRendering = function (bool) {
        if (skeletonRenderer) {
            skeletonRenderer.debugRendering = bool;
        }
    };

    Spine.cleanLazyLoadedImages = function () {
        // clearing up memory
        // don't call this during update loops! 
        // no spine components should be alive when this is called, because all references will be invalid
        var spineAssetLoader = Bento.assets.getSpineLoader();
        Utils.forEach(lazyLoadedImages, function (image, imagePath, l, breakLoop) {
            spineAssetLoader.remove(imagePath);

            if (image.dispose) {
                // alternatively we could not call dispose and let the garbage collector do its work
                image.dispose();
            }
        });
    };

    return Spine;
});