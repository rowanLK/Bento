bento.define('bunny', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Clickable,
    Tween
) {
    'use strict';
    return function () {
        var sprite = new Sprite({
            image: Bento.assets.getImage('bunnygirlsmall'),
            frameWidth: 32,
            frameHeight: 32,
            animations: {
                'default': {
                    speed: 0.1,
                    frames: [0, 10, 11, 12]
                },
                'walk': {
                    speed: 0.15,
                    frames: [4, 5, 6, 7, 8, 9]
                }
            }
        });
        var entity = new Entity({
            z: 1,
            name: 'bunny',
            originRelative: new Vector2(0.5, 0.5),
            components: [sprite],
            family: ['bunnies']
        });

        return entity;
    };
});