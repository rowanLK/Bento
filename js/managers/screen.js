/**
 * Manager that controls screens/rooms/levels.
 * <br>Exports: Function
 * @module bento/managers/screen
 * @returns ScreenManager
 */
bento.define('bento/managers/screen', [
    'bento/utils'
], function (Utils) {
    'use strict';
    return function () {
        var screens = {},
            currentScreen = null,
            getScreen = function (name) {
                return screens[name];
            },
            screenManager = {
                /**
                 * Adds a new screen
                 * @function
                 * @instance
                 * @param {Screen} screen - Screen object
                 * @name add
                 */
                add: function (screen) {
                    if (!screen.name) {
                        throw 'Add name property to screen';
                    }
                    screens[screen.name] = screen;
                },
                /**
                 * Shows a screen. If the screen was not added previously, it
                 * will be loaded asynchronously by a require call.
                 * @function
                 * @instance
                 * @param {String} name - Name of the screen
                 * @param {Object} data - Extra data to pass on to the screen
                 * @param {Function} callback - Called when screen is shown
                 * @name show
                 */
                show: function (name, data, callback) {
                    if (currentScreen !== null) {
                        screenManager.hide();
                    }
                    currentScreen = screens[name];
                    if (currentScreen) {
                        if (currentScreen.onShow) {
                            currentScreen.onShow(data);
                        }
                        if (callback) {
                            callback();
                        }
                    } else {
                        // load asynchronously
                        bento.require([name], function (screenObj) {
                            if (!screenObj.name) {
                                screenObj.name = name;
                            }
                            screenManager.add(screenObj);
                            // try again
                            screenManager.show(name, data, callback);
                        });
                    }
                },
                /**
                 * Hides a screen. It's not needed to call this yourself.
                 * Screens are hidden when a new one is shown.
                 * @function
                 * @instance
                 * @param {Object} data - Extra data to pass on to the screen
                 * @name hide
                 */
                hide: function (data) {
                    if (!currentScreen) {
                        return;
                    }
                    currentScreen.onHide(data);
                    currentScreen = null;
                },
                /**
                 * Retuyrn reference to the screen currently shown.
                 * @function
                 * @instance
                 * @returns {Screen} The current screen
                 * @name getCurrentScreen
                 */
                getCurrentScreen: function () {
                    return currentScreen;
                }
            };

        return screenManager;

    };
});