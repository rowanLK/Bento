bento.define('bento/components/translation', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    return function (base) {
        var set = false,
            mixin = {},
            component = {
                name: 'translation',
                draw: function (data) {
                    var parent = base.getParent(),
                        position = base.getPosition(),
                        scroll = data.viewport;
                    data.renderer.save(base);
                    data.renderer.translate(Math.round(position.x), Math.round(position.y));

                    // scroll (only applies to parent objects)
                    if (parent === null) {
                        data.renderer.translate(Math.round(-scroll.x), Math.round(-scroll.y));
                    }
                },
                postDraw: function (data) {
                    data.renderer.restore();
                }
            };
        base.attach(component);
        mixin[component.name] = component;
        Utils.combine(base, mixin);
        return base;
    };
});