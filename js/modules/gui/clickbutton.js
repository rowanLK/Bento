/**
 * An entity that behaves like a click button.
 * TODO: document settings parameter
 * <br>Exports: Constructor
 * @module bento/gui/clickbutton
 * @returns Entity
 */
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
            animations = settings.animations || {
                'up': {
                    speed: 0,
                    frames: [0]
                },
                'down': {
                    speed: 0,
                    frames: [1]
                },
                'inactive': {
                    speed: 0,
                    frames: [2]
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
            clickable = new Clickable({
                onClick: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('down');
                    if (settings.onButtonDown) {
                        settings.onButtonDown.apply(entity);
                    }
                },
                onHoldEnter: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('down');
                    if (settings.onButtonDown) {
                        settings.onButtonDown.apply(entity);
                    }
                },
                onHoldLeave: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('up');
                    if (settings.onButtonUp) {
                        settings.onButtonUp.apply(entity);
                    }
                },
                pointerUp: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('up');
                    if (settings.onButtonUp) {
                        settings.onButtonUp.apply(entity);
                    }
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
            }),
            entitySettings = Utils.extend({
                z: 0,
                name: '',
                originRelative: new Vector2(0.5, 0.5),
                position: new Vector2(0, 0),
                components: [
                    sprite,
                    clickable
                ],
                family: ['buttons'],
                init: function () {
                    if (!active && animations.inactive) {
                        sprite.animation.setAnimation('inactive');
                    } else {
                        sprite.animation.setAnimation('up');
                    }
                }
            }, settings),
            entity = new Entity(entitySettings).extend({
                setActive: function (bool) {
                    active = bool;
                    if (!active && animations.inactive) {
                        sprite.animation.setAnimation('inactive');
                    } else {
                        sprite.animation.setAnimation('up');
                    }
                },
                doCallback: function () {
                    settings.onClick.apply(entity);
                },
                isActive: function () {
                    return active;
                }
            });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }

        // keep track of clickbuttons on tvOS
        if (window.ejecta)
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