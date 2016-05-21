/**
 * Renderer using PIXI by GoodBoyDigital
 */
bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils',
    'bento/math/transformmatrix',
    'bento/renderers/canvas2d'
], function (Bento, Utils, TransformMatrix, Canvas2d) {
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
        var graphicsRenderer;
        var particleRenderer;
        var test = false;
        var cocoonScale = 1;
        var pixelSize = settings.pixelSize || 1;
        var tempDisplayObjectParent = null;
        var transformObject = {
            worldTransform: null,
            worldAlpha: 1,
            children: []
        };
        var getPixiMatrix = function () {
            var pixiMatrix = new PIXI.Matrix();
            pixiMatrix.a = matrix.a;
            pixiMatrix.b = matrix.b;
            pixiMatrix.c = matrix.c;
            pixiMatrix.d = matrix.d;
            pixiMatrix.tx = matrix.tx;
            pixiMatrix.ty = matrix.ty;
            return pixiMatrix;
        };
        var getGraphics = function (color) {
            var graphics = new PIXI.Graphics();
            var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);
            var alpha = color[3];
            graphics.beginFill(colorInt, alpha);
            graphics.worldTransform = getPixiMatrix();
            graphics.worldAlpha = alpha;
            return graphics;
        };
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
            setTransform: function (a, b, c, d, tx, ty) {
                matrix.a = a;
                matrix.b = b;
                matrix.c = c;
                matrix.d = d;
                matrix.tx = tx;
                matrix.ty = ty;
            },
            translate: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.translate(x, y));
            },
            scale: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.scale(x, y));
            },
            rotate: function (angle) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.rotate(angle));
            },
            fillRect: function (color, x, y, w, h) {
                var graphics = getGraphics(color);
                graphics.drawRect(x, y, w, h);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);
            },
            fillCircle: function (color, x, y, radius) {
                var graphics = getGraphics(color);
                graphics.drawCircle(x, y, radius);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);

            },
            drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                var image = packedImage.image;
                var rectangle;
                var sprite;
                var texture;
                // If image and frame size don't correspond Pixi will throw an error and break the game.
                // This check tries to prevent that.
                if (sx + sw > image.width || sy + sh > image.height) {
                    console.log("Warning: image and frame size do not correspond.", image);
                    return;
                }
                if (!image.texture) {
                    // initialize pixi baseTexture
                    image.texture = new PIXI.BaseTexture(image, PIXI.SCALE_MODES.NEAREST);
                }
                rectangle = new PIXI.Rectangle(sx, sy, sw, sh);
                texture = new PIXI.Texture(image.texture, rectangle);
                texture._updateUvs();

                // should sprites be reused instead of spawning one all the time(?)
                sprite = new PIXI.Sprite(texture);
                sprite.worldTransform = matrix;
                sprite.worldAlpha = alpha;

                // push into batch
                pixiRenderer.setObjectRenderer(spriteRenderer);
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
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            },
            /* 
             * Pixi only feature: draws any pixi displayObject
             */
            drawPixi: function (displayObject) {
                // trick the renderer by setting our own parent
                transformObject.worldTransform = matrix;
                transformObject.worldAlpha = alpha;
                pixiRenderer._tempDisplayObjectParent = transformObject;
                pixiRenderer.render(displayObject);
            }
        };

        if (canWebGl && Utils.isDefined(window.PIXI)) {
            // init pixi
            // Matrix = PIXI.Matrix;
            matrix = new TransformMatrix();
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
                backgroundColor: 0x000000,
                clearBeforeRender: false
            });
            tempDisplayObjectParent = pixiRenderer._tempDisplayObjectParent;
            spriteRenderer = pixiRenderer.plugins.sprite;
            graphicsRenderer = pixiRenderer.plugins.graphics;

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