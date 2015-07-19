/**
 * Component that sets the rotation
 * <br>Exports: Function
 * @module bento/components/rotation
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/rotation', [
    'bento/utils',
], function (Utils) {
    'use strict';
    return function (entity) {
        var angle,
            mixin = {},
            component = {
                name: 'rotation',
                draw: function (data) {
                    if (angle) {
                        data.renderer.rotate(angle);
                    }
                },
                postDraw: function (data) {
                },
                addAngleDegree: function (value) {
                    if (!angle) {
                        angle = 0;
                    }
                    angle += value * Math.PI / 180;
                },
                addAngleRadian: function (value) {
                    if (!angle) {
                        angle = 0;
                    }
                    angle += value;
                },
                setAngleDegree: function (value) {
                    angle = value * Math.PI / 180;
                },
                setAngleRadian: function (value) {
                    angle = value;
                },
                getAngleDegree: function () {
                    if (!angle) {
                        return 0;
                    }
                    return angle * 180 / Math.PI;
                },
                getAngleRadian: function () {
                    if (!angle) {
                        return 0;
                    }
                    return angle;
                }
            };
        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});