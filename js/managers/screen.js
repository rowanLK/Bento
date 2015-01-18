/**
 *  @copyright (C) HeiGames
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
                add: function (screen) {
                    if (!screen.name) {
                        throw 'Add name property to screen';
                    }
                    screens[screen.name] = screen;
                },
                show: function (name, callback) {
                    if (currentScreen !== null) {
                        screenManager.hide();
                    }
                    currentScreen = screens[name];
                    if (currentScreen) {
                        if (currentScreen.onShow) {
                            currentScreen.onShow();
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
                            screenManager.show(name, callback);
                        });
                    }
                },
                hide: function () {
                    if (!currentScreen) {
                        return;
                    }
                    currentScreen.onHide();
                    currentScreen = null;
                },
                getCurrentScreen: function () {
                    return currentScreen;
                }
            };

        return screenManager;

    };
});