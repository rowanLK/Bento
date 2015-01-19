/*
 * Base functions for renderer
 * @copyright (C) HeiGames
 */
bento.define('bento/renderer', [
    'bento/utils'
], function (Utils) {
    return function (type, canvas, settings, callback) {
        var module = {
            save: function () {},
            restore: function () {},
            translate: function () {},
            scale: function (x, y) {},
            rotate: function (angle) {},
            fillRect: function (color, x, y, w, h) {},
            drawImage: function (spriteImage, sx, sy, sw, sh, x, y, w, h) {},
            begin: function () {},
            flush: function () {},
            setColor: function () {}
        };
        require(['bento/renderers/' + type], function (renderer) {
            Utils.extend(module, renderer(canvas, settings));
            callback(module);
        });
    };
});