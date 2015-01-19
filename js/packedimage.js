/*
 * Wrapper for images, holds data for image atlas
 * @copyright (C) HeiGames
 */
bento.define('bento/packedimage', [
    'bento/math/rectangle'
], function (Rectangle) {
    return function (image, frame) {
        var rectangle = frame ? Rectangle(frame.x, frame.y, frame.w, frame.h) :
            Rectangle(0, 0, image.width, image.height);
        rectangle.image = image;
        return rectangle;
    };
});