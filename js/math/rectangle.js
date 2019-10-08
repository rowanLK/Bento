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
 * @snippet Rectangle|constructor
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
         * @snippet #Rectangle.x|Number
            x
         */
        this.x = x || 0;
        /**
         * Y position
         * @instance
         * @name y
         * @snippet #Rectangle.y|Number
            y
         */
        this.y = y || 0;
        /**
         * Width of the rectangle
         * @instance
         * @name width
         * @snippet #Rectangle.width|Number
            width
         */
        this.width = width || 0;
        /**
         * Height of the rectangle
         * @instance
         * @name height
         * @snippet #Rectangle.height|Number
            height
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
     * @snippet #Rectangle.getX2|Number
        getX2();
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
     * @snippet #Rectangle.getY2|Number
        getY2();
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
     * @snippet #Rectangle.union|Rectangle
        union(${1:otherRectangle});
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
     * @snippet #Rectangle.intersect|Boolean
        intersect(${1:otherRectangle});
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
     * @snippet #Rectangle.intersection|Rectangle
        intersectuib(${1:otherRectangle});
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
     * @snippet #Rectangle.intersectsCircle|Boolean
        intersectsCircle(${1:centerVector}, ${2:radius});
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
     * @snippet #Rectangle.intersectsLine|Boolean
        intersectsLine(${1:originVector}, ${2:endVector});
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
     * @snippet #Rectangle.offset|Rectangle
        offset(${1:vector});
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
     * @snippet #Rectangle.clone|Rectangle
        clone();
     */
    Rectangle.prototype.clone = function () {
        return new Rectangle(this.x, this.y, this.width, this.height);
    };

    /**
     * Clones this Rectangle's values into another
     * @function
     * @param {Rectangle} rectangle - Other rectangle to receive new values
     * @returns {Rectangle} self
     * @instance
     * @name copyInto
     * @snippet #Rectangle.copyInto|Rectangle
        copyInto(${1:targetRectangle});
     */
    Rectangle.prototype.copyInto = function (other) {
        other.x = this.x;
        other.y = this.y;
        other.width = this.width;
        other.height = this.height;
        return this;
    };

    /**
     * Checks if Vector2 lies within the rectangle
     * @function
     * @returns {Boolean} true if position is inside
     * @instance
     * @name hasPosition
     * @snippet #Rectangle.hasPosition|Boolean
        hasPosition(${1:vector});
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
     * @snippet #Rectangle.grow|Rectangle
        hasPosition(${1:Number});
     * @snippet #Rectangle.grow|skip width
        hasPosition(${1:Number}, true);
     * @snippet #Rectangle.grow|skip height
        hasPosition(${1:Number}, false, true);
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
       * Ensures the rectangle contains the provided position, extending if necessary.
       * @function
       * param {Vector2} position - the position the rectangle should contain
       * @returns {Rectangle} the update rectangle
       * @instance
       * @name includePosition
       * @snippet #Rectangle.includePosition|Rectangle
          includePosition(${1:Vector2});
    */
    Rectangle.prototype.includePosition = function (position) {
        if (this.hasPosition(position)) return this;

        var diff;

        if (position.x < this.x) {
            diff = this.x - position.x;
            this.x -= diff;
            this.width += diff;
        } else if (position.x > this.x + this.width) {
            diff = position.x - (this.x + this.width);
            this.width += diff;
        }

        if (position.y < this.y) {
            diff = this.y - position.y;
            this.y -= diff;
            this.height += diff;
        } else if (position.y > this.y + this.height) {
            diff = position.y - (this.y + this.height);
            this.height += diff;
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
     * @snippet #Rectangle.getCorner|Vector2
        getCorner(Rectangle.BOTTOMRIGHT);
     * @snippet Rectangle.TOPLEFT|corner
        Rectangle.TOPLEFT
     * @snippet Rectangle.TOPRIGHT|corner
        Rectangle.TOPRIGHT
     * @snippet Rectangle.BOTTOMLEFT|corner
        Rectangle.BOTTOMLEFT
     * @snippet Rectangle.BOTTOMRIGHT|corner
        Rectangle.BOTTOMRIGHT
     * @snippet Rectangle.CENTER|corner
        Rectangle.CENTER
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
     * @snippet #Rectangle.getCenter|Vector2
        getCenter();
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
     * @snippet #Rectangle.getSize|Rectangle
        getSize();
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
     * @snippet #Rectangle.getExtents|Vector2
        getExtents();
     */
    Rectangle.prototype.getExtents = function () {
        return new Vector2(this.width / 2, this.height / 2);
    };
    Rectangle.prototype.toString = function () {
        return '[object Rectangle]';
    };
    /**
     * Returns a Vector2 relative to the topleft corner of the Rectangle
     * @function
     * @returns {Vector2} Vector2 relative to the topleft corner of the Rectangle
     * @instance
     * @name getRelative
     * @snippet #Rectangle.getRelative()|Vector2
        getRelative(${1:0.5}, ${2:0.5})
     */
    Rectangle.prototype.getRelative = function (x, y) {
        if (x.isVector2) {
            // turn to numbers
            y = x.y;
            x = x.x;
        }
        return new Vector2(this.x + this.width * x, this.y + this.height * y);
    };
    // ==== Static functions and properties ====
    /**
     * Copies values into another instance
     * @function
     * @param {Rectangle} source - Source instance to copy from
     * @param {Rectangle} target - Target instance to receive values
     * @returns {Rectangle} Target Rectangle
     * @instance
     * @static
     * @name copyInto
     * @snippet Rectangle.copyInto|Rectangle
        Rectangle.copyInto(${1:source}, ${2:target})
     */
    Rectangle.copyInto = function (source, target) {
        source.copyInto(target);
    };

    return Rectangle;
});