rice.define('rice/components/scale', [
    'rice/sugar',
    'rice/math/vector2'
], function (Sugar, Vector2) {
    'use strict';
    return function (base) {
        var set = false,
            scale = Vector2(1, 1),
            component = {
                name: 'scale',
                draw: function (data) {
                    if (set) {
                        data.context.scale(scale.x, scale.y);
                    }
                },
                setScale: function (vector) {
                    set = true;
                    scale = vector;
                },
                getScale: function () {
                    return scale;
                },
                setScaleX: function (value) {
                    set = true;
                    scale.x = value;
                },
                setScaleY: function (value) {
                    set = true;
                    scale.y = value;
                }
            };
        base.attach(component);
        Sugar.combine(base, {
            scale: component
        });
        return base;
    };
});