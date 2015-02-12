bento.define('clickbutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/animation',
    'bento/components/clickable',
    'bento/entity',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Translation,
    Rotation,
    Scale,
    Animation,
    Clickable,
    Entity,
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport(),
            entity = Entity({
                z: 0,
                name: '',
                originRelative: settings.originRelative || Vector2(0, 0),
                position: settings.position || Vector2(0, 0),
                components: [Translation, Rotation, Scale, Animation, Clickable],
                family: ['buttons'],
                animation: {
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
                        entity.animation.setAnimation('down');
                    },
                    onHoldEnter: function () {
                        entity.animation.setAnimation('down');
                    },
                    onHoldLeave: function () {
                        entity.animation.setAnimation('default');
                    },
                    pointerUp: function () {
                        entity.animation.setAnimation('default');
                    },
                    onHoldEnd: function () {
                        if (settings.onClick) {
                            settings.onClick();
                        }
                    },
                    onHold: settings.onHold,
                    onHoverEnter: settings.onHoverEnter,
                    onHoverLeave: settings.onHoverLeave
                },
                init: function () {}
            });
        return entity;
    };
});