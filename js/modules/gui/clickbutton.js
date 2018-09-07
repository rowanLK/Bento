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
 * @param {Boolean} [settings.sort] - Callbacks are executed first if the component/entity is visually on top. Other ClickButtons must also have "sort" to true.
 * @module bento/gui/clickbutton
 * @moduleName ClickButton
 * @returns Entity
 * @snippet ClickButton|constructor
ClickButton({
    z: ${1:0},
    name: '$2',
    sfx: '$3',
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:3},
    position: new Vector2(${7:0}, ${8:0}),
    updateWhenPaused: ${9:0},
    float: ${10:false},
    onButtonDown: function () {},
    onButtonUp: function () {},
    onClick: function () {
        $11
    }
});
 */
bento.define('bento/gui/clickbutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/nineslice',
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
    NineSlice,
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
        var defaultAnimations = {
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
        };
        if (settings.frameCountX * settings.frameCountY <= 2) {
            defaultAnimations.inactive.frames = [0];
        }
        if (settings.frameCountX * settings.frameCountY <= 1) {
            defaultAnimations.down.frames = [0];
        }
        var animations = settings.animations || defaultAnimations;
        var nsSettings = settings.nineSliceSettings || null;
        var nineSlice = !nsSettings ? null : new NineSlice({
            image: settings.image,
            imageName: settings.imageName,
            originRelative: settings.originRelative || new Vector2(0.5, 0.5),
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            width: nsSettings.width,
            height: nsSettings.height,
            animations: animations
        });
        var sprite = nineSlice ? null : settings.sprite || new Sprite({
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
        var visualComponent = nineSlice || sprite;
        // workaround for pointerUp/onHoldEnd order of events
        var wasHoldingThis = false;
        var clickable = new Clickable({
            sort: settings.sort,
            ignorePauseDuringPointerUpEvent: settings.ignorePauseDuringPointerUpEvent,
            onClick: function (data) {
                wasHoldingThis = false;
                if (!active || ClickButton.currentlyPressing) {
                    return;
                }
                ClickButton.currentlyPressing = entity;
                setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onClick',
                    data: data
                });
            },
            onHoldEnter: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onHoldEnter',
                    data: data
                });
            },
            onHoldLeave: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'onHoldLeave',
                    data: data
                });
            },
            pointerUp: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'pointerUp',
                    data: data
                });
                if (ClickButton.currentlyPressing === entity) {
                    wasHoldingThis = true;
                    ClickButton.currentlyPressing = null;
                }
            },
            onHoldEnd: function (data) {
                if (active && settings.onClick && (ClickButton.currentlyPressing === entity || wasHoldingThis)) {
                    wasHoldingThis = false;
                    settings.onClick.apply(entity, [data]);
                    if (settings.sfx) {
                        Bento.audio.stopSound(settings.sfx);
                        Bento.audio.playSound(settings.sfx);
                    }
                    EventSystem.fire('clickButton-onClick', {
                        entity: entity,
                        event: 'onHoldEnd',
                        data: data
                    });
                }
                if (ClickButton.currentlyPressing === entity) {
                    ClickButton.currentlyPressing = null;
                }
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
            position: new Vector2(0, 0),
            family: ['buttons'],
            init: function () {
                setActive(active);
            }
        }, settings, true);

        // merge components array
        entitySettings.components = [
            visualComponent,
            clickable
        ].concat(settings.components || []);

        var setActive = function (bool) {
            active = bool;

            animations = visualComponent.animations || animations;

            if (!active) {
                if (ClickButton.currentlyPressing === entity) {
                    ClickButton.currentlyPressing = null;
                }
                if (animations.inactive) {
                    setAnimation('inactive');
                } else {
                    setAnimation('up');
                }
            } else {
                setAnimation('up');
            }
        };

        var setAnimation = function (animation) {
            visualComponent.setAnimation(animation);
        };

        var entity = new Entity(entitySettings).extend({
            /**
             * Activates or deactives the button. Deactivated buttons cannot be pressed.
             * @function
             * @param {Bool} active - Should be active or not
             * @instance
             * @name setActive
             * @snippet #ClickButton.setActive|snippet
            setActive(${1:true});
             */
            setActive: setActive,
            /**
             * Performs the callback as if the button was clicked
             * @function
             * @instance
             * @name doCallback
             * @snippet #ClickButton.doCallback|snippet
            doCallback();
             */
            doCallback: function () {
                settings.onClick.apply(entity);
            },
            /**
             * Performs the callback as if the button was clicked, 
             * takes active state into account 
             * @function
             * @instance
             * @name mimicClick
             * @snippet #ClickButton.mimicClick|snippet
                mimicClick();
             */
            mimicClick: function () {
                if (active) {
                    wasHoldingThis = true;
                    clickable.callbacks.onHoldEnd({});
                    // settings.onClick.apply(entity);
                }
            },
            /**
             * Check if the button is active
             * @function
             * @instance
             * @name isActive
             * @returns {Bool} Whether the button is active
             * @snippet #ClickButton.isActive|Boolean
            isActive(${1:true});
             */
            isActive: function () {
                return active;
            },
            /**
             * Set the size of the clickbutton if it's using a nine slice
             * @function
             * @param {Number} width
             * @param {Number} height
             * @instance
             * @name setNineSliceSize
             */
            setNineSliceSize: function (width, height) {
                if (visualComponent.name !== 'nineslice') {
                    console.warn("LK_WARN: Don't use setNineSliceSize if the clickbutton uses a sprite.");
                    return;
                }
                nsSettings.width = width;
                nsSettings.height = height;
                visualComponent.width = width;
                visualComponent.height = height;
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

        /**
         * Active property
         * @instance
         * @function
         * @name active
         */
        Object.defineProperty(entity, 'active', {
            get: function () {
                return active;
            },
            set: setActive
        });

        return entity;
    };

    ClickButton.currentlyPressing = null;

    return ClickButton;
});