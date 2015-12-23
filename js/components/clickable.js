/**
 * Component that helps with detecting clicks on an entity. The component does not detect clicks when the game is paused
 * unless entity.updateWhenPaused is turned on.
 * <br>Exports: Constructor
 * @module bento/components/clickable
 * @param {Object} settings - Settings
 * @param {Function} settings.pointerDown - Called when pointer (touch or mouse) is down anywhere on the screen 
 * @param {Function} settings.pointerUp - Called when pointer is released anywhere on the screen 
 * @param {Function} settings.pointerMove - Called when pointer moves anywhere on the screen 
 * @param {Function} settings.onClick - Called when pointer taps on the parent entity 
 * @param {Function} settings.onClickUp - The pointer was released above the parent entity 
 * @param {Function} settings.onClickMiss - Pointer down but does not touches the parent entity 
 * @param {Function} settings.onHold - Called every update tick when the pointer is down on the entity
 * @param {Function} settings.onHoldLeave - Called when pointer leaves the entity
 * @param {Function} settings.onHoldEnter - Called when pointer enters the entity
 * @param {Function} settings.onHoverEnter - Called when mouse hovers over the entity (does not work with touch)
 * @param {Function} settings.onHoverLeave - Called when mouse stops hovering over the entity (does not work with touch)
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/clickable', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/matrix',
    'bento/eventsystem'
], function (Bento, Utils, Vector2, Matrix, EventSystem) {
    'use strict';
    var Clickable = function (settings) {
        var nothing = function () {};
        this.entity = null;
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
        this.hasTouched = false;
        /**
         * Id number of the pointer holding entity
         * @instance
         * @default null
         * @name holdId
         */
        this.holdId = null;
        this.isPointerDown = false;
        this.initialized = false;

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

    };

    Clickable.prototype.destroy = function () {
        EventSystem.removeEventListener('pointerDown', this.pointerDown, this);
        EventSystem.removeEventListener('pointerUp', this.pointerUp, this);
        EventSystem.removeEventListener('pointerMove', this.pointerMove, this);
        this.initialized = false;
    };
    Clickable.prototype.start = function () {
        if (this.initialized) {
            return;
        }
        EventSystem.addEventListener('pointerDown', this.pointerDown, this);
        EventSystem.addEventListener('pointerUp', this.pointerUp, this);
        EventSystem.addEventListener('pointerMove', this.pointerMove, this);
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
            worldPosition: evt.worldPosition.clone()
        };
    };
    Clickable.prototype.pointerDown = function (evt) {
        var e = this.transformEvent(evt);
        if (Bento.objects && Bento.objects.isPaused() && !this.entity.updateWhenPaused) {
            return;
        }
        this.isPointerDown = true;
        if (this.callbacks.pointerDown) {
            this.callbacks.pointerDown.call(this, e);
        }
        if (this.entity.getBoundingBox) {
            this.checkHovering(e, true);
        }
    };
    Clickable.prototype.pointerUp = function (evt) {
        var e = this.transformEvent(evt),
            mousePosition;
        if (Bento.objects && Bento.objects.isPaused() && !this.entity.updateWhenPaused) {
            return;
        }
        mousePosition = e.localPosition;
        this.isPointerDown = false;
        if (this.callbacks.pointerUp) {
            this.callbacks.pointerUp.call(this, e);
        }
        if (this.entity.getBoundingBox().hasPosition(mousePosition)) {
            this.callbacks.onClickUp.call(this, [e]);
            if (this.hasTouched && this.holdId === e.id) {
                this.holdId = null;
                this.callbacks.onHoldEnd.call(this, e);
            }
        }
        this.hasTouched = false;
    };
    Clickable.prototype.pointerMove = function (evt) {
        var e = this.transformEvent(evt);
        if (Bento.objects && Bento.objects.isPaused() && !this.entity.updateWhenPaused) {
            return;
        }
        if (this.callbacks.pointerMove) {
            this.callbacks.pointerMove.call(this, e);
        }
        // hovering?
        if (this.entity.getBoundingBox) {
            this.checkHovering(e);
        }
    };
    Clickable.prototype.checkHovering = function (evt, clicked) {
        var mousePosition = evt.localPosition;
        if (this.entity.getBoundingBox().hasPosition(mousePosition)) {
            if (this.hasTouched && !this.isHovering && this.holdId === evt.id) {
                this.callbacks.onHoldEnter.call(this, evt);
            }
            if (!this.isHovering) {
                this.callbacks.onHoverEnter.call(this, evt);
            }
            this.isHovering = true;
            if (clicked) {
                this.hasTouched = true;
                this.holdId = evt.id;
                this.callbacks.onClick.call(this, evt);
            }
        } else {
            if (this.hasTouched && this.isHovering && this.holdId === evt.id) {
                this.callbacks.onHoldLeave.call(this, evt);
            }
            if (this.isHovering) {
                this.callbacks.onHoverLeave.call(this, evt);
            }
            this.isHovering = false;
            if (clicked) {
                this.callbacks.onClickMiss.call(this, evt);
            }
        }
    };
    // TODO: does not work with floating entities
    Clickable.prototype.transformEvent = function (evt) {
        var positionVector,
            translateMatrix = new Matrix(3, 3),
            scaleMatrix = new Matrix(3, 3),
            rotateMatrix = new Matrix(3, 3),
            sin,
            cos,
            type,
            position,
            parent,
            parents = [],
            i;

        // no parents
        if (!this.entity.parent) {
            if (!this.entity.float) {
                evt.localPosition = evt.worldPosition.clone();
            } else {
                evt.localPosition = evt.position.clone();
            }
            return evt;
        }
        // make a copy
        evt = this.cloneEvent(evt);
        if (this.entity.float) {
            positionVector = evt.localPosition.toMatrix();
        } else {
            positionVector = evt.worldPosition.toMatrix();
        }

        // get all parents
        parent = this.entity;
        while (parent.parent) {
            parent = parent.parent;
            parents.unshift(parent);
        }

        /**
         * reverse transform the event position vector
         */
        for (i = 0; i < parents.length; ++i) {
            parent = parents[i];

            // construct a translation matrix and apply to position vector
            if (parent.position) {
                position = parent.position;
                translateMatrix.set(2, 0, -position.x);
                translateMatrix.set(2, 1, -position.y);
                positionVector.multiplyWith(translateMatrix);
            }
            // only scale/rotatable if there is a component
            if (parent.rotation) {
                // construct a rotation matrix and apply to position vector
                sin = Math.sin(-parent.rotation);
                cos = Math.cos(-parent.rotation);
                rotateMatrix.set(0, 0, cos);
                rotateMatrix.set(1, 0, -sin);
                rotateMatrix.set(0, 1, sin);
                rotateMatrix.set(1, 1, cos);
                positionVector.multiplyWith(rotateMatrix);
            }
            if (parent.scale) {
                // construct a scaling matrix and apply to position vector
                scaleMatrix.set(0, 0, 1 / parent.scale.x);
                scaleMatrix.set(1, 1, 1 / parent.scale.y);
                positionVector.multiplyWith(scaleMatrix);
            }
        }
        evt.localPosition.x = positionVector.get(0, 0);
        evt.localPosition.y = positionVector.get(0, 1);

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