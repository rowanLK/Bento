bento.define('bento/renderers/canvas2d', [
    'bento/utils'
], function (Utils) {
    return function (canvas, context) {
        var renderer = {
            name: 'canvas2d',
            save: function () {
                context.save();
            },
            restore: function () {
                context.restore();
            },
            translate: function (x, y) {
                context.translate(x, y);
            },
            scale: function (x, y) {
                context.scale(x, y);
            },
            rotate: function (angle) {
                context.rotate(angle);
            },
            fillRect: function (color, x, y, w, h) {
                context.fillStyle = color;
                context.fillRect(x, y, w, h);
            },
            drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {
                context.drawImage(image, sx, sy, sw, sh, x, y, w, h);
            }
        };
        console.log('Init canvas2d as renderer');

        return renderer;
    };
});