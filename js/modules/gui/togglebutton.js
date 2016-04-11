/**
 * An entity that behaves like a toggle button.
 * TODO: document settings parameter
 * <br>Exports: Constructor
 * @module bento/gui/togglebutton
 * @returns Entity
 */
bento.define('bento/gui/togglebutton', [
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
            active = true,
            toggled = false,
            sprite = new Sprite({
                image: settings.image,
                frameWidth: settings.frameWidth,
                frameHeight: settings.frameHeight,
                frameCountX: settings.frameCountX,
                frameCountY: settings.frameCountY,
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
            }),
            entitySettings = Utils.extend({
                z: 0,
                name: '',
                originRelative: new Vector2(0.5, 0.5),
                position: new Vector2(0, 0),
                components: [
                    sprite,
                    new Clickable({
                        onClick: function () {
                            sprite.animation.setAnimation('down');
                        },
                        onHoldEnter: function () {
                            sprite.animation.setAnimation('down');
                        },
                        onHoldLeave: function () {
                            sprite.animation.setAnimation(toggled ? 'down' : 'up');
                        },
                        pointerUp: function () {
                            sprite.animation.setAnimation(toggled ? 'down' : 'up');
                        },
                        onHoldEnd: function () {
                            if (!active) {
                                return;
                            }
                            if (toggled) {
                                toggled = false;
                            } else {
                                toggled = true;
                            }
                            if (settings.onToggle) {
                                settings.onToggle.apply(entity);
                                if (settings.sfx) {
                                    Bento.audio.stopSound(settings.sfx);
                                    Bento.audio.playSound(settings.sfx);
                                }
                            }
                            sprite.animation.setAnimation(toggled ? 'down' : 'up');
                        }
                    })
                ],
                family: ['buttons'],
                init: function () {}
            }, settings),
            entity = new Entity(entitySettings).extend({
                isToggled: function () {
                    return toggled;
                },
                toggle: function (state, doCallback) {
                    if (Utils.isDefined(state)) {
                        toggled = state;
                    } else {
                        toggled = !toggled;
                    }
                    if (doCallback) {
                        if (settings.onToggle) {
                            settings.onToggle.apply(entity);
                            if (settings.sfx) {
                                Bento.audio.stopSound(settings.sfx);
                                Bento.audio.playSound(settings.sfx);
                            }
                        }
                    }
                    sprite.animation.setAnimation(toggled ? 'down' : 'up');
                }
            });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }
        // set intial state
        if (settings.toggled) {
            toggled = true;
        }
        sprite.animation.setAnimation(toggled ? 'down' : 'up');
        return entity;
    };
});