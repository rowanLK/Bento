rice.define('rice/components/rotation', [
    'rice/sugar',
], function (Sugar) {
    'use strict';
    return function (base) {
        var angle = 0,
            component = {
                name: 'rotation',
                draw: function (data) {
                    data.context.rotate(angle);
                },
                postDraw: function (data) {
                    data.context.rotate(angle);
                },
                setAngleDegree: function (value) {
                    angle = value * Math.PI / 180;
                },
                setAngleRadian: function (value) {
                    angle = value;
                },
                getAngleDegree: function () {
                    return angle * 180 / Math.PI;
                },
                getAngleRadian: function () {
                    return angle;
                }
            };
        base.attach(component);
        Sugar.combine(base, {
            rotation: component
        });
        return base;
    };
});