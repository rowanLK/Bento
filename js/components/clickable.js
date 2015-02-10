bento.define('bento/components/clickable', [
    'bento/utils',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Utils, Vector2, EventSystem) {
    'use strict';
    return function (entity, settings) {
        var mixin = {},
            isPointerDown = false,
            component = {
                name: 'clickable',
                isHovering: false,
                hasTouched: false,
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
                destroy: function () {
                    EventSystem.removeEventListener('pointerDown', pointerDown);
                    EventSystem.removeEventListener('pointerUp', pointerUp);
                    EventSystem.removeEventListener('pointerMove', pointerMove);
                },
                init: function () {
                    EventSystem.addEventListener('pointerDown', pointerDown);
                    EventSystem.addEventListener('pointerUp', pointerUp);
                    EventSystem.addEventListener('pointerMove', pointerMove);
                },
                update: function () {
                    if (this.isHovering && isPointerDown && this.onHold) {
                        this.onHold();
                    }
                }
            },
            pointerDown = function (evt) {
                isPointerDown = true;
                if (component.pointerDown) {
                    component.pointerDown(evt);
                }
                if (entity.getBoundingBox) {
                    checkHovering(evt, true);
                }
            },
            pointerUp = function (evt) {
                var mousePosition = evt.worldPosition;
                isPointerDown = false;
                if (component.pointerUp) {
                    component.pointerUp(evt);
                }
                if (entity.getBoundingBox().hasPosition(mousePosition)) {
                    component.onClickUp(evt);
                    if (component.hasTouched && component.holdId === evt.id) {
                        component.holdId = null;
                        component.onHoldEnd(evt);
                    }
                }
                component.hasTouched = false;
            },
            pointerMove = function (evt) {
                if (component.pointerMove) {
                    component.pointerMove(evt);
                }
                // hovering?
                if (entity.getBoundingBox) {
                    checkHovering(evt);
                }
            },
            checkHovering = function (evt, clicked) {
                var mousePosition = evt.worldPosition;
                // todo: convert world position to local position
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