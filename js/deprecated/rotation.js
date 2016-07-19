/*
 * Component that sets the context rotation for drawing.
 * <br>Exports: Constructor
 * @module bento/components/rotation
 * @param {Object} settings - Settings (unused)
 * @returns Returns a component object.
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
        // data.renderer.save();
        // data.renderer.rotate(data.entity.rotation);
    };
    Rotation.prototype.postDraw = function (data) {
        // data.renderer.restore();
    };
    Rotation.prototype.attached = function (data) {
        this.entity = data.entity;
    };

    /*
     * Rotates the parent entity in degrees
     * @function
     * @param {Number} degrees - Angle in degrees
     * @instance
     * @name addAngleDegree
     */
    Rotation.prototype.addAngleDegree = function (value) {
        this.entity.rotation += value * Math.PI / 180;
    };
    /*
     * Rotates the parent entity in radians
     * @function
     * @param {Number} radians - Angle in radians
     * @instance
     * @name addAngleRadian
     */
    Rotation.prototype.addAngleRadian = function (value) {
        this.entity.rotation += value;
    };
    /*
     * Rotates the parent entity in degrees
     * @function
     * @param {Number} degrees - Angle in degrees
     * @instance
     * @name setAngleDegree
     */
    Rotation.prototype.setAngleDegree = function (value) {
        this.entity.rotation = value * Math.PI / 180;
    };
    /*
     * Rotates the parent entity in radians
     * @function
     * @param {Number} radians - Angle in radians
     * @instance
     * @name setAngleRadian
     */
    Rotation.prototype.setAngleRadian = function (value) {
        this.entity.rotation = value;
    };
    /*
     * Returns the parent entity rotation in degrees
     * @function
     * @instance
     * @name getAngleDegree
     */
    Rotation.prototype.getAngleDegree = function () {
        return this.entity.rotation * 180 / Math.PI;
    };
    /*
     * Returns the parent entity rotation in radians
     * @function
     * @instance
     * @name getAngleRadian
     */
    Rotation.prototype.getAngleRadian = function () {
        return this.entity.rotation;
    };
    Rotation.prototype.toString = function () {
        return '[object Rotation]';
    };

    return Rotation;
});