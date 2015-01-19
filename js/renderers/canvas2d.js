/*
 * Canvas 2d renderer
 * @copyright (C) HeiGames
 */
bento.define('bento/renderers/canvas2d', [
    'bento/utils'
], function (Utils) {
    return function (canvas, settings) {
        var context = canvas.getContext('2d'),
            renderer = {
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
            fillRect: function (colorArray, x, y, w, h) {
                var colorStr = '#';
                colorStr += ('00' + Math.floor(colorArray[0] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[1] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[2] * 255).toString(16)).slice(-2);
                context.fillStyle = colorStr;
                context.fillRect(x, y, w, h);
            },
            drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                context.drawImage(packedImage.image, packedImage.x + sx, packedImage.y + sy, sw, sh, x, y, w, h);
            }
        };
        console.log('Init canvas2d as renderer');

        if (!settings.smoothing) {
            if (context.imageSmoothingEnabled) {
                context.imageSmoothingEnabled = false;
            }
            if (context.webkitImageSmoothingEnabled) {
                context.webkitImageSmoothingEnabled = false;
            }
            if (context.mozImageSmoothingEnabled) {
                context.mozImageSmoothingEnabled = false;
            }
        }
        return renderer;
    };
});