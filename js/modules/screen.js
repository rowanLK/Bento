/**
 *  @copyright (C) HeiGames
 */
bento.define('bento/screen', [
    'bento/utils',
    'bento',
    'bento/math/rectangle',
    'bento/tiled'
], function (Utils, Bento, Rectangle) {
    'use strict';
    return function (settings) {
        /*settings = {
            dimension: Rectangle, [optional / overwritten by tmx size]
            tiled: String
        }*/
        var viewport = Bento.getViewport(),
            dimension = settings.dimension || Rectangle(0, 0, 0, 0),
            isShown = false,
            module = {
                setDimension: function (rectangle) {
                    dimension.width = rectangle.width;
                    dimension.height = rectangle.height;
                },
                getDimension: function () {
                    return dimension;
                },
                add: function (object) {
                    return Utils.combine(this, object);
                },
                setShown: function (bool) {
                    if (!Utils.isBoolean(bool)) {
                        throw 'Argument is not a boolean';
                    } else {
                        isShown = bool;
                    }
                },
                onShow: function () {},
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