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
 * @snippet Rectangle.snippet
Rectangle(${1:0}, ${2:0}, ${3:1}, ${4:0})
 */
bento.define('bento/math/rectangle', [
    'bento/utils',
    'bento/math/vector2'
], function (
    Utils,
    Vector2
) {
    'use strict';
    var Rectangle = function (x, y, width, height) {
        if (!(this instanceof Rectangle)) {
            return new Rectangle(x, y, width, height);
        }
        if (Utils.isDev()) {
            if (
                !Utils.isNumber(x) ||
                !Utils.isNumber(y) ||
                !Utils.isNumber(width) ||
                !Utils.isNumber(height) ||
                isNaN(x) ||
                isNaN(y) ||
                isNaN(width) ||
                isNaN(height)
            ) {
                Utils.log(
                    "WARNING: invalid Rectangle state! x: " + x +
                    ", y: " + y +
                    ", width: " + width +
                    ", height: " + height
                );
            }
        }

        /**
         * X position
         * @instance
         * @name x
         */
        this.x = x || 0;
        /**
         * Y position
         * @instance
         * @name y
         */
        this.y = y || 0;
        /**
         * Width of the rectangle
         * @instance
         * @name width
         */
        this.width = width || 0;
        /**
         * Height of the rectangle
         * @instance
         * @name height
         */
        this.height = height || 0;
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
     * @name intersectsCircle
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
     * Checks if rectangle intersects with the provided line
     * @function
     * @param {Vector2} lineOrigin
     * @param {Vector2} lineEnd
     * @returns {Boolean} True if rectangle and line intersect
     * @instance
     * @name intersectsLine
     */
    Rectangle.prototype.intersectsLine = function (lineOrigin, lineEnd) {
        // linesIntersect adapted from: https://gist.github.com/Joncom/e8e8d18ebe7fe55c3894
        var linesIntersect = function (p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
            var s1x = p1x - p0x;
            var s1y = p1y - p0y;
            var s2x = p3x - p2x;
            var s2y = p3y - p2y;

            var s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / (-s2x * s1y + s1x * s2y);
            var t = (s2x * (p0y - p2y) - s2y * (p0x - p2x)) / (-s2x * s1y + s1x * s2y);

            return s >= 0 && s <= 1 && t >= 0 && t <= 1;
        };

        var x1 = this.x;
        var y1 = this.y;
        var x2 = this.getX2();
        var y2 = this.getY2();

        return this.hasPosition(lineOrigin) && this.hasPosition(lineEnd) || // line is inside of rectangle
            linesIntersect(lineOrigin.x, lineOrigin.y, lineEnd.x, lineEnd.y, x1, y1, x1, y2) || // line intersects left side
            linesIntersect(lineOrigin.x, lineOrigin.y, lineEnd.x, lineEnd.y, x1, y1, x2, y1) || // line intersects top side
            linesIntersect(lineOrigin.x, lineOrigin.y, lineEnd.x, lineEnd.y, x2, y1, x2, y2) || // line intersects right side
            linesIntersect(lineOrigin.x, lineOrigin.y, lineEnd.x, lineEnd.y, x1, y2, x2, y2); // line intersects bottom side
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
    Rectangle.TOPLEFT = 0;
    Rectangle.TOPRIGHT = 1;
    Rectangle.BOTTOMLEFT = 2;
    Rectangle.BOTTOMRIGHT = 3;
    Rectangle.CENTER = 4;
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
    /**
     * Returns a clone with only the width and height cloned
     * @function
     * @returns {Rectangle} a clone of the current rectangle with x and y set to 0
     * @instance
     * @name getSize
     */
    Rectangle.prototype.getSize = function () {
        return new Rectangle(0, 0, this.width, this.height);
    };
    /**
     * Returns a Vector2 half the size of the rectangle
     * @function
     * @returns {Vector2} Vector2 half the size of the rectangle
     * @instance
     * @name getExtents
     */
    Rectangle.prototype.getExtents = function () {
        return new Vector2(this.width / 2, this.height / 2);
    };
    Rectangle.prototype.toString = function () {
        return '[object Rectangle]';
    };

    return Rectangle;
});