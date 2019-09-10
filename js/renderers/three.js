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
        var THREE = window.THREE;
        var alpha = 1;
        var matrix = new TransformMatrix();
        var matrices = [];
        var rotAroundX = new THREE.Matrix4();
        var renderer;
        var scenes = [];
        var objectList = [];
        // main scene and camera
        var scene;
        var camera;
        var mainScene = {
            cameras: [],
            scene: null
        };
        // module
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

            // todo: implement these, but not recommended to use
            fillRect: function (color, x, y, w, h) {},
            fillCircle: function (color, x, y, radius) {},
            strokeRect: function (color, x, y, w, h) {},
            drawLine: function (color, ax, ay, bx, by, width) {},
            drawImage: function (spriteImage, sx, sy, sw, sh, x, y, w, h) {},

            begin: function () {
                // remove the objects from main scene and restart
                Utils.forEach(objectList, function (object3D) {
                    scene.remove(object3D);
                });
                objectList = [];
            },
            render: function (data) {
                // render by adding object3d into the scene
                var object3D = data.object3D;
                var material = data.material;
                var z = -objectList.length;

                // take over the world matrix
                object3D.matrixAutoUpdate = false;
                // move the 2d matrix into the 3d matrix, 
                object3D.matrix.set(
                    matrix.a, matrix.c, 0, matrix.tx,
                    matrix.b, matrix.d, 0, matrix.ty,
                    0, 0, 1, z,
                    0, 0, 0, 1
                );
                // there's an additional Math.PI rotation around the x axis
                object3D.matrix.multiply(rotAroundX);

                // opacity
                material.opacity = alpha;

                // prepare to render
                objectList.push(object3D);
                scene.add(object3D);
            },
            flush: function () {
                // render scenes and its cameras
                var i = 0,
                    j = 0;
                var cameras;
                for (i = 0; i < scenes.length; ++i) {
                    cameras = scenes[i].cameras || [];
                    for (j = 0; j < cameras.length; ++j) {
                        renderer.render(scene, cameras[j]);
                    }
                }                
            },
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            },
            // createSurface: function () {},
            // setContext: function () {},
            // restoreContext: function () {},
            getContext: function () {
                return gl;
            },
            three: {
                camera: null,
                scene: null,
                renderer: null,
                // scenes is an array of {cameras: [THREE.Camera], scene: THREE.Scene}
                scenes: scenes
            },
            updateSize: function () {
                setupScene();
            }
        };
        var setupRenderer = function () {
            renderer = new THREE.WebGLRenderer(Utils.extend(settings, {
                context: gl,
                antialias: settings.antiAlias,
                powerPreference: settings.powerPreference || 'low-power',
                /* https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
                 * Using highp precision in fragment shaders will prevent your content from working on some older mobile hardware.
                 * You can use mediump instead, but be aware that this often results in corrupted rendering due to lack of precision
                 * on most mobile devices, and the corruption is not going to be visible on a typical desktop computer.
                 */
                precision: settings.precision || 'highp',
                /* if highp is not feasible use logarithmicDepthBuffer to resolve scaling issues */
                // logarithmicDepthBuffer: true
            }));
        };
        var setupScene = function () {
            var width = canvas.width / settings.pixelSize;
            var height = canvas.height / settings.pixelSize;
            if (!scene) {
                scene = new THREE.Scene();
            }
            if (camera) {
                scene.remove(camera);
            }
            camera = new THREE.OrthographicCamera(
                0, // left
                width, // right
                height, // top
                0, // bottom
                -10000, // near
                10000 // far
            );
            // rotate camera in such a way that x axis is right and y axis is down
            camera.lookAt(new THREE.Vector3(0, 0, 1));
            camera.rotation.z = 0;
            camera.position.x = 0;
            camera.position.y = height;

            renderer.setViewport(0, 0, canvas.width, canvas.height);
            scene.add(camera); // this is needed to attach stuff to the camera

            // main scene only has 1 camera
            mainScene.cameras = [camera];
            mainScene.scene = scene;

            // TODO: remove this
            scene.background = new THREE.Color(0x000000);

            // expose camera and scene
            ThreeJsRenderer.camera = camera;
            bentoRenderer.three.camera = camera;
            ThreeJsRenderer.scene = scene;
            bentoRenderer.three.scene = scene;
            ThreeJsRenderer.renderer = renderer;
            bentoRenderer.three.renderer = renderer;
        };

        if (canWebGl && Utils.isDefined(THREE)) {
            // matrix that rotates Math.PI around the x axis
            rotAroundX.set(
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, 1
            );
            setupRenderer();
            setupScene();
            // attach main scene
            scenes.push(mainScene);
        } else {
            if (!THREE) {
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