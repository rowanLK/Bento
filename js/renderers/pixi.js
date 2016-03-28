bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils'
], function (Bento, Utils) {
    return function (canvas, settings) {
        var matrix;
        var Matrix;
        var matrices = [];
        var alpha = 1;
        var color = 0xFFFFFF;
        var pixiRenderer;
        var spriteRenderer;
        var test = false;
        var renderer = {
            name: 'pixi',
            init: function () {

            },
            destroy: function () {},
            save: function () {
                matrices.push(matrix.clone());
            },
            restore: function () {
                matrix = matrices.pop();
            },
            translate: function (x, y) {
                // matrix.translate(x, y);
                var pt = matrix;
                var wt = new Matrix().translate(x, y);
                var tx = x;
                var ty = y;

                wt.a = pt.a;
                wt.b = pt.b;
                wt.c = pt.c;
                wt.d = pt.d;
                wt.tx = tx * pt.a + ty * pt.c + pt.tx;
                wt.ty = tx * pt.b + ty * pt.d + pt.ty;

                matrix = wt;
            },
            scale: function (x, y) {
                // matrix.scale(x, y);

                var pt = matrix;
                var wt = new Matrix().scale(x, y);

                wt.a = x * pt.a;
                wt.b = x * pt.b;
                wt.c = y * pt.c;
                wt.d = y * pt.d;
                wt.tx = pt.tx;
                wt.ty = pt.ty;

                matrix = wt;
            },
            rotate: function (angle) {
                // matrix.rotate(angle);

                var sin = Math.sin(angle);
                var cos = Math.cos(angle);
                var pt = matrix;
                var wt = new Matrix().rotate(angle);

                // concat the parent matrix with the objects transform.
                wt.a = cos * pt.a + sin * pt.c;
                wt.b = cos * pt.b + sin * pt.d;
                wt.c = -sin * pt.a + cos * pt.c;
                wt.d = -sin * pt.b + cos * pt.d;
                wt.tx = pt.tx;
                wt.ty = pt.ty;

                matrix = wt;

            },
            fillRect: function (color, x, y, w, h) {},
            fillCircle: function (color, x, y, radius) {},
            drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                var image = packedImage.image;
                var rectangle;
                var sprite;
                var texture;
                if (!image.texture) {
                    // initialize pixi baseTexture
                    image.texture = new PIXI.BaseTexture(image, PIXI.SCALE_MODES.NEAREST);
                }
                rectangle = new PIXI.Rectangle(sx, sy, sw, sh);
                texture = new PIXI.Texture(image.texture, rectangle);
                texture._updateUvs();

                // simulate a sprite for the pixi SpriteRenderer
                // sprite = {
                //     _texture: texture,
                //     anchor: {
                //         x: 0,
                //         y: 0
                //     },
                //     worldTransform: matrix,
                //     worldAlpha: alpha,
                //     shader: null,
                //     blendMode: 0
                // };
                sprite = new PIXI.Sprite(texture);
                sprite.worldTransform = matrix;
                sprite.worldAlpha = alpha;
                if (!test) {
                    test = true;
                    console.log(sprite);
                }
                // push into batch
                spriteRenderer.render(sprite);
            },
            begin: function () {
                spriteRenderer.start();
            },
            flush: function () {
                spriteRenderer.flush();
            },
            setColor: function (color) {

            },
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            }
        };
        if (!window.PIXI) {
            throw 'Pixi library missing';
        }

        // init pixi
        Matrix = PIXI.math.Matrix;
        matrix = new Matrix();
        pixiRenderer = new PIXI.WebGLRenderer(canvas.width, canvas.height, {
            view: canvas,
            backgroundColor: 0x000000
        });
        spriteRenderer = pixiRenderer.plugins.sprite;
        pixiRenderer.setObjectRenderer(spriteRenderer);

        console.log('Init pixi as renderer');

        return renderer;
    };
});