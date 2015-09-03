/**
 * Rectangle
 * <br>Exports: Function
 * @module bento/math/rectangle
 * @param {Number} x - Top left x position
 * @param {Number} y - Top left y position
 * @param {Number} width - Width of the rectangle
 * @param {Number} height - Height of the rectangle
 * @returns {Rectangle} Returns a rectangle.
 */
bento.define('bento/math/rectangle', ['bento/utils'], function (Utils) {
    'use strict';
    var isRectangle = function () {
            return true;
        },
        getX2 = function () {
            return this.x + this.width;
        },
        getY2 = function () {
            return this.y + this.height;
        },
        union = function (rectangle) {
            var x1 = Math.min(this.x, rectangle.x),
                y1 = Math.min(this.y, rectangle.y),
                x2 = Math.max(this.getX2(), rectangle.getX2()),
                y2 = Math.max(this.getY2(), rectangle.getY2());
            return module(x1, y1, x2 - x1, y2 - y1);
        },
        intersect = function (other) {
            if (other.isPolygon) {
                return other.intersect(this);
            } else {
                return !(this.x + this.width <= other.x ||
                    this.y + this.height <= other.y ||
                    this.x >= other.x + other.width ||
                    this.y >= other.y + other.height);
            }
        },
        intersection = function (rectangle) {
            var inter = module(0, 0, 0, 0);
            if (this.intersect(rectangle)) {
                inter.x = Math.max(this.x, rectangle.x);
                inter.y = Math.max(this.y, rectangle.y);
                inter.width = Math.min(this.x + this.width, rectangle.x + rectangle.width) - inter.x;
                inter.height = Math.min(this.y + this.height, rectangle.y + rectangle.height) - inter.y;
            }
            return inter;
        },
        offset = function (pos) {
            return module(this.x + pos.x, this.y + pos.y, this.width, this.height);
        },
        clone = function () {
            return module(this.x, this.y, this.width, this.height);
        },
        hasPosition = function (vector) {
            return !(
                vector.x < this.x ||
                vector.y < this.y ||
                vector.x >= this.x + this.width ||
                vector.y >= this.y + this.height
            );
        },
        grow = function (size) {
            this.x -= size / 2;
            this.y -= size / 2;
            this.width += size;
            this.height += size;
        },
        module = function (x, y, width, height) {
            return {
                /**
                 * X position
                 * @instance
                 * @name x
                 */
                x: x,
                /**
                 * Y position
                 * @instance
                 * @name y
                 */
                y: y,
                /**
                 * Width of the rectangle
                 * @instance
                 * @name width
                 */
                width: width,
                /**
                 * Height of the rectangle
                 * @instance
                 * @name height
                 */
                height: height,
                /**
                 * Returns true
                 * @function
                 * @returns {Boolean} Is always true
                 * @instance
                 * @name isRectangle
                 */
                isRectangle: isRectangle,
                /**
                 * Gets the lower right x position
                 * @function
                 * @returns {Number} Coordinate of the lower right position
                 * @instance
                 * @name getX2
                 */
                getX2: getX2,
                /**
                 * Gets the lower right y position
                 * @function
                 * @returns {Number} Coordinate of the lower right position
                 * @instance
                 * @name getY2
                 */
                getY2: getY2,
                /**
                 * Returns the union of 2 rectangles
                 * @function
                 * @param {Rectangle} other - Other rectangle
                 * @returns {Rectangle} Union of the 2 rectangles
                 * @instance
                 * @name union
                 */
                union: union,
                /**
                 * Returns true if 2 rectangles intersect
                 * @function
                 * @param {Rectangle} other - Other rectangle
                 * @returns {Boolean} True of 2 rectangles intersect
                 * @instance
                 * @name intersect
                 */
                intersect: intersect,
                /**
                 * Returns the intersection of 2 rectangles
                 * @function
                 * @param {Rectangle} other - Other rectangle
                 * @returns {Rectangle} Intersection of the 2 rectangles
                 * @instance
                 * @name intersection
                 */
                intersection: intersection,
                /**
                 * Moves rectangle by an offset
                 * @function
                 * @param {Vector2} vector - Position to offset
                 * @returns {Rectangle} Returns a new rectangle instance
                 * @instance
                 * @name offset
                 */
                offset: offset,
                /**
                 * Clones rectangle
                 * @function
                 * @returns {Rectangle} a clone of the current rectangle
                 * @instance
                 * @name clone
                 */
                clone: clone,
                /**
                 * Checks if Vector2 lies within the rectangle
                 * @function
                 * @returns {Boolean} true if position is inside
                 * @instance
                 * @name hasPosition
                 */
                hasPosition: hasPosition,
                /**
                 * Increases rectangle size from the center
                 * @function
                 * @returns {Number} value to grow the rectangle
                 * @instance
                 * @name grow
                 */
                grow: grow
            };
        };
    return module;
});