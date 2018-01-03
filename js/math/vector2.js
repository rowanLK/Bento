/**
 * 2 dimensional vector
 * (Note: to perform matrix multiplications, one must use toMatrix)
 * <br>Exports: Constructor
 * @module bento/math/vector2
 * @moduleName Vector2
 * @param {Number} x - x position
 * @param {Number} y - y position
 * @returns {Vector2} Returns a 2d vector.
 * @snippet Vector2|constructor
Vector2(${1:0}, ${2:0})
 * @snippet #Vector2.x|Number
    x
 * @snippet #Vector2.y|Number
    y
 *
 */
bento.define('bento/math/vector2', [
    'bento/math/matrix',
    'bento/utils'
], function (
    Matrix,
    Utils
) {
    'use strict';
    var Vector2 = function (x, y) {
        if (!(this instanceof Vector2)) {
            return new Vector2(x, y);
        }
        if (Utils.isDev()) {
            if (!Utils.isNumber(x) || !Utils.isNumber(y) || isNaN(x) || isNaN(y)) {
                Utils.log("WARNING: invalid Vector2 state! x: " + x + ", y: " + y);
            }
        }
        this.x = x || 0;
        this.y = y || 0;
    };

    Vector2.prototype.isVector2 = function () {
        return true;
    };
    /**
     * Adds 2 vectors and returns the result
     * @function
     * @param {Vector2} vector - Vector to add
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name add
     * @snippet #Vector2.add|Vector2
        add(${1:otherVector});
     */
    Vector2.prototype.add = function (vector) {
        var v = this.clone();
        v.addTo(vector);
        return v;
    };
    /**
     * Adds vector to current vector
     * @function
     * @param {Vector2} vector - Vector to add
     * @returns {Vector2} Returns self
     * @instance
     * @name addTo
     * @snippet #Vector2.addTo|self
        addTo(${1:otherVector});
     */
    Vector2.prototype.addTo = function (vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    };
    /**
     * Subtracts a vector and returns the result
     * @function
     * @param {Vector2} vector - Vector to subtract
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name subtract
     * @snippet #Vector2.subtract|Vector2
        subtract(${1:otherVector});
     */
    Vector2.prototype.subtract = function (vector) {
        var v = this.clone();
        v.substractFrom(vector);
        return v;
    };
    /**
     * Subtract from the current vector
     * @function
     * @param {Vector2} vector - Vector to subtract
     * @returns {Vector2} Returns self
     * @instance
     * @name subtractFrom
     * @snippet #Vector2.subtractFrom|self
        subtractFrom(${1:otherVector});
     */
    Vector2.prototype.subtractFrom = function (vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    };
    Vector2.prototype.substract = Vector2.prototype.subtract;
    Vector2.prototype.substractFrom = Vector2.prototype.subtractFrom;
    /**
     * Gets the angle of the vector
     * @function
     * @returns {Number} Angle in radians
     * @instance
     * @name angle
     * @snippet #Vector2.angle|radians
        angle();
     */
    Vector2.prototype.angle = function () {
        return Math.atan2(this.y, this.x);
    };
    /**
     * Gets the angle between 2 vectors
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Number} Angle in radians
     * @instance
     * @name angleBetween
     * @snippet #Vector2.angleBetween|radians
        angleBetween(${1:otherVector});
     */
    Vector2.prototype.angleBetween = function (vector) {
        return Math.atan2(
            vector.y - this.y,
            vector.x - this.x
        );
    };
    /**
     * Gets the inner product between 2 vectors
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Number} Dot product of 2 vectors
     * @instance
     * @name dotProduct
     * @snippet #Vector2.dotProduct|Number
        dotProduct(${1:otherVector});
     */
    Vector2.prototype.dotProduct = function (vector) {
        return this.x * vector.x + this.y * vector.y;
    };
    /**
     * Multiplies 2 vectors (not a matrix multiplication)
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name multiply
     * @snippet #Vector2.multiply|Vector2
        multiply(${1:otherVector});
     */
    Vector2.prototype.multiply = function (vector) {
        var v = this.clone();
        v.multiplyWith(vector);
        return v;
    };
    /**
     * Multiply with the current vector (not a matrix multiplication)
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Vector2} Returns self
     * @instance
     * @name multiplyWith
     * @snippet #Vector2.multiplyWith|self
        multiplyWith(${1:otherVector});
     */
    Vector2.prototype.multiplyWith = function (vector) {
        this.x *= vector.x;
        this.y *= vector.y;
        return this;
    };
    /**
     * Divides 2 vectors
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name divide
     * @snippet #Vector2.divide|Vector2
        divide(${1:otherVector});
     */
    Vector2.prototype.divide = function (vector) {
        var v = this.clone();
        v.divideBy(vector);
        return v;
    };
    /**
     * Divides current vector
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name divideBy
     * @snippet #Vector2.divideBy|Vector2
        divideBy(${1:otherVector});
     */
    Vector2.prototype.divideBy = function (vector) {
        this.x /= vector.x;
        this.y /= vector.y;
        return this;
    };
    /**
     * Multiplies vector with a scalar value
     * @function
     * @param {Number} value - scalar value
     * @returns {Vector2} Returns a new Vector2 instance
     * @instance
     * @name scalarMultiply
     * @snippet #Vector2.scalarMultiply|Vector2
        scalarMultiply(${1:1});
     */
    Vector2.prototype.scalarMultiply = function (value) {
        var v = this.clone();
        v.scalarMultiplyWith(value);
        return v;
    };
    /**
     * Multiplies current vector with a scalar value
     * @function
     * @param {Number} value - scalar value
     * @returns {Vector2} Returns self
     * @instance
     * @name scalarMultiplyWith
     * @snippet #Vector2.scalarMultiplyWith|self
        scalarMultiplyWith(${1:1});
     */
    Vector2.prototype.scalarMultiplyWith = function (value) {
        this.x *= value;
        this.y *= value;
        return this;
    };
    /**
     * Same as scalarMultiplyWith
     * @function
     * @param {Number} value - scalar value
     * @returns {Vector2} Returns self
     * @instance
     * @name scale
     * @snippet #Vector2.scale|self
        scale(${1:1});
     */
    Vector2.prototype.scale = Vector2.prototype.scalarMultiplyWith;
    /**
     * Returns the magnitude of the vector
     * @function
     * @returns {Number} Modulus of the vector
     * @instance
     * @name magnitude
     * @snippet #Vector2.magnitude|Number
        magnitude();
     */
    Vector2.prototype.magnitude = function () {
        return Math.sqrt(this.sqrMagnitude());
    };
    /**
     * Returns the magnitude of the vector without squarerooting it (which is an expensive operation)
     * @function
     * @returns {Number} Modulus squared of the vector
     * @instance
     * @name sqrMagnitude
     * @snippet #Vector2.sqrMagnitude|Number
        sqrMagnitude();
     */
    Vector2.prototype.sqrMagnitude = function () {
        return this.dotProduct(this);
    };
    /**
     * Normalizes the vector by its magnitude
     * @function
     * @returns {Vector2} Returns self
     * @instance
     * @name normalize
     * @snippet #Vector2.normalize|self
        normalize();
     */
    Vector2.prototype.normalize = function () {
        var magnitude = this.magnitude();
        if (magnitude === 0) {
            // divide by zero
            this.x = 0;
            this.y = 0;
            return this;
        }
        this.x /= magnitude;
        this.y /= magnitude;
        return this;
    };
    /**
     * Returns the distance from another vector
     * @function
     * @param {Vector2} vector - Other vector
     * @returns {Number} Distance between the two vectors
     * @instance
     * @name distance
     * @snippet #Vector2.distance|Number
        distance(${1:otherVector});
     */
    Vector2.prototype.distance = function (vector) {
        return vector.substract(this).magnitude();
    };
    /**
     * Check if distance between 2 vector is farther than a certain value
     * This function is more performant than using Vector2.distance()
     * @function
     * @param {Vector2} vector - Other vector
     * @param {Number} distance - Distance
     * @returns {Boolean} Returns true if farther than distance
     * @instance
     * @name isFartherThan
     * @snippet #Vector2.isFartherThan|Boolean
        isFartherThan(${1:otherVector}, ${2:1});
     */
    Vector2.prototype.isFartherThan = function (vector, distance) {
        var diff = vector.substract(this);
        return diff.x * diff.x + diff.y * diff.y > distance * distance;
    };
    /**
     * Check if distance between 2 vector is closer than a certain value
     * This function is more performant than using Vector2.distance()
     * @function
     * @param {Vector2} vector - Other vector
     * @param {Number} distance - Distance
     * @returns {Boolean} Returns true if farther than distance
     * @instance
     * @name isCloserThan
     * @snippet #Vector2.isCloserThan|Boolean
        isCloserThan(${1:otherVector}, ${2:1});
     */
    Vector2.prototype.isCloserThan = function (vector, distance) {
        var diff = vector.substract(this);
        return diff.x * diff.x + diff.y * diff.y < distance * distance;
    };
    /**
     * Rotates the vector by a certain amount of radians
     * @function
     * @param {Number} angle - Angle in radians
     * @returns {Vector2} Returns self
     * @instance
     * @name rotateRadian
     * @snippet #Vector2.rotateRadian|self
        rotateRadian(${1:radians});
     */
    Vector2.prototype.rotateRadian = function (angle) {
        var x = this.x * Math.cos(angle) - this.y * Math.sin(angle),
            y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
        this.x = x;
        this.y = y;
        return this;
    };
    /**
     * Rotates the vector by a certain amount of degrees
     * @function
     * @param {Number} angle - Angle in degrees
     * @returns {Vector2} Returns self
     * @instance
     * @name rotateDegree
     * @snippet #Vector2.rotateDegree|self
        rotateRadian(${1:degrees});
     */
    Vector2.prototype.rotateDegree = function (angle) {
        return this.rotateRadian(angle * Math.PI / 180);
    };
    /**
     * Clones the current vector
     * @function
     * @param {Number} angle - Angle in degrees
     * @returns {Vector2} Returns new Vector2 instance
     * @instance
     * @name clone
     * @snippet #Vector2.clone|Vector2
        clone();
     */
    Vector2.prototype.clone = function () {
        return new Vector2(this.x, this.y);
    };
    /* DEPRECATED
     * Represent the vector as a 1x3 matrix
     * @function
     * @returns {Matrix} Returns a 1x3 Matrix
     * @instance
     * @name toMatrix
     */
    Vector2.prototype.toMatrix = function () {
        var matrix = new Matrix(1, 3);
        matrix.set(0, 0, this.x);
        matrix.set(0, 1, this.y);
        matrix.set(0, 2, 1);
        return matrix;
    };
    /**
     * Reflects the vector using the parameter as the 'mirror'
     * @function
     * @param {Vector2} mirror - Vector2 through which the current vector is reflected.
     * @instance
     * @name reflect
     * @snippet #Vector2.reflect|Vector2
        reflect(${1:mirrorVector});
     */
    Vector2.prototype.reflect = function (mirror) {
        var normal = mirror.normalize(); // reflect through this normal
        var dot = this.dotProduct(normal);
        return this.substractFrom(normal.scalarMultiplyWith(dot + dot));
    };
    Vector2.prototype.toString = function () {
        return '[object Vector2]';
    };

    return Vector2;
});