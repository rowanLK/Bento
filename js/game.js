/**
 *  Rice game instance, controls managers and game loop
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
rice.define('rice/game', [
    'rice/sugar',
    'rice/lib/domready',
    'rice/lib/requestanimationframe',
    'rice/managers/asset',
    'rice/managers/input',
    'rice/managers/object',
    'rice/math/vector2',
    'rice/math/rectangle',
    'rice/renderer'
], function (
    Sugar,
    DomReady,
    RequestAnimationFrame,
    AssetManager,
    InputManager,
    ObjectManager,
    Vector2,
    Rectangle,
    Renderer
) {
    'use strict';
    var lastTime = new Date().getTime(),
        cumulativeTime = 1000 / 60,
        canvas,
        context,
        renderer,
        styleScaling = true,
        canvasRatio = 0,
        windowRatio,
        canvasScale = {
            x: 1,
            y: 1
        },
        debug = {
            debugBar: null,
            fps: 0,
            fpsAccumulator: 0,
            fpsTicks: 0,
            fpsMaxAverage: 600,
            avg: 0,
            lastTime: 0
        },
        gameData = {},
        viewport = Rectangle(0, 0, 640, 480),
        setupDebug = function () {
            if (navigator.isCocoonJS) {
                return;
            }
            debug.debugBar = document.createElement('div');
            debug.debugBar.style['font-family'] = 'Arial';
            debug.debugBar.style.padding = '8px';
            debug.debugBar.style.position = 'absolute';
            debug.debugBar.style.right = '0px';
            debug.debugBar.style.top = '0px';
            debug.debugBar.style.color = 'white';
            debug.debugBar.innerHTML = 'fps: 0';
            document.body.appendChild(debug.debugBar);
        },
        setupCanvas = function (settings, callback) {
            var wrapper;
            canvas = document.getElementById(settings.canvasId);

            if (!canvas) {
                // no canvas, create it
                wrapper = document.getElementById('wrapper');
                if (!wrapper) {
                    throw 'Supply a canvasId to settings or add a wrapper div';
                }
                canvas = document.createElement(navigator.isCocoonJS ? 'screencanvas' : 'canvas');
                canvas.id = settings.canvasId;
                wrapper.addChild(canvas);
            }
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvasRatio = viewport.height / viewport.width;

            settings.renderer = settings.renderer || 'canvas2d';

            if (settings.renderer === 'auto') {
                settings.renderer = 'webgl';
                // canvas is accelerated in cocoonJS
                if (navigator.isCocoonJS) {
                    settings.renderer = 'canvas2d';
                }
                // should also use canvas for android?
            }

            // setup canvas 2d
            if (settings.renderer === 'canvas2d') {
                context = canvas.getContext('2d');
                if (!settings.smoothing) {
                    if (context.imageSmoothingEnabled) {
                        context.imageSmoothingEnabled = false;
                    }
                    if (context.webkitImageSmoothingEnabled) {
                        context.webkitImageSmoothingEnabled = false;
                    }
                    if (context.mozImageSmoothingEnabled) {
                        context.mozImageSmoothingEnabled = false;
                    }
                }
            }
            // setup renderer
            Renderer(settings.renderer, canvas, context, function (renderer) {
                gameData = {
                    canvas: canvas,
                    renderer: renderer,
                    canvasScale: canvasScale,
                    viewport: viewport
                };
                callback();
            });

        },
        onResize = function () {
            var width,
                height,
                innerWidth = window.innerWidth,
                innerHeight = window.innerHeight;

            windowRatio = innerHeight / innerWidth;
            // resize to fill screen
            if (windowRatio < canvasRatio) {
                width = innerHeight / canvasRatio;
                height = innerHeight;
            } else {
                width = innerWidth;
                height = innerWidth * canvasRatio;
            }
            if (styleScaling) {
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
            } else {
                canvas.width = width;
                canvas.height = height;
            }
            canvasScale.x = width / viewport.width;
            canvasScale.y = height / viewport.height;
        },
        game = {
            setup: function (settings, callback) {
                DomReady(function () {
                    var runGame = function () {
                        game.objects.run();
                        if (callback) {
                            callback();
                        }
                    };
                    if (settings.debug) {
                        setupDebug();
                    }
                    if (settings.canvasDimension) {
                        if (settings.canvasDimension.isRectangle) {
                            viewport = settings.canvasDimension || viewport;
                        } else {
                            throw 'settings.canvasDimension must be a rectangle';
                        }
                    }
                    setupCanvas(settings, function () {
                        // window resize listeners
                        window.addEventListener('resize', onResize, false);
                        window.addEventListener('orientationchange', onResize, false);
                        onResize();

                        game.input = InputManager(gameData);
                        game.objects = ObjectManager(gameData, debug);
                        game.assets = AssetManager();

                        // mix functions
                        Sugar.combine(game, game.objects);

                        if (settings.assetGroups) {
                            game.assets.loadAssetGroups(settings.assetGroups, runGame);
                        } else {
                            runGame();
                        }

                    });
                });
            },
            getViewport: function () {
                return viewport;
            },
            assets: null,
            objects: null,
            input: null
        };
    return game;
});