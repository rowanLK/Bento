/*
 * Screen/state object
 * @copyright (C) HeiGames
 */
bento.define('bento/screen', [
    'bento/utils',
    'bento',
    'bento/math/rectangle',
    'bento/tiled'
], function (Utils, Bento, Rectangle, Tiled) {
    'use strict';
    return function (settings) {
        /*settings = {
            dimension: Rectangle, [optional / overwritten by tmx size]
            tiled: String
        }*/
        var viewport = Bento.getViewport(),
            dimension = settings ? settings.dimension : Bento.getViewport(),
            tiled,
            isShown = false,
            module = {
                name: null,
                setDimension: function (rectangle) {
                    dimension.width = rectangle.width;
                    dimension.height = rectangle.height;
                },
                getDimension: function () {
                    return dimension;
                },
                extend: function (object) {
                    return Utils.extend(this, object);
                },
                setShown: function (bool) {
                    if (!Utils.isBoolean(bool)) {
                        throw 'Argument is not a boolean';
                    } else {
                        isShown = bool;
                    }
                },
                loadTiled: function (name) {
                    tiled = Tiled({
                        name: name,
                        spawn: true // TEMP
                    });
                },
                onShow: function () {
                    // load tiled map if present
                    if (settings && settings.tiled) {
                        this.loadTiled(settings.tiled);
                    }
                },
                onHide: function () {
                    // remove all objects
                    Bento.removeAll();
                    // reset viewport scroll when hiding screen
                    viewport.x = 0;
                    viewport.y = 0;
                }
            };

        return module;
    };
});