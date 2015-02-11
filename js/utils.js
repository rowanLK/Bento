/*
 * Useful functions
 * @copyright (C) HeiGames
 */
bento.define('bento/utils', [], function () {
    'use strict';
    var isString = function (value) {
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
                    if (isObject(obj2[prop])) {
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
                /**
                 * On supported browsers cancel this timeout.
                 */
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
        })();

    return {
        isString: isString,
        isArray: isArray,
        isObject: isObject,
        isFunction: isFunction,
        isNumber: isNumber,
        isBoolean: isBoolean,
        isInt: isInt,
        isUndefined: isUndefined,
        isDefined: isDefined,
        removeObject: removeObject,
        extend: extend,
        getKeyLength: getKeyLength,
        stableSort: stableSort,
        keyboardMapping: keyboardMapping,
        getRandom: function (n) {
            return Math.floor(Math.random() * n);
        },
        toRadian: function (degree) {
            return degree * Math.PI / 180;
        },
        sign: function (value) {
            if (value > 0) {
                return 1;
            } else if (value < 0) {
                return -1;
            } else {
                return 0;
            }
        },
        approach: function (start, end, max) {
            if (start < end) {
                return Math.min(start + max, end);
            } else {
                return Math.max(start - max, end);
            }
        },
        isApple: function () {
            var device = (navigator.userAgent).match(/iPhone|iPad|iPod/i);
            return /iPhone/i.test(device) || /iPad/i.test(device) || /iPod/i.test(device);
        },
        isAndroid: function () {
            return /Android/i.test(navigator.userAgent);
        },
        isCocoonJS: function () {
            return navigator.isCocoonJS;
        }
    };

});