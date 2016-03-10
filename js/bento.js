/**
 * Bento module, main entry point to game modules and managers. Start the game by using Bento.setup().
 * After this you have access to all Bento managers:<br>
 * • Bento.assets<br>
 * • Bento.audio<br>
 * • Bento.input<br>
 * • Bento.object<br>
 * • Bento.savestate<br>
 * • Bento.screen<br>
 * <br>Exports: Object
 * @module bento
 */
bento.define('bento', [
    'bento/utils',
    'bento/lib/domready',
    'bento/eventsystem',
    'bento/managers/asset',
    'bento/managers/input',
    'bento/managers/object',
    'bento/managers/audio',
    'bento/managers/screen',
    'bento/managers/savestate',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/renderer'
], function (
    Utils,
    DomReady,
    EventSystem,
    AssetManager,
    InputManager,
    ObjectManager,
    AudioManager,
    ScreenManager,
    SaveState,
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
        bentoSettings,
        styleScaling = true,
        canvasRatio = 0,
        windowRatio,
        manualResize = false,
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
        viewport = new Rectangle(0, 0, 640, 480),
        setupDebug = function () {
            if (Utils.isCocoonJS()) {
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

            var button = document.createElement('button');
            button.innerHTML = 'button';
            debug.debugBar.appendChild(button);
        },
        setupCanvas = function (settings, callback) {
            var parent,
                pixelRatio = window.devicePixelRatio || 1,
                windowWidth = window.innerWidth * pixelRatio,
                windowHeight = window.innerHeight * pixelRatio;

            canvas = document.getElementById(settings.canvasId);

            if (!canvas) {
                // no canvas, create it
                parent = document.getElementById('wrapper');
                if (!parent) {
                    // just append it to the document body
                    parent = document.body;
                }
                canvas = document.createElement(Utils.isCocoonJS() ? 'screencanvas' : 'canvas');
                canvas.id = settings.canvasId;
                parent.appendChild(canvas);
            }
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvasRatio = viewport.height / viewport.width;

            settings.renderer = settings.renderer || 'auto';

            if (settings.renderer === 'auto') {
                // automatically set/overwrite pixelSize
                if (windowWidth > windowHeight) {
                    settings.pixelSize = Math.round(Math.max(windowHeight / canvas.height, 1));
                } else {
                    settings.pixelSize = Math.round(Math.max(windowWidth / canvas.width, 1));
                }
                // max pixelSize 3 (?)
                settings.pixelSize = Math.min(settings.pixelSize, 3);

                settings.renderer = 'webgl';
                // canvas is accelerated in cocoonJS
                // should also use canvas for android?
                if (Utils.isCocoonJS() /*|| Utils.isAndroid()*/ ) {
                    settings.renderer = 'canvas2d';
                }
            }
            // setup renderer
            Renderer(settings.renderer, canvas, settings, function (rend) {
                renderer = rend;
                gameData = {
                    canvas: canvas,
                    renderer: rend,
                    canvasScale: canvasScale,
                    viewport: viewport,
                    entity: null
                };
                callback();
            });

        },
        onResize = function () {
            var width,
                height,
                innerWidth = window.innerWidth,
                innerHeight = window.innerHeight;

            if (manualResize) {
                return;
            }

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
        module = {
            /**
             * Setup game. Initializes all Bento managers.
             * @name setup
             * @function
             * @instance
             * @param {Object} settings - settings for the game
             * @param {Object} [settings.assetGroups] - Asset groups to load. Key: group name, value: path to json file. See {@link module:bento/managers/asset#loadAssetGroups}
             * @param {Rectangle} settings.canvasDimension - base resolution for the game
             * @param {Boolean} settings.manualResize - Whether Bento should resize the canvas to fill automatically
             * @param {Boolean} settings.sortMode - Bento Object Manager sorts objects by their z value. See {@link module:bento/managers/object#setSortMode}
             * @param {Boolean} settings.subPixel - Round
             * @param {Boolean} settings.preventContextMenu - Stops the context menu from appearing in browsers when using right click
             * @param {Object} settings.reload - Settings for module reloading, set the event names for Bento to listen
             * @param {String} settings.reload.simple - Event name for simple reload: reloads modules and resets current screen
             * @param {String} settings.reload.assets - Event name for asset reload: reloads modules and all assets and resets current screen
             * @param {String} settings.reload.jump - Event name for screen jump: asks user to jumps to a screen
             * @param {Function} callback - Called when game is loaded (not implemented yet)
             */
            setup: function (settings, callback) {
                bentoSettings = settings;
                DomReady(function () {
                    var runGame = function () {
                        module.objects.run();
                        if (callback) {
                            callback();
                        }
                    };
                    if (settings.canvasDimension) {
                        if (settings.canvasDimension.isRectangle) {
                            viewport = settings.canvasDimension || viewport;
                        } else {
                            throw 'settings.canvasDimension must be a rectangle';
                        }
                    }
                    settings.sortMode = settings.sortMode || 0;
                    setupCanvas(settings, function () {
                        // window resize listeners
                        manualResize = settings.manualResize;
                        window.addEventListener('resize', onResize, false);
                        window.addEventListener('orientationchange', onResize, false);
                        onResize();

                        module.input = InputManager(gameData, settings);
                        module.objects = ObjectManager(gameData, settings);
                        module.assets = AssetManager();
                        module.audio = AudioManager(module);
                        module.screens = ScreenManager();

                        // mix functions
                        Utils.extend(module, module.objects);

                        if (settings.assetGroups) {
                            module.assets.loadAssetGroups(settings.assetGroups, runGame);
                        } else {
                            runGame();
                        }
                        // start watching for new modules
                        bento.watch();
                        // reload keys
                        if (settings.reload) {
                            if (settings.reload.simple) {
                                EventSystem.on(settings.reload.simple, function () {
                                    module.reload();
                                });
                            }
                            if (settings.reload.assets) {
                                EventSystem.on(settings.reload.assets, function () {
                                    module.assets.reload(module.reload);
                                });
                            }
                            if (settings.reload.jump) {
                                EventSystem.on(settings.reload.jump, function () {
                                    var res = prompt('Show which screen?');
                                    module.screens.show(res);
                                });
                            }
                        }
                    });
                });
            },
            /**
             * Returns the settings object supplied to Bento.setup
             * @function
             * @instance
             * @returns Object
             * @name getSettings
             */
            getSettings: function () {
                return bentoSettings;
            },
            /**
             * Returns the current viewport (reference).
             * The viewport is a Rectangle.
             * viewport.x and viewport.y indicate its current position in the world (upper left corner)
             * viewport.width and viewport.height can be used to determine the size of the canvas
             * @function
             * @instance
             * @returns Rectangle
             * @name getViewport
             */
            getViewport: function () {
                return viewport;
            },
            /**
             * Returns the canvas element
             * @function
             * @instance
             * @returns HTML Canvas Element
             * @name getCanvas
             */
            getCanvas: function () {
                return canvas;
            },
            /**
             * Returns the current renderer engine
             * @function
             * @instance
             * @returns Renderer
             * @name getRenderer
             */
            getRenderer: function () {
                return renderer;
            },
            /**
             * Reloads modules and jumps to screen. If no screenName was passed,
             * it reloads the current screen.
             * @function
             * @instance
             * @param {String} screenName - screen to show
             * @name reload
             */
            reload: function (screenName) {
                var currentScreen,
                    Bento = module;
                if (!Bento.screens) {
                    throw 'Bento has not beens started yet.';
                }
                currentScreen = Bento.screens.getCurrentScreen();

                if (!currentScreen) {
                    console.log('WARNING: No screen has been loaded.');
                    return;
                }

                Bento.screens.reset();
                Bento.objects.resume();

                Bento.objects.stop();
                bento.refresh();

                // reload current screen
                Bento.screens.show(screenName || currentScreen.name);
                // restart the mainloop
                setTimeout(Bento.objects.run, 120);
            },
            /**
             * Returns a gameData object
             * A gameData object is passed through every object during the update and draw
             * and contains all necessary information to render
             * @function
             * @instance
             * @returns {Object} data
             * @returns {HTMLCanvas} data.canvas - Reference to the current canvas element
             * @returns {Renderer} data.renderer - Reference to current Renderer
             * @returns {Vector2} data.canvasScale - Reference to current canvas scale
             * @returns {Rectangle} data.viewport - Reference to viewport object
             * @returns {Entity} data.entity - The current entity passing the data object (injected by Entity objects)
             * @name getGameData
             */
            getGameData: function () {
                return {
                    canvas: canvas,
                    renderer: renderer,
                    canvasScale: canvasScale,
                    viewport: viewport,
                    entity: null
                };
            },
            /**
             * Asset manager
             * @see module:bento/managers/asset
             * @instance
             * @name assets
             */
            assets: null,
            /**
             * Object manager
             * @see module:bento/managers/object
             * @instance
             * @name objects
             */
            objects: null,
            /**
             * Input manager
             * @see module:bento/managers/input
             * @instance
             * @name objects
             */
            input: null,
            /**
             * Audio manager
             * @see module:bento/managers/audio
             * @instance
             * @name audio
             */
            audio: null,
            /**
             * Screen manager
             * @see module:bento/managers/screen
             * @instance
             * @name screen
             */
            screens: null,
            /**
             * SaveState manager
             * @see module:bento/managers/savestate
             * @instance
             * @name saveState
             */
            saveState: SaveState,
            utils: Utils
        };
    return module;
});