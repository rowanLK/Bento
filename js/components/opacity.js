/**
 * Component that sets the opacity
 * <br>Exports: Constructor
 * @module bento/components/opacity
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @param {Number} settings.opacity - Opacity value (1 is opaque)
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/opacity', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    var oldOpacity = 1,
        Opacity = function (settings) {
            settings = settings || {};
            this.name = 'opacity';
            this.set = false;
            this.opacity = settings.opacity || 1;
        };
    Opacity.prototype.draw = function (data) {
        if (this.set) {
            oldOpacity = data.renderer.getOpacity();
            data.renderer.setOpacity(this.opacity);
        }
    };
    Opacity.prototype.postDraw = function (data) {
        data.renderer.setOpacity(oldOpacity);
    };
    /**
     * Set entity opacity
     * @function
     * @instance
     * @param {Number} opacity - Opacity value
     * @name setOpacity
     */
    Opacity.prototype.setOpacity = function (value) {
        this.set = true;
        this.opacity = value;
    };
    /**
     * Get entity opacity
     * @function
     * @instance
     * @name getOpacity
     */
    Opacity.prototype.getOpacity = function () {
        return this.opacity;
    };
    Opacity.prototype.toString = function () {
        return '[object Opacity]';
    };

    return Opacity;
});