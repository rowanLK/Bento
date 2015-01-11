rice.define('rice/components/fill', [
    'rice/sugar',
    'rice/game'
], function (Sugar, Game) {
    'use strict';
    return function (base, settings) {
        var viewport = Game.getViewport(),
            component = {
                name: 'fill',
                draw: function (data) {
                    data.renderer.fillRect('#000', 0, 0, viewport.width, viewport.height);
                }
            };
        base.attach(component);
        Sugar.combine(base, {
            fill: component
        });
        return base;
    };
});