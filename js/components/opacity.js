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
    var Opacity = function (settings) {
            settings = settings || {};
            this.name = 'opacity';
            this.oldOpacity = 1;
            this.opacity = 1;
            if (Utils.isDefined(settings.opacity)) {
                this.opacity = settings.opacity;
            }
        };
    Opacity.prototype.draw = function (data) {
        this.oldOpacity = data.renderer.getOpacity();
        data.renderer.setOpacity(this.opacity * this.oldOpacity);
    };
    Opacity.prototype.postDraw = function (data) {
        data.renderer.setOpacity(this.oldOpacity);
    };
    /**
     * Set entity opacity
     * @function
     * @instance
     * @param {Number} opacity - Opacity value
     * @name setOpacity
     */
    Opacity.prototype.setOpacity = function (value) {
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