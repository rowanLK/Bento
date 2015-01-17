bento.define('bunny', [
    'bento',
    'bento/director',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/tween'
], function (
    Bento,
    Director,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Tween
) {
    'use strict';
    return function () {
        var object = Entity({
            z: 0,
            name: 'bunny',
            originRelative: Vector2(0.5, 1),
            components: [Sprite],
            family: [''],
            sprite: {
                image: Bento.assets.getImage('bunnygirlsmall'),
                frameWidth: 32,
                frameHeight: 32,
                animations: {
                    'idle': {
                        speed: 0.1,
                        frames: [0, 10, 11, 12]
                    }
                }
            },
            init: function () {
                this.sprite.setAnimation('idle');
            }
        });
        return object;
    };
});