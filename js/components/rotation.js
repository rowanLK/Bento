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
    var Rotation = function (settings) {
        settings = settings || {};
        this.name = 'rotation';
        this.entity = null;
    };

    Rotation.prototype.draw = function (data) {
        data.renderer.save();
        data.renderer.rotate(data.entity.rotation);
    };
    Rotation.prototype.postDraw = function (data) {
        data.renderer.restore();
    };
    Rotation.prototype.attached = function (data) {
        this.entity = data.entity;
    };

    // old angle functions
    Rotation.prototype.addAngleDegree = function (value) {
        this.entity.rotation += value * Math.PI / 180;
    };
    Rotation.prototype.addAngleRadian = function (value) {
        this.entity.rotation += value;
    };
    Rotation.prototype.setAngleDegree = function (value) {
        this.entity.rotation = value * Math.PI / 180;
    };
    Rotation.prototype.setAngleRadian = function (value) {
        this.entity.rotation = value;
    };
    Rotation.prototype.getAngleDegree = function () {
        return this.entity.rotation * 180 / Math.PI;
    };
    Rotation.prototype.getAngleRadian = function () {
        return this.entity.rotation;
    };
    Rotation.prototype.toString = function () {
        return '[object Rotation]';
    };

    return Rotation;
});