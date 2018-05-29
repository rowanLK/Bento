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
    //var Bento;

    var canvas = window.canvas;
    var context = canvas.getContext('2d');
    var renderer;
    var dev = false;
    var gameData = {};
    var viewport = new Rectangle(0, 0, 640, 480);

    var setupCanvas = function (settings) {};
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
            Bento.renderer = rend;
            Ejecta.setRenderer(Bento.renderer);
            gameData = Bento.getGameData();
            onComplete();
        });

        // cocoon only: set antiAlias with smoothing parameter
        if (Utils.isDefined(settings.smoothing) && Utils.isCocoonJs() && window.Cocoon && window.Cocoon.Utils) {
            window.Cocoon.Utils.setAntialias(settings.smoothing);
        }
    };

    Bento.setup = function (settings, callback) {
        // pull apart settings before calling JSSetup
        callback = callback || settings.onComplete || settings.onLoad;
        Bento.settings = settings;
        var runGame = function () {
            // Bento.objects.run();
            if (callback) {
                callback();
            }
        };
        if (Utils.isUndefined(settings.canvasDimension)) {
            settings.canvasDimension.width = 1280;
            settings.canvasDimension.height = 720;
            Bento.setViewportDimension(settings.canvasDimension);
        } else {
            Bento.setViewportDimension(settings.canvasDimension);
        }
        settings.sortMode = settings.sortMode || 0;
        setupCanvas(settings);
        setupRenderer(settings, function () {
            dev = settings.dev || false;

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
        });
    };

    Bento.getRenderer = function () {
        return Bento.renderer;
    };

    Bento.getCanvas = function () {
        return window.canvas;
    };

    Bento.getSettings = function () {
        return Bento.settings;
    };

    Bento.isDev = function () {
        return dev;
    };

    Bento.saveState = SaveState;
    return Bento;
});