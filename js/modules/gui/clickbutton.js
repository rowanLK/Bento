/**
 * An entity that behaves like a click button.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, can include Entity settings
 * @param {Sprite} settings.sprite - Sprite component. The sprite should have an "up", "down" and an "inactive" animation. Alternatively, you can pass all Sprite settings. Then, by default "up" and "down" are assumed to be frames 0 and 1 respectively. Frame 3 is assumed to be "inactive", if it exists
 * @param {Function} settings.onClick - Callback when user clicks on the button ("this" refers to the clickbutton entity). Alternatively, you can listen to a "clickButton" event, the entity is passed as parameter.
 * @param {Bool} settings.active - Whether the button starts in the active state (default: true)
 * @param {String} [settings.sfx] - Plays sound when pressed
 * @param {Function} [settings.onButtonDown] - When the user holds the mouse or touches the button
 * @param {Function} [settings.onButtonUp] - When the user releases the mouse or stops touching the button
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
    var ClickButton = function (settings) {
        var viewport = Bento.getViewport();
        var active = true;
        var animations = settings.animations || {
            'up': {
                speed: 0,
                frames: [0]
            },
            'down': {
                speed: 0,
                frames: [1]
            }
        };
        var sprite = settings.sprite || new Sprite({
            image: settings.image,
            imageName: settings.imageName,
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            animations: animations
        });
        // workaround for pointerUp/onHoldEnd order of events
        var wasHoldingThis = false;
        var clickable = new Clickable({
            sort: settings.sort,
            onClick: function () {
                wasHoldingThis = false;
                if (!active || ClickButton.currentlyPressing) {
                    return;
                }
                ClickButton.currentlyPressing = entity;
                sprite.setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onClick'
                });
            },
            onHoldEnter: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onHoldEnter'
                });
            },
            onHoldLeave: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'onHoldLeave'
                });
            },
            pointerUp: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'pointerUp'
                });
                if (ClickButton.currentlyPressing === entity) {
                    wasHoldingThis = true;
                    ClickButton.currentlyPressing = null;
                }
            },
            onHoldEnd: function () {
                if (active && settings.onClick && (ClickButton.currentlyPressing === entity || wasHoldingThis)) {
                    wasHoldingThis = false;
                    settings.onClick.apply(entity);
                    if (settings.sfx) {
                        Bento.audio.stopSound(settings.sfx);
                        Bento.audio.playSound(settings.sfx);
                    }
                    EventSystem.fire('clickButton-onClick', {
                        entity: entity,
                        event: 'onHoldEnd'
                    });
                }
                ClickButton.currentlyPressing = null;
            },
            onClickMiss: function (data) {
                if (settings.onClickMiss) {
                    settings.onClickMiss(data);
                }
            }
        });
        var entitySettings = Utils.extend({
            z: 0,
            name: 'clickButton',
            originRelative: new Vector2(0.5, 0.5),
            position: new Vector2(0, 0),
            components: [
                sprite,
                clickable
            ],
            family: ['buttons'],
            init: function () {
                animations = sprite.animations || animations;
                if (!active && animations.inactive) {
                    sprite.setAnimation('inactive');
                } else {
                    sprite.setAnimation('up');
                }
            }
        }, settings);
        var entity = new Entity(entitySettings).extend({
            /**
             * Activates or deactives the button. Deactivated buttons cannot be pressed.
             * @function
             * @param {Bool} active - Should be active or not
             * @instance
             * @name setActive
             */
            setActive: function (bool) {
                active = bool;
                if (!active && animations.inactive) {
                    sprite.setAnimation('inactive');
                } else {
                    sprite.setAnimation('up');
                }
            },
            /**
             * Performs the callback as if the button was clicked
             * @function
             * @instance
             * @name doCallback
             */
            doCallback: function () {
                settings.onClick.apply(entity);
            },
            /**
             * Check if the button is active
             * @function
             * @instance
             * @name isActive
             * @returns {Bool} Whether the button is active
             */
            isActive: function () {
                return active;
            }
        });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }

        // events for the button becoming active
        entity.attach({
            name: 'attachComponent',
            start: function () {
                EventSystem.fire('clickButton-start', {
                    entity: entity
                });
            },
            destroy: function () {
                EventSystem.fire('clickButton-destroy', {
                    entity: entity
                });
                if (ClickButton.currentlyPressing === entity) {
                    ClickButton.currentlyPressing = null;
                }
            }
        });

        return entity;
    };

    ClickButton.currentlyPressing = null;

    return ClickButton;
});