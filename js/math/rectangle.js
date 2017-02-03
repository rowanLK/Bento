/**
 * Rectangle
 * <br>Exports: Constructor
 * @module bento/math/rectangle
 * @moduleName Rectangle
 * @param {Number} x - Top left x position
 * @param {Number} y - Top left y position
 * @param {Number} width - Width of the rectangle
 * @param {Number} height - Height of the rectangle
 * @returns {Rectangle} Returns a rectangle.
 */
bento.define('bento/math/rectangle', ['bento/utils', 'bento/math/vector2'], function (Utils, Vector2) {
    'use strict';
    var Rectangle = function (x, y, width, height) {
        /**
         * X position
         * @instance
         * @name x
         */
        this.x = x;
        /**
         * Y position
         * @instance
         * @name y
         */
        this.y = y;
        /**
         * Width of the rectangle
         * @instance
         * @name width
         */
        this.width = width;
        /**
         * Height of the rectangle
         * @instance
         * @name height
         */
        this.height = height;
    };
    /**
     * Returns true
     * @function
     * @returns {Boolean} Is always true
     * @instance
     * @name isRectangle
     */
    Rectangle.prototype.isRectangle = function () {
        return true;
    };
    /**
     * Gets the lower right x position
     * @function
     * @returns {Number} Coordinate of the lower right position
     * @instance
     * @name getX2
     */
    Rectangle.prototype.getX2 = function () {
        return this.x + this.width;
    };
    /**
     * Gets the lower right y position
     * @function
     * @returns {Number} Coordinate of the lower right position
     * @instance
     * @name getY2
     */
    Rectangle.prototype.getY2 = function () {
        return this.y + this.height;
    };
    /**
     * Returns the union of 2 rectangles
     * @function
     * @param {Rectangle} other - Other rectangle
     * @returns {Rectangle} Union of the 2 rectangles
     * @instance
     * @name union
     */
    Rectangle.prototype.union = function (rectangle) {
        var x1 = Math.min(this.x, rectangle.x),
            y1 = Math.min(this.y, rectangle.y),
            x2 = Math.max(this.getX2(), rectangle.getX2()),
            y2 = Math.max(this.getY2(), rectangle.getY2());
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    };
    /**
     * Returns true if 2 rectangles intersect
     * @function
     * @param {Rectangle} other - Other rectangle
     * @returns {Boolean} True if 2 rectangles intersect
     * @instance
     * @name intersect
     */
    Rectangle.prototype.intersect = function (other) {
        if (other.isPolygon) {
            return other.intersect(this);
        } else {
            return !(this.x + this.width <= other.x ||
                this.y + this.height <= other.y ||
                this.x >= other.x + other.width ||
                this.y >= other.y + other.height);
        }
    };
    /**
     * Returns the intersection of 2 rectangles
     * @function
     * @param {Rectangle} other - Other rectangle
     * @returns {Rectangle} Intersection of the 2 rectangles
     * @instance
     * @name intersection
     */
    Rectangle.prototype.intersection = function (rectangle) {
        var inter = new Rectangle(0, 0, 0, 0);
        if (this.intersect(rectangle)) {
            inter.x = Math.max(this.x, rectangle.x);
            inter.y = Math.max(this.y, rectangle.y);
            inter.width = Math.min(this.x + this.width, rectangle.x + rectangle.width) - inter.x;
            inter.height = Math.min(this.y + this.height, rectangle.y + rectangle.height) - inter.y;
        }
        return inter;
    };
    /**
     * Checks if rectangle intersects with the provided circle
     * @function
     * @param {Vector2} circleCenter
     * @param {Number} radius
     * @returns {Boolean} True if rectangle and circle intersect
     * @instance
     * @name intersectCircle
     */
    Rectangle.prototype.intersectsCircle = function (circleCenter, radius) {
        var rectHalfWidth = this.width * 0.5;
        var rectHalfHeight = this.height * 0.5;
        var rectCenter = new Vector2(this.x + rectHalfWidth, this.y + rectHalfHeight);
        var distanceX = Math.abs(circleCenter.x - rectCenter.x);
        var distanceY = Math.abs(circleCenter.y - rectCenter.y);
        var cornerDistanceSq = 0;

        if (distanceX > rectHalfWidth + radius || distanceY > rectHalfHeight + radius) {
            return false;
        }

        if (distanceX <= rectHalfWidth || distanceY <= rectHalfHeight) {
            return true;
        }

        cornerDistanceSq = (distanceX - rectHalfWidth) * (distanceX - rectHalfWidth) + (distanceY - rectHalfHeight) * (distanceY - rectHalfHeight);

        return cornerDistanceSq <= radius * radius;
    };
    /**
     * Returns a new rectangle that has been moved by the offset
     * @function
     * @param {Vector2} vector - Position to offset
     * @returns {Rectangle} Returns a new rectangle instance
     * @instance
     * @name offset
     */
    Rectangle.prototype.offset = function (pos) {
        return new Rectangle(this.x + pos.x, this.y + pos.y, this.width, this.height);
    };
    /**
     * Clones rectangle
     * @function
     * @returns {Rectangle} a clone of the current rectangle
     * @instance
     * @name clone
     */
    Rectangle.prototype.clone = function () {
        return new Rectangle(this.x, this.y, this.width, this.height);
    };
    /**
     * Checks if Vector2 lies within the rectangle
     * @function
     * @returns {Boolean} true if position is inside
     * @instance
     * @name hasPosition
     */
    Rectangle.prototype.hasPosition = function (vector) {
        return !(
            vector.x < this.x ||
            vector.y < this.y ||
            vector.x >= this.x + this.width ||
            vector.y >= this.y + this.height
        );
    };
    /**
     * Increases rectangle size from the center.
     * @function
     * param {Number} size - by how much to scale the rectangle
     * param {Boolean} skipWidth - optional. If true, the width won't be scaled
     * param {Boolean} skipHeight - optional. If true, the height won't be scaled
     * @returns {Rectangle} the resized rectangle
     * @instance
     * @name grow
     */
    Rectangle.prototype.grow = function (size, skipWidth, skipHeight) {
        if (!skipWidth) {
            this.x -= size / 2;
            this.width += size;
        }
        if (!skipHeight) {
            this.y -= size / 2;
            this.height += size;
        }
        return this;
    };
    /**
     * Returns one of the corners are vector position
     * @function
     * param {Number} corner - 0: topleft, 1: topright, 2: bottomleft, 3: bottomright, 4: center
     * @returns {Vector2} Vector position
     * @instance
     * @name getCorner
     */
    Rectangle.prototype.getCorner = function (corner) {
        if (!corner) {
            return new Vector2(this.x, this.y);
        } else if (corner === 1) {
            return new Vector2(this.x + this.width, this.y);
        } else if (corner === 2) {
            return new Vector2(this.x, this.y + this.height);
        } else if (corner === 3) {
            return new Vector2(this.x + this.width, this.y + this.height);
        }
        //
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
    };
    /**
     * Returns the center position of the rectangle
     * @function
     * @returns {Vector2} Vector position
     * @instance
     * @name getCenter
     */
    Rectangle.prototype.getCenter = function () {
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
    };
    Rectangle.prototype.toString = function () {
        return '[object Rectangle]';
    };

    return Rectangle;
});