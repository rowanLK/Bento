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
    return function (entity, settings) {
        var mixin = {},
            isPointerDown = false,
            initialized = false,
            component = {
                /**
                 * Name of the component
                 * @instance
                 * @default 'clickable'
                 * @name name 
                 */
                name: 'clickable',
                /**
                 * Whether the pointer is over the entity
                 * @instance
                 * @default false
                 * @name isHovering
                 */
                isHovering: false,
                hasTouched: false,
                /**
                 * Id number of the pointer holding entity 
                 * @instance
                 * @default null
                 * @name holdId
                 */
                holdId: null,
                pointerDown: function (evt) {},
                pointerUp: function (evt) {},
                pointerMove: function (evt) {},
                // when clicking on the object
                onClick: function () {},
                onClickUp: function () {},
                onClickMiss: function () {},
                onHold: function () {},
                onHoldLeave: function () {},
                onHoldEnter: function () {},
                onHoldEnd: function () {},
                onHoverLeave: function () {},
                onHoverEnter: function () {},
                /**
                 * Destructs the component. Called by the entity holding the component.
                 * @function
                 * @instance
                 * @name destroy
                 */
                destroy: function () {
                    EventSystem.removeEventListener('pointerDown', pointerDown);
                    EventSystem.removeEventListener('pointerUp', pointerUp);
                    EventSystem.removeEventListener('pointerMove', pointerMove);
                    initialized = false;
                },
                /**
                 * Starts the component. Called by the entity holding the component.
                 * @function
                 * @instance
                 * @name start
                 */
                start: function () {
                    if (initialized) {
                        // TODO: this is caused by calling start when objects are attached, fix this later!
                        // console.log('warning: trying to init twice')
                        return;
                    }
                    EventSystem.addEventListener('pointerDown', pointerDown);
                    EventSystem.addEventListener('pointerUp', pointerUp);
                    EventSystem.addEventListener('pointerMove', pointerMove);
                    initialized = true;
                },
                /**
                 * Updates the component. Called by the entity holding the component every tick.
                 * @function
                 * @instance
                 * @param {Object} data - Game data object
                 * @name update
                 */
                update: function () {
                    if (this.isHovering && isPointerDown && this.onHold) {
                        this.onHold();
                    }
                }
            },
            cloneEvent = function (evt) {
                return {
                    id: evt.id,
                    position: evt.position.clone(),
                    eventType: evt.eventType,
                    localPosition: evt.localPosition.clone(),
                    worldPosition: evt.worldPosition.clone()
                };
            },
            pointerDown = function (evt) {
                var e = transformEvent(evt);
                if (Bento.objects && Bento.objects.isPaused() && !entity.updateWhenPaused) {
                    return;
                }
                isPointerDown = true;
                if (component.pointerDown) {
                    component.pointerDown(e);
                }
                if (entity.getBoundingBox) {
                    checkHovering(e, true);
                }
            },
            pointerUp = function (evt) {
                var e = transformEvent(evt),
                    mousePosition;
                if (Bento.objects && Bento.objects.isPaused() && !entity.updateWhenPaused) {
                    return;
                }
                mousePosition = e.localPosition;
                isPointerDown = false;
                if (component.pointerUp) {
                    component.pointerUp(e);
                }
                if (entity.getBoundingBox().hasPosition(mousePosition)) {
                    component.onClickUp(e);
                    if (component.hasTouched && component.holdId === e.id) {
                        component.holdId = null;
                        component.onHoldEnd(e);
                    }
                }
                component.hasTouched = false;
            },
            pointerMove = function (evt) {
                var e = transformEvent(evt);
                if (Bento.objects && Bento.objects.isPaused() && !entity.updateWhenPaused) {
                    return;
                }
                if (component.pointerMove) {
                    component.pointerMove(e);
                }
                // hovering?
                if (entity.getBoundingBox) {
                    checkHovering(e);
                }
            },
            checkHovering = function (evt, clicked) {
                var mousePosition = evt.localPosition;
                if (entity.getBoundingBox().hasPosition(mousePosition)) {
                    if (component.hasTouched && !component.isHovering && component.holdId === evt.id) {
                        component.onHoldEnter(evt);
                    }
                    if (!component.isHovering) {
                        component.onHoverEnter(evt);
                    }
                    component.isHovering = true;
                    if (clicked) {
                        component.hasTouched = true;
                        component.holdId = evt.id;
                        component.onClick(evt);
                    }
                } else {
                    if (component.hasTouched && component.isHovering && component.holdId === evt.id) {
                        component.onHoldLeave(evt);
                    }
                    if (component.isHovering) {
                        component.onHoverLeave(evt);
                    }
                    component.isHovering = false;
                    if (clicked) {
                        component.onClickMiss(evt);
                    }
                }
            },
            transformEvent = function (evt) {
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
                if (!entity.getParent || !entity.getParent()) {
                    if (!entity.float) {
                        evt.localPosition = evt.worldPosition.clone();
                    } else {
                        evt.localPosition = evt.position.clone();
                    }
                    return evt;
                }
                // make a copy
                evt = cloneEvent(evt);
                if (entity.float) {
                    positionVector = evt.localPosition.toMatrix();
                } else {
                    positionVector = evt.worldPosition.toMatrix();
                }

                // get all parents
                parent = entity;
                while (parent.getParent && parent.getParent()) {
                    parent = parent.getParent();
                    parents.unshift(parent);
                }

                /** 
                 * reverse transform the event position vector
                 */
                for (i = 0; i < parents.length; ++i) {
                    parent = parents[i];

                    // construct a translation matrix and apply to position vector
                    if (parent.getPosition) {
                        position = parent.getPosition();
                        translateMatrix.set(2, 0, -position.x);
                        translateMatrix.set(2, 1, -position.y);
                        positionVector.multiplyWith(translateMatrix);
                    }
                    // only scale/rotatable if there is a component
                    if (parent.rotation) {
                        // construct a rotation matrix and apply to position vector
                        sin = Math.sin(-parent.rotation.getAngleRadian());
                        cos = Math.cos(-parent.rotation.getAngleRadian());
                        rotateMatrix.set(0, 0, cos);
                        rotateMatrix.set(1, 0, -sin);
                        rotateMatrix.set(0, 1, sin);
                        rotateMatrix.set(1, 1, cos);
                        positionVector.multiplyWith(rotateMatrix);
                    }
                    if (parent.scale) {
                        // construct a scaling matrix and apply to position vector
                        scaleMatrix.set(0, 0, 1 / parent.scale.getScale().x);
                        scaleMatrix.set(1, 1, 1 / parent.scale.getScale().y);
                        positionVector.multiplyWith(scaleMatrix);
                    }
                }
                evt.localPosition.x = positionVector.get(0, 0);
                evt.localPosition.y = positionVector.get(0, 1);

                return evt;
            };

        if (settings && settings[component.name]) {
            settings = settings[component.name];
            Utils.extend(component, settings);
        }

        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});