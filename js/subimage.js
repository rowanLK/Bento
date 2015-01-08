rice.define('rice/subimage', [
    'rice/math/rectangle'
], function (Rectangle) {
    return function (image, frame) {
        var rectangle = Rectangle(frame.x, frame.y, frame.w, frame.h);
        rectangle.image = image;
        return rectangle;
    };
});