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
    var component = function (settings) {
            settings = settings || {};
            this.name = 'rotation';
            this.entity = null;
        };

    component.prototype.draw = function (data) {
        data.renderer.save();
        data.renderer.rotate(data.entity.rotation);
    };
    component.prototype.postDraw = function (data) {
        data.renderer.restore();
    };
    component.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    
    // old angle functions
    component.prototype.addAngleDegree = function (value) {
        this.entity.rotation += value * Math.PI / 180;
    },
    component.prototype.addAngleRadian = function (value) {
        this.entity.rotation += value;
    },
    component.prototype.setAngleDegree = function (value) {
        this.entity.rotation = value * Math.PI / 180;
    },
    component.prototype.setAngleRadian = function (value) {
        this.entity.rotation = value;
    },
    component.prototype.getAngleDegree = function () {
        return this.entity.rotation * 180 / Math.PI;
    },
    component.prototype.getAngleRadian = function () {
        return this.entity.rotation;
    }

    return component;
});