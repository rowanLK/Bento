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
                    checkHovering(evt.worldPosition, true);
                }
            },
            pointerUp = function (evt) {
                var mousePosition = evt.worldPosition;
                isPointerDown = false;
                if (component.pointerUp) {
                    component.pointerUp(evt);
                }
                if (entity.getBoundingBox().hasPosition(mousePosition)) {
                    component.onClickUp();
                    if (component.hasTouched) {
                        component.onHoldEnd();
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
                    checkHovering(evt.worldPosition);
                }
            },
            checkHovering = function (mousePosition, clicked) {
                // todo: convert world position to local position
                if (entity.getBoundingBox().hasPosition(mousePosition)) {
                    if (component.hasTouched && !component.isHovering) {
                        component.onHoldEnter();
                    }
                    if (!component.isHovering) {
                        component.onHoverEnter();
                    }
                    component.isHovering = true;
                    if (clicked) {
                        component.hasTouched = true;
                        component.onClick();
                    }
                } else {
                    if (component.hasTouched && component.isHovering) {
                        component.onHoldLeave();
                    }
                    if (component.isHovering) {
                        component.onHoverLeave();
                    }
                    component.isHovering = false;
                    if (clicked) {
                        component.onClickMiss();                        
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