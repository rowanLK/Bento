rice.define('rice/components/translation', [
    'rice/sugar',
    'rice/math/vector2'
], function (Sugar, Vector2) {
    'use strict';
    return function (base) {
        var set = false,
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
        Sugar.combine(base, {
            translation: component
        });
        return base;
    };
});