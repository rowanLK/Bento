/**
 * Canvas 2d renderer
 * @copyright (C) 2015 LuckyKat
 * @moduleName Canvas2DRenderer
 */
bento.define('bento/renderers/canvas2d', [
    'bento/utils',
    'bento/math/transformmatrix'
], function (
    Utils,
    TransformMatrix
) {
    return function (canvas, settings) {
        var context = canvas.getContext('2d');
        var original = context;
        var pixelSize = settings.pixelSize || 1;
        var matrix = new TransformMatrix();
        var matrices = [];
        var renderer = {
            name: 'canvas2d',
            save: function () {
                matrices.push(matrix.clone());
            },
            restore: function () {
                matrix = matrices.pop();
            },
            setTransform: function (a, b, c, d, tx, ty) {
                matrix.a = a;
                matrix.b = b;
                matrix.c = c;
                matrix.d = d;
                matrix.tx = tx;
                matrix.ty = ty;
                // immediately apply to current transform
                applyTransform();
            },
            getTransform: function () {
                return matrix;
            },
            translate: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.translate(x, y));
                applyTransform();
            },
            scale: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.scale(x, y));
                applyTransform();
            },
            rotate: function (angle) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.rotate(angle));
                applyTransform();
            },
            fillRect: function (colorArray, x, y, w, h) {
                var colorStr = getColor(colorArray),
                    oldOpacity = context.globalAlpha;
                if (colorArray[3] !== 1) {
                    context.globalAlpha *= colorArray[3];
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
                    context.globalAlpha *= colorArray[3];
                }
                context.fillStyle = colorStr;
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fill();
                context.closePath();
                if (colorArray[3] !== 1) {
                    context.globalAlpha = oldOpacity;
                }
            },
            strokeRect: function (colorArray, x, y, w, h, lineWidth) {
                var colorStr = getColor(colorArray),
                    oldOpacity = context.globalAlpha;
                if (colorArray[3] !== 1) {
                    context.globalAlpha *= colorArray[3];
                }
                context.lineWidth = lineWidth || 0;
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
                    context.globalAlpha *= colorArray[3];
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
                if (colorArray[3] !== 1) {
                    context.globalAlpha *= colorArray[3];
                }
                if (!Utils.isDefined(width)) {
                    width = 1;
                }

                context.strokeStyle = colorStr;
                context.lineWidth = width;

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

                newContext = newCanvas.getContext('2d');

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
                    renderer.save();
                    renderer.scale(pixelSize, pixelSize);
                }
            },
            flush: function () {
                if (context === original && pixelSize !== 1) {
                    renderer.restore();
                }
            }
        };
        var getColor = function (colorArray) {
            var colorStr = '#';
            colorStr += ('00' + Math.floor(colorArray[0] * 255).toString(16)).slice(-2);
            colorStr += ('00' + Math.floor(colorArray[1] * 255).toString(16)).slice(-2);
            colorStr += ('00' + Math.floor(colorArray[2] * 255).toString(16)).slice(-2);
            return colorStr;
        };
        var applyTransform = function () {
            // apply transform matrix to context
            context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        };

        return renderer;
    };
});