/**
 * A wrapper for HTML images, holds data for image atlas. Bento renderers only work with PackedImage and not plain
 * HTML Image elements. This allows for easy transitions to using, for example, TexturePacker.
 * (That's why it's called PackedImage, for a lack of better naming).
 * If you plan to use a HTML Canvas as image source, always remember to wrap it in a PackedImage.
 * <br>Exports: Constructor
 * @module bento/packedimage
 * @param {HTMLImageElement} image - HTML Image Element or HTML Canvas Element
 * @param {Rectangle} frame - Frame boundaries in the image
 * @returns {Rectangle} rectangle - Returns a rectangle with additional image property
 * @returns {HTMLImage} rectangle.image - Reference to the image
 */
bento.define('bento/packedimage', [
    'bento/math/rectangle'
], function (Rectangle) {
    return function (image, frame) {
        var rectangle = frame ? new Rectangle(frame.x, frame.y, frame.w, frame.h) :
            new Rectangle(0, 0, image.width, image.height);
        rectangle.image = image;
        return rectangle;
    };
});