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
    var punches = ['punch1', 'punch2', 'uppercut'];
    return function () {
        var punchIndex = 0;
        var isPunching = false;

        var sprite = new Sprite({
            // originRelative: new Vector2(0.5, 0.5),
            spriteSheet: 'idle'
        });
        var entity = new Entity({
            z: 1,
            name: 'bunny',
            components: [sprite],
            family: ['bunnies']
        });
        entity.punch = function () {
            if (isPunching) {
                return;
            }
            sprite.setSpriteSheet(punches[punchIndex], function () {
                sprite.setSpriteSheet('idle');
                isPunching = false;
            });
            punchIndex = (punchIndex + 1) % punches.length;
            isPunching = true;
        };

        return entity;
    };
});