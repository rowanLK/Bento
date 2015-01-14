rice.define('rice/components/fill', [
    'rice/sugar',
    'rice/game'
], function (Sugar, Game) {
    'use strict';
    return function (base, settings) {
        var viewport = Game.getViewport(),
            mixin = {},
            color = '#000',
            component = {
                name: 'fill',
                draw: function (data) {
                    data.renderer.fillRect(color, 0, 0, viewport.width, viewport.height);
                },
                setup: function (settings) {
                    color = settings.color;
                }
            };

        if (settings && settings[component.name]) {
            component.setup(settings[component.name]);
        }

        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});