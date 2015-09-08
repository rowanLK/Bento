bento.define('clickbutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport(),
            entity = new Entity({
                z: 0,
                name: '',
                originRelative: settings.originRelative || new Vector2(0, 0),
                position: settings.position || new Vector2(0, 0),
                components: [Sprite, Clickable],
                family: ['buttons'],
                sprite: {
                    image: settings.image,
                    frameWidth: settings.frameWidth || 32,
                    frameHeight: settings.frameHeight || 32,
                    animations: settings.animations || {
                        'default': {
                            speed: 0,
                            frames: [0]
                        },
                        'down': {
                            speed: 0,
                            frames: [1]
                        }
                    }
                },
                clickable: {
                    onClick: function () {
                        entity.sprite.setAnimation('down');
                    },
                    onHoldEnter: function () {
                        entity.sprite.setAnimation('down');
                    },
                    onHoldLeave: function () {
                        entity.sprite.setAnimation('default');
                    },
                    pointerUp: function () {
                        entity.sprite.setAnimation('default');
                    },
                    onHoldEnd: function () {
                        if (settings.onClick) {
                            settings.onClick();
                        }
                    }
                },
                init: function () {}
            });
        return entity;
    };
});