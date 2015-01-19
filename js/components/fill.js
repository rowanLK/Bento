bento.define('bento/components/fill', [
    'bento/utils',
    'bento'
], function (Utils, Bento) {
    'use strict';
    return function (base, settings) {
        var viewport = Bento.getViewport(),
            mixin = {},
            color = [0, 0, 0, 0],
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
        Utils.extend(base, mixin);
        return base;
    };
});