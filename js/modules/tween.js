/**
 * The Tween is an entity that performs an interpolation within a timeframe. The entity
 * removes itself after the tween ends.
 * Default tweens: linear, quadratic, squareroot, cubic, cuberoot, exponential, elastic, sin, cos
 * <br>Exports: Constructor
 * @module bento/tween
 * @param {Object} settings - Settings object
 * @param {Number} settings.from - Starting value
 * @param {Number} settings.to - End value
 * @param {Number} settings.in - Time frame
 * @param {String} settings.ease - Choose between default tweens or see {@link http://easings.net/}
 * @param {Number} [settings.alpha] - For use in exponential y=exp(αt) or elastic y=exp(αt)*cos(βt)
 * @param {Number} [settings.beta] - For use in elastic y=exp(αt)*cos(βt)
 * @param {Boolean} [settings.stay] - Don't remove the entity automatically
 * @param {Function} [settings.do] - Called every tick during the tween lifetime. Callback parameters: (value, time)
 * @param {Function} [settings.onComplete] - Called when tween ends
 * @param {Number} [settings.id] - Adds an id property to the tween. Useful when spawning tweens in a loop,
 * @param {Boolean} [settings.updateWhenPaused] - Continue tweening even when the game is paused (optional)
 * @returns Entity
 */
bento.define('bento/tween', [
    'bento',
    'bento/utils',
    'bento/entity'
], function (Bento, Utils, Entity) {
    'use strict';
    var robbertPenner = {
            // t: current time, b: begInnIng value, c: change In value, d: duration
            easeInQuad: function (t, b, c, d) {
                return c * (t /= d) * t + b;
            },
            easeOutQuad: function (t, b, c, d) {
                return -c * (t /= d) * (t - 2) + b;
            },
            easeInOutQuad: function (t, b, c, d) {
                if ((t /= d / 2) < 1) return c / 2 * t * t + b;
                return -c / 2 * ((--t) * (t - 2) - 1) + b;
            },
            easeInCubic: function (t, b, c, d) {
                return c * (t /= d) * t * t + b;
            },
            easeOutCubic: function (t, b, c, d) {
                return c * ((t = t / d - 1) * t * t + 1) + b;
            },
            easeInOutCubic: function (t, b, c, d) {
                if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
                return c / 2 * ((t -= 2) * t * t + 2) + b;
            },
            easeInQuart: function (t, b, c, d) {
                return c * (t /= d) * t * t * t + b;
            },
            easeOutQuart: function (t, b, c, d) {
                return -c * ((t = t / d - 1) * t * t * t - 1) + b;
            },
            easeInOutQuart: function (t, b, c, d) {
                if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
                return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
            },
            easeInQuint: function (t, b, c, d) {
                return c * (t /= d) * t * t * t * t + b;
            },
            easeOutQuint: function (t, b, c, d) {
                return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
            },
            easeInOutQuint: function (t, b, c, d) {
                if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
                return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
            },
            easeInSine: function (t, b, c, d) {
                return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
            },
            easeOutSine: function (t, b, c, d) {
                return c * Math.sin(t / d * (Math.PI / 2)) + b;
            },
            easeInOutSine: function (t, b, c, d) {
                return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
            },
            easeInExpo: function (t, b, c, d) {
                return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
            },
            easeOutExpo: function (t, b, c, d) {
                return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
            },
            easeInOutExpo: function (t, b, c, d) {
                if (t === 0) return b;
                if (t === d) return b + c;
                if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
                return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
            },
            easeInCirc: function (t, b, c, d) {
                return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
            },
            easeOutCirc: function (t, b, c, d) {
                return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
            },
            easeInOutCirc: function (t, b, c, d) {
                if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
                return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
            },
            easeInElastic: function (t, b, c, d) {
                var s = 1.70158,
                    p = 0,
                    a = c;
                if (t === 0) return b;
                if ((t /= d) === 1) return b + c;
                if (!p) p = d * 0.3;
                if (a < Math.abs(c)) {
                    a = c;
                    s = p / 4;
                } else s = p / (2 * Math.PI) * Math.asin(c / a);
                return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            },
            easeOutElastic: function (t, b, c, d) {
                var s = 1.70158,
                    p = 0,
                    a = c;
                if (t === 0) return b;
                if ((t /= d) === 1) return b + c;
                if (!p) p = d * 0.3;
                if (a < Math.abs(c)) {
                    a = c;
                    s = p / 4;
                } else s = p / (2 * Math.PI) * Math.asin(c / a);
                return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
            },
            easeInOutElastic: function (t, b, c, d) {
                var s = 1.70158,
                    p = 0,
                    a = c;
                if (t === 0) return b;
                if ((t /= d / 2) === 2) return b + c;
                if (!p) p = d * (0.3 * 1.5);
                if (a < Math.abs(c)) {
                    a = c;
                    s = p / 4;
                } else s = p / (2 * Math.PI) * Math.asin(c / a);
                if (t < 1) return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
                return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
            },
            easeInBack: function (t, b, c, d, s) {
                if (s === undefined) s = 1.70158;
                return c * (t /= d) * t * ((s + 1) * t - s) + b;
            },
            easeOutBack: function (t, b, c, d, s) {
                if (s === undefined) s = 1.70158;
                return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
            },
            easeInOutBack: function (t, b, c, d, s) {
                if (s === undefined) s = 1.70158;
                if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
                return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
            },
            easeInBounce: function (t, b, c, d) {
                return c - this.easeOutBounce(d - t, 0, c, d) + b;
            },
            easeOutBounce: function (t, b, c, d) {
                if ((t /= d) < (1 / 2.75)) {
                    return c * (7.5625 * t * t) + b;
                } else if (t < (2 / 2.75)) {
                    return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
                } else if (t < (2.5 / 2.75)) {
                    return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
                } else {
                    return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
                }
            },
            easeInOutBounce: function (t, b, c, d) {
                if (t < d / 2) return this.easeInBounce(t * 2, 0, c, d) * 0.5 + b;
                return this.easeOutBounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
            }
        },
        interpolations = {
            linear: function (s, e, t, alpha, beta) {
                return (e - s) * t + s;
            },
            quadratic: function (s, e, t, alpha, beta) {
                return (e - s) * t * t + s;
            },
            squareroot: function (s, e, t, alpha, beta) {
                return (e - s) * Math.pow(t, 0.5) + s;
            },
            cubic: function (s, e, t, alpha, beta) {
                return (e - s) * t * t * t + s;
            },
            cuberoot: function (s, e, t, alpha, beta) {
                return (e - s) * Math.pow(t, 1 / 3) + s;
            },
            exponential: function (s, e, t, alpha, beta) {
                //takes alpha as growth/damp factor
                return (e - s) / (Math.exp(alpha) - 1) * Math.exp(alpha * t) + s - (e - s) / (Math.exp(alpha) - 1);
            },
            elastic: function (s, e, t, alpha, beta) {
                //alpha=growth factor, beta=wavenumber
                return (e - s) / (Math.exp(alpha) - 1) * Math.cos(beta * t * 2 * Math.PI) * Math.exp(alpha * t) + s - (e - s) / (Math.exp(alpha) - 1);
            },
            sin: function (s, e, t, alpha, beta) {
                //s=offset, e=amplitude, alpha=wavenumber
                return s + e * Math.sin(alpha * t * 2 * Math.PI);
            },
            cos: function (s, e, t, alpha, beta) {
                //s=offset, e=amplitude, alpha=wavenumber
                return s + e * Math.cos(alpha * t * 2 * Math.PI);
            }
        },
        interpolate = function (type, s, e, t, alpha, beta) {
            // interpolate(string type,float from,float to,float time,float alpha,float beta)
            // s = starting value
            // e = ending value
            // t = time variable (going from 0 to 1)
            var fn = interpolations[type];
            if (fn) {
                return fn(s, e, t, alpha, beta);
            } else {
                return robbertPenner[type](t, s, e - s, 1);
            }
        };
    return function (settings) {
        /* settings = {
            from: Number
            to: Number
            in: Number
            ease: String
            alpha: Number (optional)
            beta: Number (optional)
            stay: Boolean (optional)
            do: Gunction (value, time) {} (optional)
            onComplete: function () {} (optional)
            id: Number (optional),
            updateWhenPaused: Boolean (optional)
        }*/
        var time = 0,
            added = false,
            running = true,
            tween = new Entity(settings).extend({
                id: settings.id,
                update: function (data) {
                    if (!running) {
                        return;
                    }
                    time += data.speed;
                    // run update
                    if (settings.do) {
                        settings.do.apply(this, [interpolate(
                            settings.ease || 'linear',
                            settings.from || 0,
                            Utils.isDefined(settings.to) ? settings.to : 1,
                            time / (settings.in),
                            Utils.isDefined(settings.alpha) ? settings.alpha : 1,
                            Utils.isDefined(settings.beta) ? settings.beta : 1
                        ), time]);
                    }
                    // end
                    if (!settings.stay && time >= settings.in) {
                        if (settings.onComplete) {
                            settings.onComplete.apply(this);
                        }
                        Bento.objects.remove(tween);
                        added = false;
                    }
                },
                begin: function () {
                    time = 0;
                    if (!added) {
                        Bento.objects.add(tween);
                        added = true;
                    }
                    running = true;
                    return tween;
                },
                stop: function () {
                    time = 0;
                    running = false;
                    return tween;
                }
            });
        if (settings.in === 0) {
            settings.in = 1;
        }
        // tween automatically starts ?
        tween.begin();
        return tween;
    };
});