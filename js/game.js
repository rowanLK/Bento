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
    'rice/math/rectangle'
], function (
    Sugar,
    DomReady,
    RequestAnimationFrame,
    AssetManager,
    InputManager,
    ObjectManager,
    Vector2,
    Rectangle
) {
    'use strict';
    var lastTime = new Date().getTime(),
        cumulativeTime = 1000 / 60,
        canvas,
        context,
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
            debug.debugBar = document.createElement('div');
            debug.debugBar.style['font-family'] = 'Arial';
            debug.debugBar.style.padding = '8px';
            debug.debugBar.style.position = 'absolute';
            debug.debugBar.style.right = '0px';
            debug.debugBar.style.top = '0px';
            debug.debugBar.innerHTML = 'fps: 0';
            document.body.appendChild(debug.debugBar);
        },
        setupCanvas2D = function (canvasId, smoothing) {
            canvas = document.getElementById(canvasId);

            if (canvas) {
                context = canvas.getContext('2d');
                if (!smoothing) {
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

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvasRatio = viewport.height / viewport.width;

                gameData = {
                    canvas: canvas,
                    context: context,
                    canvasScale: canvasScale,
                    viewport: viewport
                };
            } else {
                // no canvas, create it?
                throw 'No canvas found';
            }
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
            init: function (settings, callback) {
                DomReady(function () {
                    var runGame = function () {
                        ObjectManager.run();
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
                    if (!settings.renderer || settings.renderer = '2d') {
                        setupCanvas2D(settings.canvasId, settings.smoothing);
                    }

                    // window resize listeners
                    window.addEventListener('resize', onResize, false);
                    window.addEventListener('orientationchange', onResize, false);
                    onResize();

                    InputManager.init({
                        canvas: canvas,
                        canvasScale: canvasScale,
                        viewport: viewport
                    });
                    ObjectManager.init(gameData, debug);
                    if (settings.assetGroups) {
                        AssetManager.loadAssetGroups(settings.assetGroups, runGame);
                    } else {
                        runGame();
                    }
                });
            },
            getViewport: function () {
                return viewport;
            },
            Assets: AssetManager,
            Objects: ObjectManager
        };

    // mix functions
    Sugar.combine(game, ObjectManager);
    return game;
});