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
        var object = new Entity({
            z: 0,
            name: 'bunny',
            originRelative: new Vector2(0.5, 1),
            components: [
                new Sprite({
                    image: Bento.assets.getImage('bunnygirlsmall'),
                    frameWidth: 32,
                    frameHeight: 32,
                    animations: {
                        'idle': {
                            speed: 0.1,
                            frames: [0, 10, 11, 12]
                        }
                    }
                }),
                new Clickable({
                    pointerDown: function () {
                        console.log('click')
                        if (Bento.screens.getCurrentScreen().name === 'screen1') {
                            Bento.screens.show('screen2');
                        } else {
                            Bento.screens.show('screen1');
                        }
                    }
                })
            ],
            family: [''],
            init: function () {
                this.getComponent('animation').setAnimation('idle');
            }
        });
        return object;
    };
});