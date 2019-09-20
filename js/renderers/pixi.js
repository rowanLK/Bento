/**
 * Renderer using PIXI (v5 or higher) by GoodBoyDigital
 * @moduleName PixiRenderer
 */
bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils',
    'bento/math/transformmatrix',
    'bento/renderers/canvas2d',
    'bento/components/sprite',
    'bento/components/pixi/sprite'
], function (
    Bento,
    Utils,
    TransformMatrix,
    Canvas2d,
    Sprite,
    PixiSprite
) {
    var PIXI = window.PIXI;
    var PixiRenderer = function (canvas, settings) {
        var gl;
        var canWebGl = (function () {
            // try making a canvas
            try {
                gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                return !!window.WebGLRenderingContext;
            } catch (e) {
                return false;
            }
        })();
        var matrix;
        var Matrix;
        var matrices = [];
        var alpha = 1;
        var color = 0xFFFFFF;
        var renderer;
        var pixelSize = settings.pixelSize || 1;
        var pixiMatrix = new PIXI.Matrix();
        var stage = new PIXI.Container();
        var zIndex = 0;
        var pixiRenderer = {
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
            getTransform: function () {
                return matrix;
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

            // todo: implement these, but not recommended to use
            fillRect: function (color, x, y, w, h) {
                return;
            },
            fillCircle: function (color, x, y, radius) {
                return;
            },
            strokeRect: function (color, x, y, w, h, lineWidth) {
                return;
            },
            strokeCircle: function (color, x, y, radius, sAngle, eAngle, lineWidth) {
                return;
            },
            drawLine: function (color, ax, ay, bx, by, width) {
                return;
            },
            drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                return;
            },


            begin: function () {
                var i, l, children = stage.children;
                // reset stage
                zIndex = 0;
                // set pixelSize
                if (pixelSize !== 1) {
                    this.save();
                    this.scale(pixelSize, pixelSize);
                }

                // set everything invisible
                for (i = 0, l = children.length; i < l; ++i) {
                    children[i].visible = false;
                }

            },
            flush: function () {
                // render entire stage
                stage.sortChildren();
                renderer.render(stage);

                // restore pixelsize
                if (pixelSize !== 1) {
                    this.restore();
                }
            },
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            },
            render: function (displayObject) {
                this.drawPixi(displayObject);
            },
            /*
             * Pixi only feature: draws any pixi displayObject
             */
            drawPixi: function (displayObject) {
                // set piximatrix to current transform matrix
                pixiMatrix.a = matrix.a;
                pixiMatrix.b = matrix.b;
                pixiMatrix.c = matrix.c;
                pixiMatrix.d = matrix.d;
                pixiMatrix.tx = matrix.tx;
                pixiMatrix.ty = matrix.ty;

                // stage.addChild(displayObject);
                displayObject.zIndex = zIndex;
                ++zIndex;
                displayObject.transform.setFromMatrix(pixiMatrix);
                displayObject.alpha = alpha;
                displayObject.visible = true;
            },
            getContext: function () {
                return gl;
            },
            getPixiRenderer: function () {
                return renderer;
            },
            // pixi specific: update the webgl view, needed if the canvas changed size
            updateSize: function () {
                renderer.resize(canvas.width, canvas.height);
            },
            pixi: {
                renderer: renderer,
                stage: stage
            }
        };

        if (canWebGl && Utils.isDefined(window.PIXI)) {
            // init pixi
            matrix = new TransformMatrix();
            renderer = new PIXI.Renderer({
                view: canvas,
                width: canvas.width,
                height: canvas.height,
                backgroundColor: 0x000000,
                clearBeforeRender: false,
                antialias: Bento.getAntiAlias()
            });
            stage.sortableChildren = true;
            
            Sprite.inheritFrom(PixiSprite);

            return pixiRenderer;
        } else {
            if (!window.PIXI) {
                console.log('WARNING: PIXI library is missing, reverting to Canvas2D renderer');
            } else if (!canWebGl) {
                console.log('WARNING: WebGL not available, reverting to Canvas2D renderer');
            }
            return Canvas2d(canvas, settings);
        }
    };
    return PixiRenderer;
});