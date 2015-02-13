/*
 * WebGL renderer using gl-sprites by Matt DesLauriers
 * @copyright (C) HeiGames
 */
bento.define('bento/renderers/webgl', [
    'bento/utils',
    'bento/renderers/canvas2d'
], function (Utils, Canvas2d) {
    return function (canvas, settings) {
        var canWebGl,
            context,
            glRenderer,
            renderer = {
                name: 'webgl',
                save: function () {
                    glRenderer.save();
                },
                restore: function () {
                    glRenderer.restore();
                },
                translate: function (x, y) {
                    glRenderer.translate(x, y);
                },
                scale: function (x, y) {
                    glRenderer.scale(x, y);
                },
                rotate: function (angle) {
                    glRenderer.rotate(angle);
                },
                fillRect: function (color, x, y, w, h) {
                    var oldColor = glRenderer.color;
                    // 
                    renderer.setColor(color);
                    glRenderer.fillRect(x, y, w, h);
                    glRenderer.color = oldColor;
                },
                strokeRect: function (color, x, y, w, h) {
                    var oldColor = glRenderer.color;
                    // 
                    renderer.setColor(color);
                    glRenderer.strokeRect(x, y, w, h);
                    glRenderer.color = oldColor;
                },
                drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                    var image = packedImage.image;
                    if (!image.texture) {
                        image.texture = window.GlSprites.createTexture2D(context, image);
                    }
                    glRenderer.drawImage(image.texture, packedImage.x + sx, packedImage.y + sy, sw, sh, x, y, sw, sh);
                },
                begin: function () {
                    glRenderer.begin();
                },
                flush: function () {
                    glRenderer.end();
                },
                setColor: function (color) {
                    glRenderer.color = color;
                },
                getOpacity: function () {
                    return glRenderer.color[3];
                },
                setOpacity: function (value) {
                    glRenderer.color[3] = value;
                }
            };
        console.log('Init webgl as renderer');

        // fallback
        canWebGl = (function () {
            try {
                var canvas = document.createElement('canvas');
                return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
                return false;
            }
        })();
        if (canWebGl) {
            context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            glRenderer = window.GlSprites.SpriteRenderer(context);
            glRenderer.ortho(canvas.width, canvas.height);
            return renderer;
        } else {
            return Canvas2d(canvas, settings);
        }
    };
});