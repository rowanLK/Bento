/**
 *  @copyright (C) 1HandGaming
 */
rice.define('rice/screen', [
    'rice/sugar',
    'rice/game',
    'rice/math/rectangle'
], function (Sugar, Game, Rectangle) {
    'use strict';
    return function (name) {
        var viewport = Game.getViewport(),
            dimension = Rectangle(0, 0, 0, 0),
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
                    return Sugar.combine(this, object);
                },
                /**
                 * Get the name of the screen
                 * @name getName
                 * @memberOf screen
                 * @function
                 * @return Screen name as string
                 */
                getName: function () {
                    return name;
                },
                /**
                 * Set a boolean that defines if the screen is shown
                 * @name setShown
                 * @memberOf screen
                 * @function
                 */
                setShown: function (bool) {
                    if (!Sugar.isBoolean(bool)) {
                        throw 'Argument is not a boolean';
                    } else {
                        isShown = bool;
                    }
                },
                onShow: function () {},
                onHide: function () {
                    // remove all objects
                    Game.removeAll();
                    // reset viewport scroll when hiding screen
                    viewport.x = 0;
                    viewport.y = 0;

                }
            };

        return module;
    };
});