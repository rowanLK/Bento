rice.define('rice/renderer', [
    'rice/sugar'
], function (Sugar, Canvas2D) {
    return function (type, canvas, context, callback) {
        var module = {
            save: function () {},
            restore: function () {},
            translate: function () {},
            scale: function (x, y) {},
            rotate: function (angle) {},
            fillRect: function (color, x, y, w, h) {},
            drawImage: function (texture, sx, sy, sw, sh, x, y, w, h) {},
            flush: function () {}
        };
        require(['rice/renderers/' + type], function (renderer) {
            Sugar.combine(module, renderer(canvas, context));
            callback(module);
        });
    };
});