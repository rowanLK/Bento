/**
 * Renderer using PIXI by GoodBoyDigital
 * Very unfinished, can only draw sprites for now.
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
            // TODO
            fillRect: function (color, x, y, w, h) {},
            fillCircle: function (color, x, y, radius) {},
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