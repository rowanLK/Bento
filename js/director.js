/**
 *  @copyright (C) 1HandGaming
 */
rice.define('rice/director', [
    'rice/sugar',
    'rice/game',
    'rice/screen'
], function (Sugar, Game, Screen) {
    'use strict';
    var screens = {},
        currentScreen = null,
        getScreen = function (name) {
            return screens[name];
        },
        director = {
            addScreen: function (screen) {
                if (!screen.name) {
                    throw 'Add name property to screen';
                }
                screens[screen.name] = screen;
            },
            showScreen: function (name, callback) {
                if (currentScreen !== null) {
                    director.hideScreen();
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
                    rice.require([name], function (screen) {
                        if (!screen.name) {
                            screen.name = name;
                        }
                        director.addScreen(screen);
                        // try again
                        director.showScreen(name, callback);
                    });
                }
            },
            hideScreen: function () {
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

    return director;
});