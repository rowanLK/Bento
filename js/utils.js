/**
 * A collection of useful functions
 * Export type: Object
 * @module bento/utils
 */
bento.define('bento/utils', [], function () {
    'use strict';
    var utils,
        isString = function (value) {
            return typeof value === 'string' || value instanceof String;
        },
        isArray = Array.prototype.isArray || function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        },
        isObject = function (value) {
            return Object.prototype.toString.call(value) === '[object Object]';
        },
        isFunction = function (value) {
            return Object.prototype.toString.call(value) === '[object Function]';
        },
        isNumber = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Number]';
        },
        isBoolean = function (obj) {
            return obj === true || obj === false ||
                Object.prototype.toString.call(obj) === '[object Boolean]';
        },
        isInt = function (obj) {
            return parseFloat(obj) === parseInt(obj, 10) && !isNaN(obj);
        },
        isUndefined = function (obj) {
            return obj === void(0);
        },
        isDefined = function (obj) {
            return obj !== void(0);
        },
        isObjLiteral = function (_obj) {
            var _test = _obj;
            return (typeof _obj !== 'object' || _obj === null ?
                false :
                (
                    (function () {
                        while (!false) {
                            if (Object.getPrototypeOf(_test = Object.getPrototypeOf(_test)) === null) {
                                break;
                            }
                        }
                        return Object.getPrototypeOf(_obj) === _test;
                    })()
                )
            );
        },
        removeObject = function (array, obj) {
            var i,
                l;
            for (i = 0, l = array.length; i < l; i += 1) {
                if (array[i] === obj) {
                    array.splice(i, 1);
                    break;
                }
            }
        },
        extend = function (obj1, obj2, overwrite) {
            var prop, temp;
            for (prop in obj2) {
                if (obj2.hasOwnProperty(prop)) {
                    if (obj1.hasOwnProperty(prop) && !overwrite) {
                        // property already exists, move it up
                        obj1.base = obj1.base || {};
                        temp = {};
                        temp[prop] = obj1[prop];
                        extend(obj1.base, temp);
                    }
                    if (isObjLiteral(obj2[prop])) {
                        obj1[prop] = extend({}, obj2[prop]);
                    } else {
                        obj1[prop] = obj2[prop];
                    }
                }
            }
            return obj1;
        },
        getKeyLength = function (obj) {
            return Object.keys(obj).length;
        },
        setAnimationFrameTimeout = function (callback, timeout) {
            var now = new Date().getTime(),
                rafID = null;

            if (timeout === undefined) timeout = 1;

            function animationFrame() {
                var later = new Date().getTime();

                if (later - now >= timeout) {
                    callback();
                } else {
                    rafID = requestAnimationFrame(animationFrame);
                }
            }

            animationFrame();
            return {
                cancel: function () {
                    if (typeof cancelAnimationFrame !== 'undefined') {
                        cancelAnimationFrame(rafID);
                    }
                }
            };
        },
        stableSort = (function () {
            // https://github.com/Two-Screen/stable
            // A stable array sort, because `Array#sort()` is not guaranteed stable.
            // This is an implementation of merge sort, without recursion.
            var stable = function (arr, comp) {
                    return exec(arr.slice(), comp);
                },
                // Execute the sort using the input array and a second buffer as work space.
                // Returns one of those two, containing the final result.
                exec = function (arr, comp) {
                    if (typeof (comp) !== 'function') {
                        comp = function (a, b) {
                            return String(a).localeCompare(b);
                        };
                    }

                    // Short-circuit when there's nothing to sort.
                    var len = arr.length;
                    if (len <= 1) {
                        return arr;
                    }

                    // Rather than dividing input, simply iterate chunks of 1, 2, 4, 8, etc.
                    // Chunks are the size of the left or right hand in merge sort.
                    // Stop when the left-hand covers all of the array.
                    var buffer = new Array(len);
                    for (var chk = 1; chk < len; chk *= 2) {
                        pass(arr, comp, chk, buffer);

                        var tmp = arr;
                        arr = buffer;
                        buffer = tmp;
                    }
                    return arr;
                },
                // Run a single pass with the given chunk size.
                pass = function (arr, comp, chk, result) {
                    var len = arr.length;
                    var i = 0;
                    // Step size / double chunk size.
                    var dbl = chk * 2;
                    // Bounds of the left and right chunks.
                    var l, r, e;
                    // Iterators over the left and right chunk.
                    var li, ri;

                    // Iterate over pairs of chunks.
                    for (l = 0; l < len; l += dbl) {
                        r = l + chk;
                        e = r + chk;
                        if (r > len) r = len;
                        if (e > len) e = len;

                        // Iterate both chunks in parallel.
                        li = l;
                        ri = r;
                        while (true) {
                            // Compare the chunks.
                            if (li < r && ri < e) {
                                // This works for a regular `sort()` compatible comparator,
                                // but also for a simple comparator like: `a > b`
                                if (comp(arr[li], arr[ri]) <= 0) {
                                    result[i++] = arr[li++];
                                } else {
                                    result[i++] = arr[ri++];
                                }
                            }
                            // Nothing to compare, just flush what's left.
                            else if (li < r) {
                                result[i++] = arr[li++];
                            } else if (ri < e) {
                                result[i++] = arr[ri++];
                            }
                            // Both iterators are at the chunk ends.
                            else {
                                break;
                            }
                        }
                    }
                };
            stable.inplace = function (arr, comp) {
                var result = exec(arr, comp);

                // This simply copies back if the result isn't in the original array,
                // which happens on an odd number of passes.
                if (result !== arr) {
                    pass(result, null, arr.length, arr);
                }

                return arr;
            };
            // return it instead and keep the method local to this scope
            return stable;
        })(),
        keyboardMapping = (function () {
            var aI,
                keys = {
                    // http://github.com/RobertWhurst/KeyboardJS
                    // general
                    "3": ["cancel"],
                    "8": ["backspace"],
                    "9": ["tab"],
                    "12": ["clear"],
                    "13": ["enter"],
                    "16": ["shift"],
                    "17": ["ctrl"],
                    "18": ["alt", "menu"],
                    "19": ["pause", "break"],
                    "20": ["capslock"],
                    "27": ["escape", "esc"],
                    "32": ["space", "spacebar"],
                    "33": ["pageup"],
                    "34": ["pagedown"],
                    "35": ["end"],
                    "36": ["home"],
                    "37": ["left"],
                    "38": ["up"],
                    "39": ["right"],
                    "40": ["down"],
                    "41": ["select"],
                    "42": ["printscreen"],
                    "43": ["execute"],
                    "44": ["snapshot"],
                    "45": ["insert", "ins"],
                    "46": ["delete", "del"],
                    "47": ["help"],
                    "91": ["command", "windows", "win", "super", "leftcommand", "leftwindows", "leftwin", "leftsuper"],
                    "92": ["command", "windows", "win", "super", "rightcommand", "rightwindows", "rightwin", "rightsuper"],
                    "145": ["scrolllock", "scroll"],
                    "186": ["semicolon", ";"],
                    "187": ["equal", "equalsign", "="],
                    "188": ["comma", ","],
                    "189": ["dash", "-"],
                    "190": ["period", "."],
                    "191": ["slash", "forwardslash", "/"],
                    "192": ["graveaccent", "`"],
                    "219": ["openbracket", "["],
                    "220": ["backslash", "\\"],
                    "221": ["closebracket", "]"],
                    "222": ["apostrophe", "'"],

                    //0-9
                    "48": ["zero", "0"],
                    "49": ["one", "1"],
                    "50": ["two", "2"],
                    "51": ["three", "3"],
                    "52": ["four", "4"],
                    "53": ["five", "5"],
                    "54": ["six", "6"],
                    "55": ["seven", "7"],
                    "56": ["eight", "8"],
                    "57": ["nine", "9"],

                    //numpad
                    "96": ["numzero", "num0"],
                    "97": ["numone", "num1"],
                    "98": ["numtwo", "num2"],
                    "99": ["numthree", "num3"],
                    "100": ["numfour", "num4"],
                    "101": ["numfive", "num5"],
                    "102": ["numsix", "num6"],
                    "103": ["numseven", "num7"],
                    "104": ["numeight", "num8"],
                    "105": ["numnine", "num9"],
                    "106": ["nummultiply", "num*"],
                    "107": ["numadd", "num+"],
                    "108": ["numenter"],
                    "109": ["numsubtract", "num-"],
                    "110": ["numdecimal", "num."],
                    "111": ["numdivide", "num/"],
                    "144": ["numlock", "num"],

                    //function keys
                    "112": ["f1"],
                    "113": ["f2"],
                    "114": ["f3"],
                    "115": ["f4"],
                    "116": ["f5"],
                    "117": ["f6"],
                    "118": ["f7"],
                    "119": ["f8"],
                    "120": ["f9"],
                    "121": ["f10"],
                    "122": ["f11"],
                    "123": ["f12"]
                };
            for (aI = 65; aI <= 90; aI += 1) {
                keys[aI] = String.fromCharCode(aI + 32);
            }

            return keys;
        })(),
        remoteMapping = (function () {
            // the commented out keys are not used by the remote's micro gamepad
            var buttons = {
                "0": ["A", "a", "click"], // click on touch area
                // "1": ["B"],
                "2": ["X", "x", "play", "pause"], // pause/play button
                // "3": ["Y"],
                // "4": ["L1"],
                // "5": ["R1"],
                // "6": ["L2"],
                // "7": ["R2"],
                "12": ["up"], // upper half touch area
                "13": ["down"], // lower half touch area
                "14": ["left"], // left half touch area
                "15": ["right"], // right half touch area
                "16": ["menu"] // menu button
            };

            return buttons;
        })(),
        suppressThrows = true;

    utils = {
        /**
         * @function
         * @instance
         * @name isString
         */
        isString: isString,
        /**
         * @function
         * @instance
         * @name isArray
         */
        isArray: isArray,
        /**
         * @function
         * @instance
         * @name isObject
         */
        isObject: isObject,
        /**
         * @function
         * @instance
         * @name isFunction
         */
        isFunction: isFunction,
        /**
         * @function
         * @instance
         * @name isNumber
         */
        isNumber: isNumber,
        /**
         * @function
         * @instance
         * @name isBoolean
         */
        isBoolean: isBoolean,
        /**
         * @function
         * @instance
         * @name isInt
         */
        isInt: isInt,
        /**
         * @function
         * @name isUndefined
         * @instance
         */
        isUndefined: isUndefined,
        /**
         * @function
         * @instance
         * @name isDefined
         */
        isDefined: isDefined,
        /**
         * Removes entry from array
         * @function
         * @instance
         * @param {Array} array - array
         * @param {Anything} value - any type
         * @return {Array} The updated array
         * @name removeObject
         */
        removeObject: removeObject,
        /**
         * Extends object literal properties with another object
         * If the objects have the same property name, then the old one is pushed to a property called "base"
         * @function
         * @instance
         * @name extend
         * @param {Object} object1 - original object
         * @param {Object} object2 - new object
         * @param {Bool} [overwrite] - Overwrites properties
         * @return {Array} The updated array
         */
        extend: extend,
        /**
         * Counts the number of keys in an object literal
         * @function
         * @instance
         * @name getKeyLength
         * @param {Object} object - object literal
         * @return {Number} Number of keys
         */
        getKeyLength: getKeyLength,
        stableSort: stableSort,
        keyboardMapping: keyboardMapping,
        remoteMapping: remoteMapping,
        /**
         * Returns a random integer [0...n)
         * @function
         * @instance
         * @name getRandom
         * @param {Number} n - limit of random number
         * @return {Number} Randomized integer
         */
        getRandom: function (n) {
            return Math.floor(Math.random() * n);
        },
        /**
         * Returns a random integer between range [min...max)
         * @function
         * @instance
         * @name getRandomRange
         * @param {Number} min - minimum value
         * @param {Number} max - maximum value
         * @return {Number} Randomized integer
         */
        getRandomRange: function (min, max) {
            var diff = max - min;
            return min + Math.floor(Math.random() * diff);
        },
        /**
         * Returns a random float [0...n)
         * @function
         * @instance
         * @name getRandomFloat
         * @param {Number} n - limit of random number
         * @return {Number} Randomized number
         */
        getRandomFloat: function (n) {
            return Math.random() * n;
        },
        /**
         * Returns a random float between range [min...max)
         * @function
         * @instance
         * @name getRandomRangeFloat
         * @param {Number} min - minimum value
         * @param {Number} max - maximum value
         * @return {Number} Randomized number
         */
        getRandomRangeFloat: function (min, max) {
            var diff = max - min;
            return min + Math.random() * diff;
        },
        /**
         * Turns degrees into radians
         * @function
         * @instance
         * @name toRadian
         * @param {Number} degree - value in degrees
         * @return {Number} radians
         */
        toRadian: function (degree) {
            return degree * Math.PI / 180;
        },
        /**
         * Turns radians into degrees
         * @function
         * @instance
         * @name toDegree
         * @param {Number} radians - value in radians
         * @return {Number} degree
         */
        toDegree: function (radian) {
            return radian / Math.PI * 180;
        },
        /**
         * Sign of a number. Returns 0 if value is 0.
         * @function
         * @instance
         * @param {Number} value - value to check
         * @name sign
         */
        sign: function (value) {
            if (value > 0) {
                return 1;
            } else if (value < 0) {
                return -1;
            } else {
                return 0;
            }
        },
        /**
         * Steps towards a number without going over the limit
         * @function
         * @instance
         * @param {Number} start - current value
         * @param {Number} end - target value
         * @param {Number} step - step to take (should always be a positive value)
         * @name approach
         */
        approach: function (start, end, max) {
            max = Math.abs(max);
            if (start < end) {
                return Math.min(start + max, end);
            } else {
                return Math.max(start - max, end);
            }
        },
        /**
         * Repeats a function for a number of times
         * @function
         * @instance
         * @param {Number} number - Number of times to repeat
         * @param {Function} fn - function to perform
         * @name repeat
         */
        repeat: function (number, fn) {
            var i;
            for (i = 0; i < number; ++i) {
                fn(i, number);
            }
        },
        /**
         * A simple hashing function, similar to Java's String.hashCode()
         * source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         * @function
         * @instance
         * @param {String} string - String to hash
         * @name checksum
         */
        checksum: function (str) {
            var hash = 0,
                strlen = (str || '').length,
                i,
                c;
            if (strlen === 0) {
                return hash;
            }
            for (i = 0; i < strlen; ++i) {
                c = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        },
        /**
         * Returns a clone of a JSON object
         * @function
         * @instance
         * @param {Object} jsonObj - Object literal that adheres to JSON standards
         * @name cloneJson
         */
        cloneJson: function (jsonObj) {
            var out;
            try {
                out = JSON.parse(JSON.stringify(jsonObj));
            } catch (e) {
                out = {};
                console.log('WARNING: object cloning failed');
            }
            return out;
        },
        /**
         * Callback during foreach
         *
         * @callback IteratorCallback
         * @param {Object} value - The value in the array or object literal
         * @param {Number} index - Index of the array or key in object literal
         * @param {Number} length - Length of the array or key count in object literal
         * @param {Fuction} breakLoop - Calling this breaks the loop and stops iterating over the array or object literal
         */
        /**
         * Loops through an array
         * @function
         * @instance
         * @param {Array/Object} array - Array or Object literal to loop through
         * @param {IteratorCallback} callback - Callback function
         * @name forEach
         */
        forEach: function (array, callback) {
            var obj;
            var i;
            var l;
            var stop = false;
            var breakLoop = function () {
                stop = true;
            };
            if (Utils.isArray(array)) {
                for (i = 0, l = array.length; i < l; ++i) {
                    callback(array[i], i, l, breakLoop, array[i + 1]);
                    if (stop) {
                        return;
                    }
                }
            } else {
                l = Utils.getKeyLength(array);
                for (i in array) {
                    if (!array.hasOwnProperty(i)) {
                        continue;
                    }
                    callback(array[i], i, l, breakLoop);
                    if (stop) {
                        return;
                    }
                }
            }
        },
        /**
         * Checks whether a value is between two other values
         * @function
         * @instance
         * @param {Number} min - lower limit
         * @param {Number} value - value to check that's between min and max
         * @param {Number} max - upper limit
         * @param {Boolean} includeEdge - includes edge values
         * @name isBetween
         */
        isBetween: function (min, value, max, includeEdge) {
            if (includeEdge) {
                return min <= value && value <= max;
            }
            return min < value && value < max;
        },
        /**
         * Picks one of the parameters of this function and returns it
         * @function
         * @instance
         * @name pickRandom
         */
        pickRandom: function () {
            return arguments[this.getRandom(arguments.length)];
        },
        /**
         * Checks useragent if device is an apple device. Works on web only.
         * @function
         * @instance
         * @name isApple
         */
        isApple: function () {
            var device = (navigator.userAgent).match(/iPhone|iPad|iPod/i);
            return /iPhone/i.test(device) || /iPad/i.test(device) || /iPod/i.test(device);
        },
        /**
         * Checks useragent if device is an android device. Works on web only.
         * @function
         * @instance
         * @name isAndroid
         */
        isAndroid: function () {
            return /Android/i.test(navigator.userAgent);
        },
        /**
         * Checks if environment is cocoon
         * @function
         * @instance
         * @name isCocoonJs
         */
        isCocoonJS: function () {
            return navigator.isCocoonJS;
        },
        isCocoonJs: function () {
            return navigator.isCocoonJS;
        },
        /**
         * Enum for sort mode, pass this to Bento.setup
         * @readonly
         * @enum {Number}
         */
        SortMode: {
            ALWAYS: 0,
            NEVER: 1,
            SORT_ON_ADD: 2
        },
        /**
         * Are throws being suppressed?
         * @function
         * @instance
         * @returns {Object} Returns true if throws are suppressed, false if not
         * @name getSuppressThrows
         */
        getSuppressThrows: function () {
            return suppressThrows;
        },
        /**
         * Turn the suppression of throws on or off
         * @function
         * @instance
         * @param {Boolean} bool - true to suppress throws, false to not suppress throws
         * @name setSuppressThrows
         */
        setSuppressThrows: function (bool) {
            suppressThrows = bool;
        }
    };
    return utils;
});