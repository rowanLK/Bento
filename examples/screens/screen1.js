bento.define('screen1', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/tween',
    'bento/screen'
], function (
    Bento,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Tween,
    Screen
) {
    'use strict';
    var object = Screen({
        tiled: 'level1',
        onShow: function () {
            console.log('screen 1 loaded');
        }
    });
    return object;
});