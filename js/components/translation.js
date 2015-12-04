/**
 * Component that translates the entity visually
 * <br>Exports: Function
 * @module bento/components/translation
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/translation', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    var Translation = function (settings) {
        settings = settings || {};
        this.name = 'translation';
        this.subPixel = settings.subPixel || false;
        this.entity = null;
        this.x = 0;
        this.y = 0;
    };
    Translation.prototype.draw = function (data) {
        var entity = data.entity,
            parent = entity.parent,
            position = entity.position,
            origin = entity.origin,
            scroll = data.viewport;

        data.renderer.save();
        if (this.subPixel) {
            data.renderer.translate(entity.position.x + this.x, entity.position.y + this.y);
        } else {
            data.renderer.translate(Math.round(entity.position.x + this.x), Math.round(entity.position.y + this.y));
        }
        // scroll (only applies to parent objects)
        if (!parent && !entity.float) {
            data.renderer.translate(-scroll.x, -scroll.y);
        }
    };
    Translation.prototype.postDraw = function (data) {
        data.renderer.restore();
    };
    Translation.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    Translation.prototype.toString = function () {
        return '[object Translation]';
    };

    return Translation;
});