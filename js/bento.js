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
 * @moduleName Bento
 *
 *
 * @snippet Bento.assets|assets
Bento.assets
 * @snippet Bento.objects|objects
Bento.objects
 * @snippet Bento.saveState|saveState
Bento.saveState
 * @snippet Bento.screens|screens
Bento.screens
 * @snippet Bento.audio|audio
Bento.audio
 *
 * @snippet Bento.assets.getJson|Object
Bento.assets.getJson('${1}');
 *
 * @snippet Bento.objects.attach|snippet
Bento.objects.attach(${1:entity});
 * @snippet Bento.objects.remove|snippet
Bento.objects.remove(${1:entity});
 * @snippet Bento.objects.get|Entity/Object
Bento.objects.get('${1}', function (${1:entity}) {
    $2
});
 * @snippet Bento.objects.getByFamily|Entity/Object
Bento.objects.getByFamily('${1}', function (array) {$2});
 *
 * @snippet Bento.audio.playSound|snippet
Bento.audio.playSound('sfx_${1}');
 * @snippet Bento.audio.stopSound|snippet
Bento.audio.stopSound('sfx_${1}');
 * @snippet Bento.audio.playMusic|snippet
Bento.audio.playMusic('bgm_${1}');
 * @snippet Bento.audio.stopAllMusic|snippet
Bento.audio.stopAllMusic();
 * @snippet Bento.audio.setVolume|snippet
Bento.audio.setVolume: function (${1:1}, '${2:name}');
 * @snippet Bento.audio.isPlayingMusic|Boolean
Bento.audio.isPlayingMusic: function ('${1:name}');
 *
 * @snippet Bento.saveState.save|snippet
Bento.saveState.save('${1}', ${2:value});
 * @snippet Bento.saveState.load|Value
Bento.saveState.load('${1}', ${2:defaultValue});
 * @snippet Bento.saveState.add|snippet
Bento.saveState.add('${1}', ${2:value});
 *
 * @snippet Bento.screens.show|snippet
Bento.screens.show('screens/${1:name}');
 * @snippet Bento.screens.getCurrentScreen|Screen
Bento.screens.getCurrentScreen();
 *
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
    var canvas;
    var context;
    var renderer;
    var bentoSettings;
    var canvasRatio = 0;
    var windowRatio;
    var throttle = 1;
    var canvasScale = {
        x: 1,
        y: 1
    };
    var dev = false;
    var gameData = {};
    var viewport = new Rectangle(0, 0, 640, 480);
    var setupCanvas = function (settings) {
        var parent;
        var pixelSize = settings.pixelSize || 1;
        var pixelRatio = window.devicePixelRatio || 1;
        var windowWidth = window.innerWidth * pixelRatio;
        var windowHeight = window.innerHeight * pixelRatio;

        canvas = settings.canvasElement || document.getElementById(settings.canvasId);

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
        canvas.width = viewport.width * pixelSize;
        canvas.height = viewport.height * pixelSize;
        canvasRatio = viewport.height / viewport.width;
    };
    var setupRenderer = function (settings, onComplete) {
        var rendererName;
        settings.renderer = settings.renderer ? settings.renderer.toLowerCase() : 'canvas2d';

        // canvas2d and pixi are reserved names
        if (settings.renderer === 'canvas2d') {
            rendererName = 'bento/renderers/canvas2d';
        } else if (settings.renderer === 'pixi') {
            rendererName = 'bento/renderers/pixi';
        } else if (settings.renderer === 'auto') {
            // auto renderer is deprecated! use canvas2d or pixi
            console.log('WARNING: auto renderer is deprecated. Please use canvas2d or pixi as renderers.');
            rendererName = 'bento/renderers/canvas2d';
        }
        // setup renderer
        new Renderer(rendererName, canvas, settings, function (rend) {
            console.log('Init ' + rend.name + ' as renderer');
            renderer = rend;
            gameData = Bento.getGameData();
            onComplete();
        });
    };
    /**
     * Bento's default behavior to resize to fit
     */
    var onResize = function () {
        var clientWidth,
            clientHeight,
            innerWidth = window.innerWidth,
            innerHeight = window.innerHeight;

        windowRatio = innerHeight / innerWidth;
        // resize to fit screen
        if (windowRatio < canvasRatio) {
            clientWidth = innerHeight / canvasRatio;
            clientHeight = innerHeight;
        } else {
            clientWidth = innerWidth;
            clientHeight = innerWidth * canvasRatio;
        }
        canvas.style.width = clientWidth + 'px';
        canvas.style.height = clientHeight + 'px';

        canvasScale.x = clientWidth / viewport.width;
        canvasScale.y = clientHeight / viewport.height;
    };
    var setScreenshotListener = function (evtName) {
        var takeScreenshot = false;
        // web only
        var downloadImage = function (uri, name) {
            var link = document.createElement("a");
            link.download = name;
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (navigator.isCocoonJS || window.Windows || window.ejecta) {
            // disable in Cocoon, UWP and Ejecta/tvOS platforms
            return;
        }
        if (!dev) {
            // should be in dev mode to take screenshots (?)
            return;
        }

        EventSystem.on(evtName, function () {
            takeScreenshot = true;
        });
        EventSystem.on('postDraw', function (data) {
            if (takeScreenshot) {
                takeScreenshot = false;
                downloadImage(canvas.toDataURL(), 'screenshot');
            }
        });

    };
    var Bento = {
        // version is updated by build, edit package.json
        version: '1.0.0',
        /**
         * Setup game. Initializes all Bento managers.
         * @name setup
         * @function
         * @instance
         * @param {Object} settings - settings for the game
         * @param {Object} [settings.assetGroups] - Asset groups to load. Key: group name, value: path to json file. See {@link module:bento/managers/asset#loadAssetGroups}
         * @param {String} settings.renderer - Renderer to use. Defaults to "canvas2d". To use "pixi", include the pixi.js file manually. Make sure to download v3!.
         * @param {Rectangle} settings.canvasDimension - base resolution for the game. Tip: use a bento/autoresize rectangle.
         * @param {Boolean} settings.manualResize - Whether Bento should resize the canvas to fill automatically
         * @param {Boolean} settings.sortMode - Bento Object Manager sorts objects by their z value. See {@link module:bento/managers/object#setSortMode}
         * @param {Boolean} settings.subPixel - Disable rounding of pixels
         * @param {Number} settings.pixelSize - Defaults to 1. You may resize pixels by setting this value. A kind of cheating with pixelart games.
         * @param {Boolean} settings.preventContextMenu - Stops the context menu from appearing in browsers when using right click
         * @param {Object} settings.reload - Settings for module reloading, set the event names for Bento to listen
         * @param {String} settings.reload.simple - Event name for simple reload: reloads modules and resets current screen
         * @param {String} settings.reload.assets - Event name for asset reload: reloads modules and all assets and resets current screen
         * @param {String} settings.reload.jump - Event name for screen jump: asks user to jumps to a screen
         * @param {Boolean} settings.dev - Use dev mode (for now it's only used for deciding between using throws or console.log's). Optional, default is false.
         * @param {Object} settings.screenshot - Event name for taking screenshots
         * @param {Function} settings.onComplete - Called when game is loaded
         */
        setup: function (settings, callback) {
            callback = callback || settings.onComplete || settings.onLoad;
            bentoSettings = settings;
            DomReady(function () {
                var runGame = function () {
                    Bento.objects.run();
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
                setupCanvas(settings);
                setupRenderer(settings, function () {
                    dev = settings.dev || false;
                    Utils.setDev(dev);
                    // window resize listeners
                    if (!settings.manualResize) {
                        window.addEventListener('resize', onResize, false);
                        window.addEventListener('orientationchange', onResize, false);
                        onResize();
                    }

                    Bento.input = new InputManager(gameData, settings);
                    Bento.objects = new ObjectManager(Bento.getGameData, settings);
                    Bento.assets = new AssetManager();
                    Bento.audio = new AudioManager(Bento);
                    Bento.screens = new ScreenManager();

                    // mix functions
                    Utils.extend(Bento, Bento.objects);

                    if (settings.assetGroups) {
                        Bento.assets.loadAssetGroups(settings.assetGroups, runGame);
                    } else {
                        // try loadings assets.json from the root folder
                        Bento.assets.loadAssetsJson(function (error) {
                            runGame();
                        });
                    }
                    // start watching for new modules
                    bento.watch();
                    // reload keys
                    if (settings.reload && settings.dev) {
                        if (settings.reload.simple) {
                            EventSystem.on(settings.reload.simple, function () {
                                Bento.reload();
                            });
                        }
                        if (settings.reload.assets) {
                            EventSystem.on(settings.reload.assets, function () {
                                Bento.assets.loadAssetsJson(function (error) {
                                    Bento.assets.reload(Bento.reload);
                                });
                            });
                        }
                        if (settings.reload.jump) {
                            EventSystem.on(settings.reload.jump, function () {
                                var res = window.prompt('Show which screen?');
                                Bento.screens.show(res);
                            });
                        }
                    }

                    // screenshot key
                    if (settings.screenshot && settings.dev) {
                        setScreenshotListener(settings.screenshot);
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
            var currentScreen;
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

            // reset game speed
            throttle = 1;

            // reload current screen
            Bento.screens.show(screenName || currentScreen.name, undefined,
                function () {
                    // restart the mainloop
                    Bento.objects.run();
                    EventSystem.fire('bentoReload', {});
                });
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
         * @returns {Entity} data.entity - The current entity passing the data object
         * @returns {Number} data.deltaT - Time passed since last tick
         * @returns {Number} data.throttle - Game speed (1 is normal)
         * @name getGameData
         */
        getGameData: function () {
            return {
                canvas: canvas,
                renderer: renderer,
                canvasScale: canvasScale,
                viewport: viewport,
                entity: null,
                event: null,
                deltaT: 0,
                speed: throttle
            };
        },
        /**
         * Gets the current game speed
         * @function
         * @instance
         * @returns Number
         * @name getGameSpeed
         */
        getGameSpeed: function () {
            return throttle;
        },
        /**
         * Sets the current game speed. Defaults to 1.
         * @function
         * @instance
         * @param {Number} speed - Game speed
         * @returns Number
         * @name setGameSpeed
         */
        setGameSpeed: function (value) {
            throttle = value;
        },
        /**
         * Is game in dev mode?
         * @function
         * @instance
         * @returns Boolean
         * @name isDev
         */
        isDev: function () {
            return dev;
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
    return Bento;
});