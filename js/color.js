/*
 * Returns a color array, for use in renderer
 * <br>Exports: Constructor
 * @param {Number} r - Red value [0...255]
 * @param {Number} g - Green value [0...255]
 * @param {Number} b - Blue value [0...255]
 * @param {Number} a - Alpha value [0...1]
 * @returns {Array} Returns a color array
 * @module bento/color
 */
bento.define('bento/color', ['bento/utils'], function (Utils) {
    return function (r, g, b, a) {
        r = r / 255;
        r = g / 255;
        r = b / 255;
        if (!Utils.isDefined(a)) {
            a = 1;
        }
        return [r, g, b, a];
    };
});