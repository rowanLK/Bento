/**
 * Sprite component. Draws an animated sprite on screen at the entity's transform.
 * Inherited class based on renderer.
 * <br>Exports: Constructor
 * @module bento/components/sprite
 * @moduleName Sprite
 * @snippet Sprite|spriteSheet
Sprite({
    spriteSheet: '${1}'
})
 * @snippet Sprite|imageName
Sprite({
    imageName: '${1}',
    originRelative: new Vector2(${2:0.5}, ${3:0.5}),
    frameCountX: ${4:1},
    frameCountY: ${5:1},
    animations: {
        default: {
            speed: 0,
            frames: [0]
        }
    }
})
 * @param {Object} settings - Settings
 * @param {String} settings.name - Overwites the component name (default is "sprite")
 * @param {String} settings.spriteSheet - (Using spritesheet assets) Asset name for the spriteSheet asset. If one uses spritesheet assets, this is the only parameter that is needed.
 * @param {String} settings.imageName - (Using image assets) Asset name for the image.
 * @param {Number} settings.frameCountX - Number of animation frames horizontally (defaults to 1)
 * @param {Number} settings.frameCountY - Number of animation frames vertically (defaults to 1)
 * @param {Number} settings.frameWidth - Alternative for frameCountX, sets the width manually
 * @param {Number} settings.frameHeight - Alternative for frameCountY, sets the height manually
 * @param {Number} settings.paddding - Pixelsize between frames
 * @param {Vector2} settings.origin - Vector2 of origin
 * @param {Vector2} settings.originRelative - Vector2 of relative origin (relative to dimension size)
 * @param {Object} settings.animations - Only needed if an image asset) Object literal defining animations, the object literal keys are the animation names.
 * @param {Boolean} settings.animations[...].loop - Whether the animation should loop (defaults to true)
 * @param {Number} settings.animations[...].backTo - Loop back the animation to a certain frame (defaults to 0)
 * @param {Number} settings.animations[...].speed - Speed at which the animation is played. 1 is max speed (changes frame every tick). (defaults to 1)
 * @param {Array} settings.animations[...].frames - The frames that define the animation. The frames are counted starting from 0 (the top left)
 * @example
// Defines a 3 x 3 spritesheet with several animations
// Note: The default is automatically defined if no animations object is passed
var sprite = new Sprite({
        imageName: "mySpriteSheet",
        frameCountX: 3,
        frameCountY: 3,
        animations: {
            "default": {
                frames: [0]
            },
            "walk": {
                speed: 0.2,
                frames: [1, 2, 3, 4, 5, 6]
            },
            "jump": {
                speed: 0.2,
                frames: [7, 8]
            }
        }
     }),
    entity = new Entity({
        components: [sprite] // attach sprite to entity
                             // alternative to passing a components array is by calling entity.attach(sprite);
    });

// attach entity to game
Bento.objects.attach(entity);
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/sprite', [
    'bento',
    'bento/utils',
    'bento/components/canvas2d/sprite',
    'bento/components/pixi/sprite',
    'bento/components/three/sprite'
], function (
    Bento,
    Utils,
    Canvas2DSprite,
    PixiSprite,
    ThreeSprite
) {
    'use strict';
    // The sprite is always an inherited version of either canvas2d, pixi or three versions,
    // but in order to know which one to pick, the renderer already needs to be set (which makes this operation a bit scary)
    // That means this module should not be included anywhere before Bento.setup is called 
    var renderer = Bento.getRenderer();
    var Sprite = function (settings) {
        if (!(this instanceof Sprite)) {
            return new Sprite(settings);
        }
        Sprite.Constructor.call(this, settings);
    };
    Sprite.inheritFrom = function (Constructor) {
        Sprite.Constructor = Constructor;
        // inherit from class
        Sprite.prototype = Object.create(Sprite.Constructor.prototype);
        Sprite.prototype.constructor = Sprite;
        // inherit helper function
        Sprite.imageToTexture = Sprite.Constructor.imageToTexture;
    };

    // pick the class
    if (!renderer) {
        console.warn('Warning: Sprite is included before Bento.setup, defaulting to Canvas2dSprite. Call Sprite.inheritFrom if needed.');
        Sprite.inheritFrom(Canvas2DSprite);
    } else if (renderer.name === 'pixi') {
        Sprite.inheritFrom(PixiSprite);
    } else if (renderer.name === 'three.js') {
        Sprite.inheritFrom(ThreeSprite);
    } else {
        Sprite.inheritFrom(Canvas2DSprite);
    }
    return Sprite;
});