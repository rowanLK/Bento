/**
 * Component that helps with detecting clicks on an entity
 * <br>Exports: Function
 * @module bento/components/clickable
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
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
            pointerDown: settings.pointerDown || function (evt) {},
            pointerUp: settings.pointerUp || function (evt) {},
            pointerMove: settings.pointerMove || function (evt) {},
            // when clicking on the object
            onClick: settings.onClick || function () {},
            onClickUp: settings.onClickUp || function () {},
            onClickMiss: settings.onClickMiss || function () {},
            onHold: settings.onHold || function () {},
            onHoldLeave: settings.onHoldLeave || function () {},
            onHoldEnter: settings.onHoldEnter || function () {},
            onHoldEnd: settings.onHoldEnd || function () {},
            onHoverLeave: settings.onHoverLeave || function () {},
            onHoverEnter: settings.onHoverEnter || function () {}
        };

    };

    /**
     * Destructs the component. Called by the entity holding the component.
     * @function
     * @instance
     * @name destroy
     */
    Clickable.prototype.destroy = function () {
        EventSystem.removeEventListener('pointerDown', this.pointerDown, this);
        EventSystem.removeEventListener('pointerUp', this.pointerUp, this);
        EventSystem.removeEventListener('pointerMove', this.pointerMove, this);
        this.initialized = false;
    };
    /**
     * Starts the component. Called by the entity holding the component.
     * @function
     * @instance
     * @name start
     */
    Clickable.prototype.start = function () {
        if (this.initialized) {
            // TODO: this is caused by calling start when objects are attached, fix this later!
            // console.log('warning: trying to init twice')
            return;
        }
        EventSystem.addEventListener('pointerDown', this.pointerDown, this);
        EventSystem.addEventListener('pointerUp', this.pointerUp, this);
        EventSystem.addEventListener('pointerMove', this.pointerMove, this);
        this.initialized = true;
    };
    /**
     * Updates the component. Called by the entity holding the component every tick.
     * @function
     * @instance
     * @param {Object} data - Game data object
     * @name update
     */
    Clickable.prototype.update = function () {
        if (this.isHovering && this.callbacks.isPointerDown && this.callbacks.onHold) {
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
                this.ocallbacks.onHoldEnter.call(this, evt);
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
    Clickable.prototype.transformEvent = function (evt) {
        var positionVector,
            translateMatrix = Matrix(3, 3),
            scaleMatrix = Matrix(3, 3),
            rotateMatrix = Matrix(3, 3),
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
    return Clickable;
});