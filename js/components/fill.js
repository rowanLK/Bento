bento.define('bento/components/fill', [
    'bento/utils',
    'bento'
], function (Utils, Bento) {
    'use strict';
    return function (entity, settings) {
        var viewport = Bento.getViewport(),
            mixin = {},
            color = [0, 0, 0, 1],
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

        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});