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
    return function (entity) {
        var set = false,
            mixin = {},
            subPixel = false,
            component = {
                name: 'translation',
                setSubPixel: function (bool) {
                    subPixel = bool;
                },
                draw: function (data) {
                    var parent = entity.parent,
                        position = entity.position,
                        origin = entity.origin,
                        scroll = data.viewport;
                    data.renderer.save();
                    if (subPixel) {
                        data.renderer.translate(position.x, position.y);
                    } else {
                        data.renderer.translate(Math.round(position.x), Math.round(position.y));
                    }
                    // scroll (only applies to parent objects)
                    if (!parent && !entity.float) {
                        data.renderer.translate(Math.round(-scroll.x), Math.round(-scroll.y));
                    }
                },
                postDraw: function (data) {
                    data.renderer.restore();
                }
            };
        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});