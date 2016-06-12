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
            toggled = false,
            animations = settings.animations || {
                'up': {
                    speed: 0,
                    frames: [0]
                },
                'down': {
                    speed: 0,
                    frames: [1]
                }
            },
            sprite = new Sprite({
                image: settings.image,
                frameWidth: settings.frameWidth,
                frameHeight: settings.frameHeight,
                frameCountX: settings.frameCountX,
                frameCountY: settings.frameCountY,
                animations: animations
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
                            sprite.setAnimation('down');
                        },
                        onHoldEnter: function () {
                            sprite.setAnimation('down');
                        },
                        onHoldLeave: function () {
                            sprite.setAnimation(toggled ? 'down' : 'up');
                        },
                        pointerUp: function () {
                            sprite.setAnimation(toggled ? 'down' : 'up');
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
                            sprite.setAnimation(toggled ? 'down' : 'up');
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
                    sprite.setAnimation(toggled ? 'down' : 'up');
                },
                mimicClick: function () {
                    entity.getComponent('clickable').callbacks.onHoldEnd();
                },
                setActive: function (bool) {
                    active = bool;
                    if (!active && animations.inactive) {
                        sprite.setAnimation('inactive');
                    } else {
                        sprite.setAnimation(toggled ? 'down' : 'up');
                    }
                },
                doCallback: function () {
                    settings.onToggle.apply(entity);
                },
                isActive: function () {
                    return active;
                }
            });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }
        // set intial state
        if (settings.toggled) {
            toggled = true;
        }
        sprite.setAnimation(toggled ? 'down' : 'up');

        // keep track of togglebuttons on tvOS and Windows
        if (window.ejecta || window.Windows)
            entity.attach({
                start: function () {
                    EventSystem.fire('clickbuttonAdded', entity);
                },
                destroy: function () {
                    EventSystem.fire('clickbuttonRemoved', entity);
                }
            });

        return entity;
    };
});