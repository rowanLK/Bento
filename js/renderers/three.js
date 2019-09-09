/**
 * The Three.js renderer will render 2D sprites despite being a 3D engine.
 * However, it is flexible enough for the user to render 3D objects. The renderer will expose 
 * a main camera and main scene.
 * @moduleName ThreeJsRenderer
 */
bento.define('bento/renderers/three', [
    'bento/utils',
    'bento/math/transformmatrix',
    'bento/renderers/canvas2d'
], function (
    Utils,
    TransformMatrix,
    Canvas2d
) {
    var ThreeJsRenderer = function (canvas, settings) {
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
        var alpha = 1;
        var matrix = new TransformMatrix();
        var matrices = [];
        var renderer;
        var scene;
        var camera;
        var bentoRenderer = {
            name: 'three.js',
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

            // do not use with Three.js
            fillRect: function (color, x, y, w, h) {},
            fillCircle: function (color, x, y, radius) {},
            strokeRect: function (color, x, y, w, h) {},
            drawLine: function (color, ax, ay, bx, by, width) {},
            drawImage: function (spriteImage, sx, sy, sw, sh, x, y, w, h) {},

            //
            render: function (data) {
                var object3d = data.object3d;
                var material = data.material;
                var z = data.z;
                
                // todo: attach to scene and remove everything during flush? 
                // or let components add/remove from scene? -> currently doing this option
                object3d.matrixAutoUpdate = false;
                object3d.matrix.set(
                    matrix.a, matrix.c, 0, matrix.tx,
                    matrix.b, matrix.d, 0, matrix.ty,
                    0,        0,        1, z,
                    0,        0,        0, 1
                );

                // opacity
                material.opacity = alpha;
            },

            begin: function () {},
            flush: function () {
                renderer.render(scene, camera);
            },
            setColor: function () {},
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            },
            createSurface: function () {},
            setContext: function () {},
            getContext: function () {
                return gl;
            },
            restoreContext: function () {},
            three: {
                camera: null,
                scene: null,
                renderer: null,
            },
            updateSize: function () {
                setupScene();
            }
        };
        var setupRenderer = function () {
            renderer = new window.THREE.WebGLRenderer(Utils.extend(settings, {
                context: gl,
                antialias: settings.antiAlias,
                powerPreference: 'low-power',
                /* https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
                 * Using highp precision in fragment shaders will prevent your content from working on some older mobile hardware.
                 * You can use mediump instead, but be aware that this often results in corrupted rendering due to lack of precision
                 * on most mobile devices, and the corruption is not going to be visible on a typical desktop computer.
                 */
                precision: 'highp',
                /* if highp is not feasible use logarithmicDepthBuffer to resolve scaling issues */
                // logarithmicDepthBuffer: true
            }));
        };
        var setupScene = function () {
            var width = canvas.width / settings.pixelSize;
            var height = canvas.height / settings.pixelSize;
            if (!scene) {
                scene = new window.THREE.Scene();
            }
            if (camera) {
                scene.remove(camera);
            }
            camera = new window.THREE.OrthographicCamera(
                0, // left
                width, // right
                height, // top
                0, // bottom
                -10000, // near
                10000 // far
            );
            // rotate camera in such a way that x axis is right and y axis is down
            camera.lookAt(new window.THREE.Vector3(0, 0, 1));
            camera.rotation.z = 0;
            camera.position.x = 0;
            camera.position.y = height;

            renderer.setViewport(0, 0, canvas.width, canvas.height);
            scene.add(camera); // this is needed to attach stuff to the camera

            // TODO: remove this    
            scene.background = new window.THREE.Color(0x000000);

            // expose camera and scene
            ThreeJsRenderer.camera = camera;
            bentoRenderer.three.camera = camera;
            ThreeJsRenderer.scene = scene;
            bentoRenderer.three.scene = scene;
            ThreeJsRenderer.renderer = renderer;
            bentoRenderer.three.renderer = renderer;
        };


        if (canWebGl && Utils.isDefined(window.THREE)) {
            setupRenderer();
            setupScene();

        } else {
            if (!window.THREE) {
                console.log('WARNING: THREE library is missing, reverting to Canvas2D renderer');
            } else if (!canWebGl) {
                console.log('WARNING: WebGL not available, reverting to Canvas2D renderer');
            }
            return Canvas2d(canvas, settings);
        }

        return bentoRenderer;
    };

    /* @snippet ThreeJsRenderer.scene|THREE.Scene */
    ThreeJsRenderer.scene = null;
    /* @snippet ThreeJsRenderer.camera|THREE.Camera */
    ThreeJsRenderer.camera = null;
    /* @snippet ThreeJsRenderer.renderer|THREE.WebGLRenderer */
    ThreeJsRenderer.renderer = null;

    return ThreeJsRenderer;
});