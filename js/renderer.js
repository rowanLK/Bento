/**
 * Base functions for renderer
 * @module bento/renderer
 * @copyright (C) 2015 LuckyKat
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
            fillCircle: function (color, x, y, radius) {},
            strokeRect: function (color, x, y, w, h) {},
            drawImage: function (spriteImage, sx, sy, sw, sh, x, y, w, h) {},
            begin: function () {},
            flush: function () {},
            setColor: function () {},
            getOpacity: function () {},
            setOpacity: function () {},
            createSurface: function () {},
            setContext: function () {},
            restoreContext: function () {}
        };
        require(['bento/renderers/' + type], function (renderer) {
            Utils.extend(module, renderer(canvas, settings));
            callback(module);
        });
    };
});