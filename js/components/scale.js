rice.define('rice/components/scale', [
    'rice/sugar',
    'rice/math/vector2'
], function (Sugar, Vector2) {
    'use strict';
    return function (base) {
        var scale = Vector(1, 1),
            component = {
                name: 'scale',
                draw: function (data) {
                    data.context.scale(scale.x, scale.y);
                },
                setScale: function (vector) {
                    scale = vector;
                },
                getScale: function () {
                    return scale;
                }
            };
        base.attach(component);
        Sugar.combine(base, {
            scale: component
        });
        return base;
    };
});