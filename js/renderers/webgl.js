rice.define('rice/renderers/webgl', [
    'rice/sugar'
], function (Sugar) {
    return function (canvas, context) {
        var glRenderer,
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
                    glRenderer.color = [0, 0, 0, 1.0];
                    glRenderer.fillRect(x, y, w, h);
                },
                drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {
                    if (!image.texture) {
                        image.texture = window.GlSprites.createTexture2D(context, image);
                    }
                    glRenderer.color = [1, 1, 1, 1];
                    glRenderer.drawImage(image.texture, sx, sy, sw, sh, x, y, sw, sh);
                },
                begin: function () {
                    glRenderer.begin();
                },
                flush: function () {
                    glRenderer.end();
                }
            };
        console.log('using webgl as renderer');
        context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        glRenderer = window.GlSprites.SpriteRenderer(context);
        glRenderer.ortho(canvas.width, canvas.height);
        return renderer;
    };
});