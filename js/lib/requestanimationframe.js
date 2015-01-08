/**
 * http://www.makeitgo.ws/articles/animationframe/
 */
rice.define('rice/lib/requestanimationframe', [], function () {
    'use strict';
    var lastFrame, method, now, queue, requestAnimationFrame, timer, vendor, _i, _len, _ref, _ref1;
    method = 'native';
    now = Date.now || function () {
        return new Date().getTime();
    };
    requestAnimationFrame = window.requestAnimationFrame;
    _ref = ['webkit', 'moz', 'o', 'ms'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vendor = _ref[_i];
        if (requestAnimationFrame === null) {
            requestAnimationFrame = window[vendor + "RequestAnimationFrame"];
        }
    }
    if (requestAnimationFrame === null) {
        method = 'timer';
        lastFrame = 0;
        queue = timer = null;
        requestAnimationFrame = function (callback) {
            var fire, nextFrame, time;
            if (queue !== null) {
                queue.push(callback);
                return;
            }
            time = now();
            nextFrame = Math.max(0, 16.66 - (time - lastFrame));
            queue = [callback];
            lastFrame = time + nextFrame;
            fire = function () {
                var cb, q, _j, _len1;
                q = queue;
                queue = null;
                for (_j = 0, _len1 = q.length; _j < _len1; _j++) {
                    cb = q[_j];
                    cb(lastFrame);
                }
            };
            timer = setTimeout(fire, nextFrame);
        };
    }
    requestAnimationFrame(function (time) {
        var _ref1;
        if ((((_ref1 = window.performance) !== null ? _ref1.now : void 0) !== null) && time < 1e12) {
            requestAnimationFrame.now = function () {
                return window.performance.now();
            };
            requestAnimationFrame.method = 'native-highres';
        } else {
            requestAnimationFrame.now = now;
        }
    });
    requestAnimationFrame.now = ((_ref1 = window.performance) !== null ? _ref1.now : void 0) !== null ? (function () {
        return window.performance.now();
    }) : now;
    requestAnimationFrame.method = method;
    window.requestAnimationFrame = requestAnimationFrame;
    return requestAnimationFrame;
});