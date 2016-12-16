/**
 * Canvas 2d renderer
 * @copyright (C) 2015 LuckyKat
 */
bento.define('bento/renderers/canvas2d', [
    'bento/utils'
], function (Utils) {
    return function (canvas, settings) {
        var context = canvas.getContext('2d'),
            original = context,
            pixelSize = settings.pixelSize || 1,
            renderer = {
                name: 'canvas2d',
                save: function () {
                    context.save();
                },
                restore: function () {
                    context.restore();
                },
                setTransform: function (a, b, c, d, tx, ty) {
                    context.setTransform(a, b, c, d, tx, ty);
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
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = colorArray[3];
                    }
                    context.fillStyle = colorStr;
                    context.fillRect(x, y, w, h);
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                fillCircle: function (colorArray, x, y, radius) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = colorArray[3];
                    }
                    context.fillStyle = colorStr;
                    context.beginPath();
                    context.arc(x, y, radius, 0, Math.PI * 2);
                    context.fill();
                    context.closePath();

                },
                strokeRect: function (colorArray, x, y, w, h) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = colorArray[3];
                    }
                    context.strokeStyle = colorStr;
                    context.strokeRect(x, y, w, h);
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                strokeCircle: function (colorArray, x, y, radius, sAngle, eAngle, lineWidth) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;

                    sAngle = sAngle || 0;
                    eAngle = eAngle || 0;

                    if (colorArray[3] !== 1) {
                        context.globalAlpha = colorArray[3];
                    }
                    context.strokeStyle = colorStr;
                    context.lineWidth = lineWidth || 0;
                    context.beginPath();
                    context.arc(x, y, radius, sAngle, eAngle, false);
                    context.stroke();
                    context.closePath();
                },
                drawLine: function (colorArray, ax, ay, bx, by, width) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    var widthMultiplier = Utils.isCocoonJs() ? 1 : pixelSize;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = colorArray[3];
                    }
                    if (!Utils.isDefined(width)) {
                        width = 1;
                    }

                    context.strokeStyle = colorStr;
                    context.lineWidth = width * widthMultiplier;

                    context.beginPath();
                    context.moveTo(ax, ay);
                    context.lineTo(bx, by);
                    context.stroke();
                    context.closePath();

                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                    context.drawImage(packedImage.image, packedImage.x + sx, packedImage.y + sy, sw, sh, x, y, w, h);
                },
                getOpacity: function () {
                    return context.globalAlpha;
                },
                setOpacity: function (value) {
                    context.globalAlpha = value;
                },
                createSurface: function (width, height) {
                    var newCanvas = document.createElement('canvas'),
                        newContext;

                    newCanvas.width = width;
                    newCanvas.height = height;

                    newContext = canvas.getContext('2d');

                    return {
                        canvas: newCanvas,
                        context: newContext
                    };
                },
                setContext: function (ctx) {
                    context = ctx;
                },
                restoreContext: function () {
                    context = original;
                },
                getContext: function () {
                    return context;
                },
                begin: function () {
                    if (context === original && pixelSize !== 1) {
                        context.save();
                        context.scale(pixelSize, pixelSize);
                    }
                },
                flush: function () {
                    if (context === original && pixelSize !== 1) {
                        context.restore();
                    }
                }
            },
            getColor = function (colorArray) {
                var colorStr = '#';
                colorStr += ('00' + Math.floor(colorArray[0] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[1] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[2] * 255).toString(16)).slice(-2);
                return colorStr;
            };

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
            if (context.msImageSmoothingEnabled) {
                context.msImageSmoothingEnabled = false;
            }
        }
        return renderer;
    };
});