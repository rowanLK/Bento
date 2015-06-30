bento.define('bento/gui/clickbutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/utils',
    'bento/tween',
    'bento/eventsystem'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    Utils,
    Tween,
    EventSystem
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport(),
            active = true,
            entitySettings = Utils.extend({
                z: 0,
                name: '',
                originRelative: Vector2(0.5, 0.5),
                position: Vector2(0, 0),
                components: [Sprite, Clickable],
                family: ['buttons'],
                sprite: {
                    image: settings.image,
                    frameWidth: settings.frameWidth || 32,
                    frameHeight: settings.frameHeight || 32,
                    animations: settings.animations || {
                        'up': {
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
                        entity.sprite.setAnimation('up');
                    },
                    pointerUp: function () {
                        entity.sprite.setAnimation('up');
                    },
                    onHoldEnd: function () {
                        if (active && settings.onClick) {
                            settings.onClick.apply(entity);
                            if (settings.sfx) {
                                Bento.audio.stopSound(settings.sfx);
                                Bento.audio.playSound(settings.sfx);
                            }
                            EventSystem.fire('clickButton', entity);
                        }
                    }
                },
                init: function () {
                    this.sprite.setAnimation('up');
                }
            }, settings),
            entity = Entity(entitySettings).extend({
                setActive: function (bool) {
                    active = bool;
                },
                doCallback: function () {
                    settings.onClick.apply(entity);
                }
            });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }

        return entity;
    };
});