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
                    var parent = entity.getParent(),
                        position = entity.getPosition(),
                        origin = entity.getOrigin(),
                        scroll = data.viewport;
                    data.renderer.save(entity);
                    if (subPixel) {
                        data.renderer.translate(position.x, position.y);
                    } else {
                        data.renderer.translate(Math.round(position.x), Math.round(position.y));                        
                    }

                    // scroll (only applies to parent objects)
                    if (parent === null && !entity.float) {
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