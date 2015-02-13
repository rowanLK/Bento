bento.define('bento/components/opacity', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    return function (entity) {
        var opacity = 1,
            set = false,
            oldOpacity = 1,
            mixin = {},
            component = {
                name: 'opacity',
                draw: function (data) {
                    if (set) {
                        oldOpacity = data.renderer.getOpacity();
                        data.renderer.setOpacity(opacity);
                    }
                },
                postDraw: function (data) {
                    data.renderer.setOpacity(oldOpacity);
                },
                setOpacity: function (value) {
                    set = true;
                    opacity = value;
                },
                getOpacity: function () {
                    return opacity;
                }
            };
        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});