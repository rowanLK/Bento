/**
 * An entity that behaves like a toggle button.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, can include Entity settings
 * @param {Sprite} settings.sprite - Same as clickbutton! See @link module:bento/gui/clickbutton}
 * @param {Bool} settings.active - Whether the button starts in the active state (default: true)
 * @param {Bool} settings.toggled - Initial toggle state (default: false)
 * @param {String} settings.onToggle - Callback when user clicks on the toggle ("this" refers to the clickbutton entity).
 * @param {String} [settings.sfx] - Plays sound when pressed
 * @module bento/gui/togglebutton
 * @moduleName ToggleButton
 * @returns Entity
 * @snippet ToggleButton|constructor
ToggleButton({
    z: ${1:0},
    name: '$2',
    sfx: '$3',
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:3},
    position: new Vector2(${7:0}, ${8:0}),
    updateWhenPaused: ${9:0},
    float: ${10:false},
    onToggle: function () {
        ${11}
    }
});
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
        var viewport = Bento.getViewport();
        var active = true;
        var toggled = false;
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
            originRelative: settings.originRelative || new Vector2(0.5, 0.5),
            padding: settings.padding,
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            animations: animations
        });
        var clickable = new Clickable({
            sort: settings.sort,
            ignorePauseDuringPointerUpEvent: settings.ignorePauseDuringPointerUpEvent,
            onClick: function (data) {
                if (!active) {
                    return;
                }
                /**
                 * Fired by any ToggleButton's button down
                 * @event toggleButton-toggle-down
                 * @param {Object} data - Data object
                 * @param {Entity} data.entity - ToggleButton instance
                 * @param {String} data.event - Origin of Clickable event
                 * @param {Object} data.data - data of Clickable event
                 */
                sprite.setAnimation('down');
                EventSystem.fire('toggleButton-toggle-down', {
                    entity: entity,
                    event: 'onClick',
                    data: data
                });
            },
            onHoldEnter: function (data) {
                if (!active) {
                    return;
                }
                sprite.setAnimation('down');
                EventSystem.fire('toggleButton-toggle-down', {
                    entity: entity,
                    event: 'onHoldEnter',
                    data: data
                });
            },
            onHoldLeave: function (data) {
                if (!active) {
                    return;
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
                /**
                 * Fired by any ToggleButton's button up
                 * @event toggleButton-toggle-up
                 * @param {Object} data - Data object
                 * @param {Entity} data.entity - ToggleButton instance
                 * @param {String} data.event - Origin of Clickable event
                 * @param {Object} data.data - data of Clickable event
                 */
                EventSystem.fire('toggleButton-toggle-' + (toggled ? 'down' : 'up'), {
                    entity: entity,
                    event: 'onHoldLeave',
                    data: data
                });
            },
            pointerUp: function (data) {
                if (!active) {
                    return;
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
                EventSystem.fire('toggleButton-toggle-' + (toggled ? 'down' : 'up'), {
                    entity: entity,
                    event: 'pointerUp',
                    data: data
                });
            },
            onHoldEnd: function (data) {
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
                /**
                 * Fired by any ToggleButton's toggle
                 * @event toggleButton-onToggle
                 * @param {Object} data - Data object
                 * @param {Entity} data.entity - ToggleButton instance
                 * @param {String} data.event - Origin of Clickable event
                 * @param {Object} data.data - data of Clickable event
                 */
                EventSystem.fire('toggleButton-onToggle', {
                    entity: entity,
                    event: 'onHoldEnd',
                    data: data
                });
            }
        });
        var entitySettings = Utils.extend({
            z: 0,
            name: 'toggleButton',
            position: new Vector2(0, 0),
            family: ['buttons']
        }, settings);

        // merge components array
        entitySettings.components = [
            sprite,
            clickable
        ].concat(settings.components || []);

        var entity = new Entity(entitySettings).extend({
            /**
             * Check if the button is toggled
             * @function
             * @instance
             * @name isToggled
             * @snippet #ToggleButton.isToggled|Boolean
                isToggled();
             * @returns {Bool} Whether the button is toggled
             */
            isToggled: function () {
                return toggled;
            },
            /**
             * Toggles the button programatically
             * @function
             * @param {Bool} state - Toggled or not
             * @param {Bool} doCallback - Perform the onToggle callback or not
             * @instance
             * @name toggle
             * @snippet #ToggleButton.toggle|snippet
                toggle(${1:true});
             * @snippet #ToggleButton.toggle|do callback
                toggle(${1:true}, true);
             */
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
            /**
             * Activates or deactives the button. Deactivated buttons cannot be pressed.
             * @function
             * @param {Bool} active - Should be active or not
             * @instance
             * @name setActive
             * @snippet #ToggleButton.setActive|snippet
                setActive(${1:true});
             */
            setActive: function (bool) {
                active = bool;
                if (!active && animations.inactive) {
                    sprite.setAnimation('inactive');
                } else {
                    sprite.setAnimation(toggled ? 'down' : 'up');
                }
            },
            /**
             * Performs the onClick callback, ignores active state
             * @function
             * @instance
             * @name doCallback
             * @snippet #ToggleButton.doCallback|snippet
                doCallback();
             */
            doCallback: function () {
                settings.onToggle.apply(entity);
            },
            /**
             * Performs the callback as if the button was clicked, 
             * takes active state into account 
             * @function
             * @instance
             * @name mimicClick
             * @snippet #ToggleButton.mimicClick|snippet
                mimicClick();
             */
            mimicClick: function () {
                if (active) {
                    entity.toggle(!toggled, true);
                }
            },

            /**
             * Check if the button is active
             * @function
             * @instance
             * @name isActive
             * @returns {Bool} Whether the button is active
             * @snippet #ToggleButton.isActive|Boolean
                isActive();
             */
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

        animations = sprite.animations || animations;
        if (!active && animations.inactive) {
            sprite.setAnimation('inactive');
        } else {
            sprite.setAnimation(toggled ? 'down' : 'up');
        }

        // events for the button becoming active
        entity.attach({
            name: 'attachComponent',
            start: function () {
                /**
                 * Fired by any ToggleButtons's start behavior
                 * @event toggleButton-start 
                 * @param {Object} data - Data object
                 * @param {Entity} data.entity - ToggleButton instance
                 */
                EventSystem.fire('toggleButton-start', {
                    entity: entity
                });
            },
            destroy: function () {
                /**
                 * Fired by any ToggleButtons's destroy behavior
                 * @event toggleButton-destroy 
                 * @param {Object} data - Data object
                 * @param {Entity} data.entity - ToggleButton instance
                 */
                EventSystem.fire('toggleButton-destroy', {
                    entity: entity
                });
            }
        });

        // active property
        Object.defineProperty(entity, 'active', {
            get: function () {
                return active;
            },
            set: entity.setActive
        });

        return entity;
    };
});