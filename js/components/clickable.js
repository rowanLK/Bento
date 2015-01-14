rice.define('rice/components/clickable', [
    'rice/sugar',
    'rice/math/vector2',
    'rice/eventsystem'
], function (Sugar, Vector2, EventSystem) {
    'use strict';
    return function (base, settings) {
        var mixin = {},
            component = {
                name: 'clickable',
                pointerDown: function (evt) {},
                pointerUp: function (evt) {},
                pointerMove: function (evt) {}
            };

        if (settings && settings[component.name]) {
            settings = settings[component.name];
            if (settings.pointerDown) {
                component.pointerDown = settings.pointerDown;
            }
            if (settings.pointerUp) {
                component.pointerUp = settings.pointerUp;
            }
            if (settings.pointerMove) {
                component.pointerMove = settings.pointerMove;
            }
        }
        EventSystem.addEventListener('pointerDown', component.pointerDown);
        EventSystem.addEventListener('pointerUp', component.pointerUp);
        EventSystem.addEventListener('pointerMove', component.pointerMove);

        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});