bento.define('bento/renderer', [
    'bento/utils'
], function (Utils, Canvas2D) {
    return function (type, canvas, context, callback) {
        var module = {
            save: function () {},
            restore: function () {},
            translate: function () {},
            scale: function (x, y) {},
            rotate: function (angle) {},
            fillRect: function (color, x, y, w, h) {},
            drawImage: function (texture, sx, sy, sw, sh, x, y, w, h) {},
            begin: function () {},
            flush: function () {},
            setColor: function () {}
        };
        require(['bento/renderers/' + type], function (renderer) {
            Utils.combine(module, renderer(canvas, context));
            callback(module);
        });
    };
});