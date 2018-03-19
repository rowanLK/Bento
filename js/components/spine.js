/**
 * Component that draws a Spine animation. A Spine asset must consist of a json, atlas and png with the same name. Developer must add
 [spine-canvas.js]{@link https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/3.6/spine-ts/build/spine-canvas.js} manually.
 * Note: made with canvas2d renderer in mind.
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
    var loadSkeletonData = function (name, initialAnimation, listeners, skin) {
        if (skin === undefined) {
            skin = "default";
        }

        var spineData = Bento.assets.getSpine(name);

        // Load the texture atlas using name.atlas and name.png from the AssetManager.
        // The function passed to TextureAtlas is used to resolve relative paths.
        var atlas = new window.spine.TextureAtlas(spineData.atlas, function (path) {
            return Bento.assets.getSpineLoader().get(spineData.path + path);
        });

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
        return {
            skeleton: skeleton,
            state: animationState,
            bounds: bounds
        };
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
        var currentAnimation = settings.animation || 'default';
        // animation state listeners
        var onEvent = settings.onEvent;
        var onComplete = settings.onComplete;
        var onStart = settings.onStart;
        var onEnd = settings.onEnd;
        // enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
        var useTriangleRendering = settings.triangleRendering || false;
        var skeletonRenderer;
        var skeletonData;
        var skeleton, state, bounds;
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
                        onComplete: onComplete,
                        onStart: onStart,
                        onEnd: function () {
                            if (onEnd) {
                                onEnd();
                            }
                        }
                    });
                    skeleton = skeletonData.skeleton;
                    state = skeletonData.state;
                    bounds = skeletonData.bounds;
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
                state.update(data.deltaT / 1000);
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
             */
            setAnimation: function (name, callback, loop) {
                if (currentAnimation === name) {
                    // already playing
                    return;
                }
                if (callback) {
                    onEnd = callback;
                }
                currentAnimation = name;
                state.setAnimation(0, name, Utils.getDefault(loop, true));
            },
            /**
             * Get current animation name
             * @function
             * @instance
             * @name getAnimation
             * @returns {String} Returns name of current animation.
             */
            getAnimationName: function () {
                return currentAnimation;
            },
            /**
             * Exposes Spine skeleton data and animation state variables for manual manipulation
             * @function
             * @instance
             * @name getSpineData
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

    return Spine;
});