/**
 * Component that helps with detecting clicks on an entity. The component does not detect clicks when the game is paused
 * unless entity.updateWhenPaused is turned on.
 * <br>Exports: Constructor
 * @module bento/components/clickable
 * @moduleName Clickable
 * @param {Object} settings - Settings
 * @param {InputCallback} settings.pointerDown - Called when pointer (touch or mouse) is down anywhere on the screen
 * @param {InputCallback} settings.pointerUp - Called when pointer is released anywhere on the screen
 * @param {InputCallback} settings.pointerMove - Called when pointer moves anywhere on the screen
 * @param {InputCallback} settings.onClick - Called when pointer taps on the parent entity
 * @param {InputCallback} settings.onClickUp - The pointer was released above the parent entity
 * @param {InputCallback} settings.onClickMiss - Pointer down but does not touches the parent entity
 * @param {Function} settings.onHold - Called every update tick when the pointer is down on the entity
 * @param {InputCallback} settings.onHoldLeave - Called when pointer leaves the entity
 * @param {InputCallback} settings.onHoldEnter - Called when pointer enters the entity
 * @param {InputCallback} settings.onHoverEnter - Called when mouse hovers over the entity (does not work with touch)
 * @param {InputCallback} settings.onHoverLeave - Called when mouse stops hovering over the entity (does not work with touch)
 * @param {Boolean} settings.sort - Clickable callbacks are executed first if the component/entity is visually on top.
 Other clickables must also have "sort" to true. Otherwise, clickables are executed on creation order.
 * @returns Returns a component object to be attached to an entity.
 */
/**
 * Callback when input changed. The event data is an object that is passed by a source (usually the browser). 
 * The input manager injects some extra info useful for the game.
 *
 * @callback InputCallback
 * @param {Object} evt - Event data object coming from the source
 * @param {Number} evt.id - Touch id (-1 for mouse). Note that touch id can be different for each browser!
 * @param {Vector2} evt.position - position as reported by the source
 * @param {Vector2} evt.worldPosition - position in the world (includes any scrolling)
 * @param {Vector2} evt.localPosition - position relative to the parent entity
 * @param {Vector2} evt.diffPosition - Only when touch ends. Difference position between where the touch started.
 * @param {Vector2} evt.diffWorldPosition - Only when touch ends. Difference position between where the touch started.
 * @param {Vector2} evt.diffLocalPosition - Only when touch ends. Difference position between where the touch started.
 */
bento.define('bento/components/clickable', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/transformmatrix',
    'bento/eventsystem',
    'bento/sortedeventsystem'
], function (
    Bento,
    Utils,
    Vector2,
    Matrix,
    EventSystem,
    SortedEventSystem
) {
    'use strict';

    var clickables = [];
    var isPaused = function (entity) {
        var rootPause = 0;
        if (!Bento.objects || !entity) {
            return false;
        }
        rootPause = entity.updateWhenPaused;
        // find root parent
        while (entity.parent) {
            entity = entity.parent;
            rootPause = entity.updateWhenPaused;
        }

        return rootPause < Bento.objects.isPaused();
    };

    var Clickable = function (settings) {
        if (!(this instanceof Clickable)) {
            return new Clickable(settings);
        }
        var nothing = null;
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        /**
         * Name of the component
         * @instance
         * @default 'clickable'
         * @name name
         */
        this.name = 'clickable';
        /**
         * Whether the pointer is over the entity
         * @instance
         * @default false
         * @name isHovering
         */
        this.isHovering = false;
        /**
         * Ignore the pause during pointerUp event. If false, the pointerUp event will not be called if the parent entity is paused.
         * This can have a negative side effect in some cases: the pointerUp is never called and your code might be waiting for that.
         * Just make sure you know what you are doing!
         * @instance
         * @default true
         * @name ignorePauseDuringPointerUpEvent
         */
        this.ignorePauseDuringPointerUpEvent = (settings && Utils.isDefined(settings.ignorePauseDuringPointerUpEvent)) ?
            settings.ignorePauseDuringPointerUpEvent : true;
        /**
         * Id number of the pointer holding entity
         * @instance
         * @default null
         * @name holdId
         */
        this.holdId = null;
        this.isPointerDown = false;
        this.initialized = false;
        /**
         * Should the clickable care about (z)order of objects?
         * @instance
         * @default false
         * @name sort
         */
        this.sort = settings.sort || false;

        this.callbacks = {
            pointerDown: settings.pointerDown || nothing,
            pointerUp: settings.pointerUp || nothing,
            pointerMove: settings.pointerMove || nothing,
            // when clicking on the object
            onClick: settings.onClick || nothing,
            onClickUp: settings.onClickUp || nothing,
            onClickMiss: settings.onClickMiss || nothing,
            onHold: settings.onHold || nothing,
            onHoldLeave: settings.onHoldLeave || nothing,
            onHoldEnter: settings.onHoldEnter || nothing,
            onHoldEnd: settings.onHoldEnd || nothing,
            onHoverLeave: settings.onHoverLeave || nothing,
            onHoverEnter: settings.onHoverEnter || nothing
        };
        /**
         * Static array that holds a reference to all currently active Clickables
         * @type {Array}
         */
        this.clickables = clickables;
    };

    Clickable.prototype.destroy = function () {
        var index = clickables.indexOf(this),
            i = 0,
            len = 0;

        if (index > -1)
            clickables[index] = null;
        // clear the array if it consists of only null's
        for (i = 0, len = clickables.length; i < len; ++i) {
            if (clickables[i])
                break;
            if (i === len - 1)
                clickables.length = 0;
        }

        if (this.sort) {
            SortedEventSystem.off('pointerDown', this.pointerDown, this);
            SortedEventSystem.off('pointerUp', this.pointerUp, this);
            SortedEventSystem.off('pointerMove', this.pointerMove, this);
        } else {
            EventSystem.off('pointerDown', this.pointerDown, this);
            EventSystem.off('pointerUp', this.pointerUp, this);
            EventSystem.off('pointerMove', this.pointerMove, this);
        }
        this.initialized = false;
    };
    Clickable.prototype.start = function () {
        if (this.initialized) {
            return;
        }

        clickables.push(this);

        if (this.sort) {
            SortedEventSystem.on(this, 'pointerDown', this.pointerDown, this);
            SortedEventSystem.on(this, 'pointerUp', this.pointerUp, this);
            SortedEventSystem.on(this, 'pointerMove', this.pointerMove, this);
        } else {
            EventSystem.on('pointerDown', this.pointerDown, this);
            EventSystem.on('pointerUp', this.pointerUp, this);
            EventSystem.on('pointerMove', this.pointerMove, this);
        }
        this.initialized = true;
    };
    Clickable.prototype.update = function () {
        if (this.isHovering && this.isPointerDown && this.callbacks.onHold) {
            this.callbacks.onHold();
        }
    };
    Clickable.prototype.cloneEvent = function (evt) {
        return {
            id: evt.id,
            position: evt.position.clone(),
            eventType: evt.eventType,
            localPosition: evt.localPosition.clone(),
            worldPosition: evt.worldPosition.clone(),
            diffPosition: evt.diffPosition ? evt.diffPosition.clone() : undefined
        };
    };
    Clickable.prototype.pointerDown = function (evt) {
        var e;
        if (isPaused(this.entity)) {
            return;
        }
        e = this.transformEvent(evt);
        this.isPointerDown = true;
        if (this.callbacks.pointerDown) {
            this.callbacks.pointerDown.call(this, e);
        }
        if (this.entity.getBoundingBox) {
            this.checkHovering.call(this, e, true);
        }
    };
    Clickable.prototype.pointerUp = function (evt) {
        var e;
        var mousePosition;
        var callbacks = this.callbacks;

        // a pointer up could get missed during a pause
        if (!this.ignorePauseDuringPointerUpEvent && isPaused(this.entity)) {
            return;
        }
        e = this.transformEvent(evt);
        mousePosition = e.localPosition;
        this.isPointerDown = false;
        if (callbacks.pointerUp) {
            callbacks.pointerUp.call(this, e);
        }
        // onClickUp respects isPaused
        if (this.entity.getBoundingBox().hasPosition(mousePosition) && !isPaused(this.entity)) {
            if (callbacks.onClickUp) {
                callbacks.onClickUp.call(this, e);
            }
            if (this.holdId === e.id) {
                if (callbacks.onHoldEnd) {
                    callbacks.onHoldEnd.call(this, e);
                }
            }
        }
        this.holdId = null;
    };
    Clickable.prototype.pointerMove = function (evt) {
        var e; // don't calculate transformed event until last moment to save cpu
        var callbacks = this.callbacks;
        if (isPaused(this.entity)) {
            return;
        }
        if (callbacks.pointerMove) {
            if (!e) {
                e = this.transformEvent(evt);
            }
            callbacks.pointerMove.call(this, e);
        }
        // hovering?
        if (
            this.entity.getBoundingBox &&
            // only relevant if hover callbacks are implmented
            (callbacks.onHoldEnter || callbacks.onHoldLeave || callbacks.onHoverLeave)
        ) {
            if (!e) {
                e = this.transformEvent(evt);
            }
            this.checkHovering.call(this, e);
        }
    };
    Clickable.prototype.checkHovering = function (evt, clicked) {
        var mousePosition = evt.localPosition;
        var callbacks = this.callbacks;
        if (this.entity.getBoundingBox().hasPosition(mousePosition)) {
            if (!this.isHovering && this.holdId === evt.id) {
                if (callbacks.onHoldEnter) {
                    callbacks.onHoldEnter.call(this, evt);
                }
            }
            if (!this.isHovering && callbacks.onHoverEnter) {
                callbacks.onHoverEnter.call(this, evt);
            }
            this.isHovering = true;
            if (clicked) {
                this.holdId = evt.id;
                if (callbacks.onClick) {
                    callbacks.onClick.call(this, evt);
                }
            }
        } else {
            if (this.isHovering && this.holdId === evt.id) {
                if (callbacks.onHoldLeave) {
                    callbacks.onHoldLeave.call(this, evt);
                }
            }
            if (this.isHovering && callbacks.onHoverLeave) {
                callbacks.onHoverLeave.call(this, evt);
            }
            this.isHovering = false;
            if (clicked && callbacks.onClickMiss) {
                callbacks.onClickMiss.call(this, evt);
            }
        }
    };

    Clickable.prototype.transformEvent = function (evt) {
        evt.localPosition = this.entity.toComparablePosition(evt.worldPosition);
        return evt;
    };
    Clickable.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    Clickable.prototype.toString = function () {
        return '[object Clickable]';
    };

    return Clickable;
});