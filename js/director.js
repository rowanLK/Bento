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
        module = {
            addScreen: function (screen) {
                if (!screen.getName()) {
                    throw 'Add name property to screen';
                }
                screens[screen.getName()] = screen;
            },
            showScreen: function (name, callback) {
                if (currentScreen !== null) {
                    this.hideScreen();
                }
                currentScreen = screens[name];
                if (currentScreen) {
                    currentScreen.onShow();
                } else {
                    throw 'Could not find screen';
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

    return module;
});