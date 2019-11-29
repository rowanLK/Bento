/**
 * Convenience Entity wrapper for Sprites.
 * 
 * This component is useful for games with HD graphics. Sets a desired width and/or height without needing to scale manually and without needing
 * to scale the parent entity (which could otherwise result in weird parent/child transforms). 
 * Added benefit of setting a desired width/height is that the rendererd size is independent of the original image's dimensions 
 * allowing you to upscale or downscale the original resolution of an image. It is also useful to use the SpriteContainer's transforms,
 * particularly offsetting a sprite using the SpriteContainer's position property.
 *
 * Setting one dimension as null will automatically scale the other dimension according to the original image's aspect ratio.
 *
 * <br>Exports: Constructor
 * @module bento/components/spritecontainer
 * @moduleName SpriteContainer

 * @param {Object} settings - See Sprite's settings object!
 * @moduleName SpriteContainer
 * @snippet SpriteContainer|imageName
SpriteContainer({
    width: ${1:32},
    height: ${2:null},
    imageName: '${3}',
    position: new Vector2(${4:0}, ${5:0}),
    originRelative: new Vector2(${6:0.5}, ${7:0.5}),
    frameCountX: ${8:1},
    frameCountY: ${9:1},
    animations: {
        default: {
            speed: 0,
            frames: [0]
        }
    }
})
 * @snippet SpriteContainer|spriteSheet
SpriteContainer({
    width: ${1:32},
    height: ${2:null},
    spriteSheet: '${3}',
    position: new Vector2(${4:0}, ${5:0})
})
 */

bento.define('bento/components/spritecontainer', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/entity',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Entity,
    Utils,
    Tween
) {
    'use strict';
    var SpriteContainer = function (settings) {
        /**
         * Dimensions
         */
        var width = settings.width || null;
        var height = settings.height || null;
        var scale = settings.scale;
        var setupDimensions = function () {
            var ratio;
            var parent = container.parent;
            var parentDimension = parent ? parent.dimension : new Rectangle(0, 0, 0, 0);
            var hasWidth = !Utils.isEmpty(width);
            var hasHeight = !Utils.isEmpty(height);

            // get aspect ratio from original width / height
            ratio = sprite.frameWidth / sprite.frameHeight || 1; // beware of dividing by 0

            // container's parent dimension will become the desired dimension
            if (hasWidth) {
                container.scale.x = width / sprite.frameWidth;
                parentDimension.width = width;
            }
            if (hasHeight) {
                container.scale.y = height / sprite.frameHeight;
                parentDimension.height = height;
            }
            // one of parameters was not given: scale other dimension using same ratio
            if (!hasWidth) {
                container.scale.x = container.scale.y;
                parentDimension.width = height * ratio;
            }
            if (!hasHeight) {
                container.scale.y = container.scale.x;
                parentDimension.height = width / ratio;
            }
            // both parameters are not passed: use original image width and height
            if (!hasWidth && !hasHeight) {
                // reset scale
                if (!scale) {
                    container.scale.x = 1;
                    container.scale.y = 1;
                } else {
                    container.scale = scale;
                }
                parentDimension.width = sprite.frameWidth;
                parentDimension.height = sprite.frameHeight;
            }

            // set x/y offset in dimension
            parentDimension.x = -sprite.origin.x * container.scale.x;
            parentDimension.y = -sprite.origin.y * container.scale.y;
        };
        /**
         * Sprite and container
         */
        var sprite = new Sprite(Utils.extend(settings, {
            originRelative: settings.originRelative || new Vector2(0.5, 0.5)
        }, true));
        var container = new Entity({
            z: settings.z,
            name: settings.name || 'spriteContainer',
            position: settings.position,
            scale: settings.scale,
            rotation: settings.rotation,
            alpha: settings.alpha,
            visible: settings.visible,
            float: settings.float,
            family: settings.family,
            global: settings.global,
            updateWhenPaused: settings.updateWhenPaused,
            boundingBox: settings.boundingBox,
            components: [
                sprite,
                new Object({
                    name: 'behavior',
                    start: function (data) {
                        setupDimensions();
                    }
                })
            ]
        }).extend({
            /**
             * Exposes original sprite component
             * @instance
             * @name sprite
             * @snippet #SpriteContainer.sprite|Sprite
                sprite
             */
            sprite: sprite,
            /**
             * Re-setup sprite (includes width and height parameters).
             * @instance
             * @function
             * @name setup
             * 
             * @snippet #SpriteContainer.setup|Snippet
                setup
             */
            setup: function (data) {
                sprite.setup(Utils.extend(data, {
                    originRelative: data.originRelative || new Vector2(0.5, 0.5)
                }, true));
                
                // width and height should be passed again
                width = data.width || null;
                height = data.height || null;
                scale = data.scale || scale;

                setupDimensions();
            }
        });

        /**
         * Desired width. If null, the x scale is set automatically according to the image's aspect ratio. 
         * @instance
         * @default null
         * @name width

         * @snippet #SpriteContainer.width|Number
            width
         */
        Object.defineProperty(container, 'width', {
            get: function () {
                return width;
            },
            set: function (value) {
                width = value;
                setupDimensions();
            }
        });
        /**
         * Desired height. If null, the y scale is set automatically according to the image's aspect ratio. 
         * @instance
         * @default null
         * @name height
         * @snippet #SpriteContainer.height|Number
            height
         */
        Object.defineProperty(container, 'height', {
            get: function () {
                return height;
            },
            set: function (value) {
                height = value;
                setupDimensions();
            }
        });

        return container;
    };
    return SpriteContainer;
});