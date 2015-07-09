/**
 * Returns a color array, for use in renderer
 * <br>Exports: Function
 * @param {Number} r - red value [0...255]
 * @param {Number} g - green value [0...255]
 * @param {Number} b - blue value [0...255]
 * @param {Number} a - alpha value [0...1]
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