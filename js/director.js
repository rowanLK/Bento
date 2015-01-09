/**
 *  @copyright (C) 1HandGaming
 */
rice.define('glue/director', [
    'rice/sugar',
    'rice/game',
    'rice/screen'
], function (Sugar, Game, Screen) {
    'use strict';
    var screens = {},
        activeScreen = null,
        getScreen = function (name) {
            return screens[name];
        },
        module = {
            /**
             * Add a screen to the Director
             * @name addScreen
             * @memberOf Director
             * @function
             */
            addScreen: function (screen) {
                if (!screen.getName()) {
                    throw 'Add name property to screen';
                }
                screens[screen.getName()] = screen;
            },
            /**
             * Show a screen
             * @name showScreen
             * @memberOf Director
             * @function
             */
            showScreen: function (name, callback) {
                if (activeScreen !== null) {
                    this.hideScreen();
                }
                activeScreen = screens[name];
                if (activeScreen) {
                    activeScreen.onShow();
                } else {
                    throw 'Could not find screen';
                }
            },
            /**
             * Hides current screen
             * @name hideScreen
             * @memberOf Director
             * @function
             */
            hideScreen: function () {
                if (!activeScreen) {
                    return;
                }
                activeScreen.onHide();
                activeScreen = null;
            },
            /*
             * Get the active screen
             * @name getActiveScreen
             * @memberOf Director
             * @function
             */
            getActiveScreen: function () {
                return activeScreen;
            }
        };

    return module;
});