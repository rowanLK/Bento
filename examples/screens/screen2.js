bento.define('screen2', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/tween',
    'bento/screen'
], function (
    Bento,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Fill,
    Tween,
    Screen
) {
    'use strict';
    var object = Screen({
        tiled: 'level2',
        onShow: function () {
            var fill = new Entity({
                z: -1,
                name: 'fill',
                components: [new Fill({
                    color: [0.8, 0.8, 1, 1]
                })]
            });
            Bento.objects.attach(fill);
            console.log('screen 2 loaded');
        }
    });
    return object;
});