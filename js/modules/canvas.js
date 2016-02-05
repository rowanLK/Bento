/**
 * An entity that uses a HTML5 2d canvas as image. Attach other entities to draw on this canvas.
 * @param {Object} settings - 
 * @param {Function} settings.constructor - function that returns the object for pooling
 * @param {Function} settings.destructor - function that resets object for reuse
 * @param {Number} settings.poolSize - amount to pre-initialize
 */
 bento.define('bento/canvas', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    
    return function (settings) {
        var viewport = Bento.getViewport(),
            sprite = new Sprite({
                imageName: '',
                frameCountX: 1,
                frameCountY: 1,
                animations: {
                    'default': {
                        speed: 0,
                        frames: [0]
                    }
                }
            }),
            entity = new Entity({
                z: 0,
                name: '',
                position: settings.position || new Vector2(0, 0),
                originRelative: new Vector2(0, 0),
                updateWhenPaused: false,
                family: [''],
                components: [sprite]
            });
        return entity;
    };
});