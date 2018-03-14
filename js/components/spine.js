/**
 * Component that draws a Spine animation
 * <br>Exports: Constructor
 * @module bento/components/spine
 * @moduleName Spine
 * @param {Object} settings - Settings
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
    var loadSkeletonData = function (name, initialAnimation, skin) {
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
            event: function (trackIndex, event) {
                // console.log("Event on track " + trackIndex + ": " + JSON.stringify(event));
            },
            complete: function (trackIndex, loopCount) {
                // console.log("Animation on track " + trackIndex + " completed, loop count: " + loopCount);
            },
            start: function (trackIndex) {
                // console.log("Animation on track " + trackIndex + " started");
            },
            end: function (trackIndex) {
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
    var Spine = function (settings) {
        var name = settings.name || 'spine';
        var spineName = settings.spineName || settings.spine;
        var currentAnimation = settings.animation || 'default';
        var skeletonRenderer;
        var skeletonData;
        var skeleton, state, bounds;
        var entity;
        var scale = settings.scale || 1;
        var component = {
            name: name,
            start: function (data) {
                // load the skeleton data if that's not been done yet
                if (!skeletonData) {
                    skeletonData = loadSkeletonData(spineName, currentAnimation);
                    skeleton = skeletonData.skeleton;
                    state = skeletonData.state;
                    bounds = skeletonData.bounds;
                }
                // initialize skeleton renderer
                if (!skeletonRenderer) {
                    skeletonRenderer = new window.spine.canvas.SkeletonRenderer(data.renderer.getContext());
                    skeletonRenderer.debugRendering = Spine.debugRendering;
                    skeletonRenderer.triangleRendering = Spine.triangleRendering;
                }

                if (!Utils.isNumber(scale)) {
                    Utils.log('ERROR: scale must be a number');
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
                skeletonRenderer.draw(skeleton);
            },
            attached: function (data) {
                entity = data.entity;
            }
        };
        return component;
    };

    // enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
    Spine.debugRendering = false;
    Spine.triangleRendering = false;

    return Spine;
});