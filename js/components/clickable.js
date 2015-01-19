bento.define('bento/components/clickable', [
    'bento/utils',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Utils, Vector2, EventSystem) {
    'use strict';
    return function (base, settings) {
        var mixin = {},
            component = {
                name: 'clickable',
                pointerDown: function (evt) {},
                pointerUp: function (evt) {},
                pointerMove: function (evt) {},
                destroy: function () {
                    EventSystem.removeEventListener('pointerDown', component.pointerDown);
                    EventSystem.removeEventListener('pointerUp', component.pointerUp);
                    EventSystem.removeEventListener('pointerMove', component.pointerMove);
                }
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
        Utils.extend(base, mixin);
        return base;
    };
});