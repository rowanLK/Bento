/**
 * Renderer using PIXI by GoodBoyDigital
 * Very unfinished, can only draw sprites for now.
 */
bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils',
    'bento/renderers/canvas2d'
], function (Bento, Utils, Canvas2d) {
    return function (canvas, settings) {
        var canWebGl = (function () {
            // try making a canvas
            try {
                var canvas = document.createElement('canvas');
                return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
                return false;
            }
        })();
        var matrix;
        var Matrix;
        var matrices = [];
        var alpha = 1;
        var color = 0xFFFFFF;
        var pixiRenderer;
        var spriteRenderer;
        var test = false;
        var cocoonScale = 1;
        var pixelSize = settings.pixelSize || 1;
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
            // TODO
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

                // simulate a sprite for the pixi SpriteRenderer??
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

                // can't get the above to work, spawn a normal pixi sprite
                sprite = new PIXI.Sprite(texture);
                sprite.worldTransform = matrix;
                sprite.worldAlpha = alpha;

                // push into batch
                spriteRenderer.render(sprite);
            },
            begin: function () {
                spriteRenderer.start();
                if (pixelSize !== 1 || Utils.isCocoonJs()) {
                    this.save();
                    this.scale(pixelSize * cocoonScale, pixelSize * cocoonScale);
                }
            },
            flush: function () {
                spriteRenderer.flush();
                if (pixelSize !== 1 || Utils.isCocoonJs()) {
                    this.restore();
                }
            },
            setColor: function (color) {
                // TODO
            },
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            }
        };

        if (canWebGl && Utils.isDefined(window.PIXI)) {
            // init pixi
            Matrix = PIXI.Matrix;
            matrix = new Matrix();
            // additional scale
            if (Utils.isCocoonJs()) {
                cocoonScale = window.innerWidth / canvas.width;
                console.log('Cocoon-Pixi scale', cocoonScale);
            }
            // resize canvas according to pixelSize
            canvas.width *= pixelSize * cocoonScale;
            canvas.height *= pixelSize * cocoonScale;
            pixiRenderer = new PIXI.WebGLRenderer(canvas.width, canvas.height, {
                view: canvas,
                backgroundColor: 0x000000
            });
            spriteRenderer = pixiRenderer.plugins.sprite;
            pixiRenderer.setObjectRenderer(spriteRenderer);

            console.log('Init pixi as renderer');
            return renderer;
        } else {
            if (!window.PIXI) {
                console.log('WARNING: PIXI library is missing, reverting to Canvas2D renderer');
            } else if (!canWebGl) {
                console.log('WARNING: WebGL not available, reverting to Canvas2D renderer');
            }
            return Canvas2d(canvas, settings);
        }
    };
});