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
            spriteSheet: 'bunny'
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