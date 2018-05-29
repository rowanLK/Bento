/**
 * The Tween is an entity that performs an interpolation within a timeframe. The entity
 * removes itself after the tween ends.
 * Default tweens: linear, quadratic, squareroot, cubic, cuberoot, exponential, elastic, sin, cos
 * <br>Exports: Constructor
 * @module bento/tween
 * @moduleName Tween
 * @param {Object} settings - Settings object
 * @param {Number} settings.from - Starting value
 * @param {Number} settings.to - End value
 * @param {Number} settings.in - Time frame
 * @param {String} settings.ease - Choose between default tweens or see {@link http://easings.net/}
 * @param {Boolean} settings.wait - Do not immediately begin tween (default false)
 * @param {Number} [settings.decay] - For use in exponential and elastic tweens: decay factor (negative growth)
 * @param {Number} [settings.growth] - For use in exponential and elastic tweens: growth factor
 * @param {Number} [settings.oscillations] - For use in sin, cos and elastic tweens: number of oscillations
 * @param {Function} [settings.onCreate] - Called as soon as the tween is added to the object manager and before the delay (if any).
 * @param {Function} [settings.onStart] - Called before the first tween update and after a delay (if any).
 * @param {Function} [settings.onUpdate] - Called every tick during the tween lifetime. Callback parameters: (value, time)
 * @param {Function} [settings.onComplete] - Called when tween ends
 * @param {Number} [settings.id] - Adds an id property to the tween. Useful when spawning tweens in a loop (remember that functions form closures)
 * @param {Number} [settings.delay] - Wait an amount of ticks before starting
 * @param {Boolean} [settings.applyOnDelay] - Perform onUpdate even during delay
 * @param {Boolean} [settings.stay] - Never complete the tween (only use if you know what you're doing)
 * @param {Boolean} [settings.updateWhenPaused] - Continue tweening even when the game is paused (optional) NOTE: tweens automatically copy the current pause level if this is not set
 * @param {Boolean} [settings.ignoreGameSpeed] - Run tween at normal speed (optional)
 * @returns Entity
 * @snippet Tween|constructor
Tween({
    from: ${1:0},
    to: ${2:1},
    in: ${3:60},
    delay: ${4:0},
    applyOnDelay: ${5:0},
    ease: '${6:linear}',
    decay: ${7:1},
    oscillations: ${8:1},
    onStart: function () {},
    onUpdate: function (v, t) {
        ${9}
    },
    onComplete: function () {
        ${10}
    }
});
 */

// Deprecated parameters
// * @param {Number} [settings.alpha] - For use in exponential y=exp(αt) or elastic y=exp(αt)*cos(βt)
// * @param {Number} [settings.beta] - For use in elastic y=exp(αt)*cos(βt)
bento.define('bento/tween', [
    'bento',
    'bento/math/vector2',
    'bento/utils',
    'bento/entity'
], function (Bento, Vector2, Utils, Entity) {
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
    };
    var interpolations = {
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
    };
    var interpolate = function (type, s, e, t, alpha, beta) {
        // interpolate(string type,float from,float to,float time,float alpha,float beta)
        // s = starting value
        // e = ending value
        // t = time variable (going from 0 to 1)
        var fn = interpolations[type];
        if (s.isVector2 && e.isVector2) {
            if (fn) {
                return new Vector2(
                    fn(s.x, e.x, t, alpha, beta),
                    fn(s.y, e.y, t, alpha, beta)
                );
            } else {
                return new Vector2(
                    robbertPenner[type](t, s.x, e.x - s.x, 1),
                    robbertPenner[type](t, s.y, e.y - s.y, 1)
                );
            }
        } else {
            if (fn) {
                return fn(s, e, t, alpha, beta);
            } else {
                return robbertPenner[type](t, s, e - s, 1);
            }
        }
    };

    var Tween = function (settings) {
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
            ignoreGameSpeed: Boolean (optional)
        }*/
        var time = 0;
        var running = !settings.wait;
        var onUpdate = settings.onUpdate || settings.do;
        var onComplete = settings.onComplete;
        var onCreate = settings.onCreate;
        var onStart = settings.onStart;
        var applyOnDelay = settings.applyOnDelay;
        var hasStarted = false;
        var ease = settings.ease || 'linear';
        var startVal = settings.from || 0;
        var delay = settings.delay || 0;
        var delayTimer = 0;
        var endVal = Utils.isDefined(settings.to) ? settings.to : 1;
        var deltaT = settings.in || 1;
        var alpha = Utils.isDefined(settings.alpha) ? settings.alpha : 1;
        var beta = Utils.isDefined(settings.beta) ? settings.beta : 1;
        var ignoreGameSpeed = settings.ignoreGameSpeed;
        var stay = settings.stay;
        var autoResumeTimer = -1;
        var tween = new Entity(settings);
        var tweenBehavior = {
            name: 'tweenBehavior',
            start: function (data) {
                if (onCreate) {
                    onCreate.apply(tween);
                }
            },
            update: function (data) {
                //if an autoresume timer is running, decrease it and resume when it is done
                if (--autoResumeTimer === 0) {
                    tweenBehavior.resume();
                }
                if (!running) {
                    return;
                }
                if (delayTimer < delay) {
                    if (ignoreGameSpeed) {
                        delayTimer += 1;
                    } else {
                        delayTimer += data.speed;
                    }
                    // run onUpdate before start
                    if (applyOnDelay && onUpdate) {
                        onUpdate.apply(tween, [interpolate(
                            ease,
                            startVal,
                            endVal,
                            0,
                            alpha,
                            beta
                        ), 0]);
                    }
                    return;
                }
                if (ignoreGameSpeed) {
                    time += 1;
                } else {
                    time += data.speed;
                }
                // run onStart once
                if (!hasStarted) {
                    hasStarted = true;
                    if (onStart) {
                        onStart.apply(tween);
                    }
                }
                // run update
                if (onUpdate) {
                    onUpdate.apply(tween, [interpolate(
                        ease,
                        startVal,
                        endVal,
                        time / deltaT,
                        alpha,
                        beta
                    ), time]);
                }
                // end
                if (time >= deltaT && !stay) {
                    if (time > deltaT && onUpdate) {
                        //the tween didn't end neatly, so run onUpdate once more with a t of 1
                        onUpdate.apply(tween, [interpolate(
                            ease,
                            startVal,
                            endVal,
                            1,
                            alpha,
                            beta
                        ), time]);
                    }
                    if (onComplete) {
                        onComplete.apply(tween);
                    }
                    Bento.objects.remove(tween);
                }
            },
            /**
             * Start the tween. Only call if you used stop() before.
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name begin
             * @snippet #Tween.begin|Tween
            begin();
             */
            begin: function () {
                time = 0;
                if (!tween.isAdded) {
                    Bento.objects.attach(tween);
                }
                running = true;
                return tween;
            },
            /**
             * Stops the tween (note that the entity isn't removed).
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name stop
             * @snippet #Tween.stop|Tween
            stop();
             */
            stop: function () {
                time = 0;
                running = false;
                return tween;
            },
            /**
             * Pauses the tween. The tween will resume itself after a certain duration if provided.
             * @function
             * @instance
             * @param {Number} [duration] - time after which to autoresume. If not provided the tween is paused indefinitely.
             * @returns {Entity} Returns self
             * @name pause
             */
            pause: function (duration) {
                running = false;
                //if a duration is provided, resume the tween after that duration.
                if (duration) {
                    autoResumeTimer = duration;
                }
                return tween;
            },
            /**
             * Resumes the tween.
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name resume
             */
            resume: function () {
                if (!tween.isAdded) {
                    return tweenBehavior.begin();
                } else {
                    running = true;
                    return tween;
                }
            }
        };

        tween.attach(tweenBehavior);

        // extend functionality
        tween.extend({
            begin: tweenBehavior.begin,
            stop: tweenBehavior.stop,
            pause: tweenBehavior.pause,
            resume: tweenBehavior.resume,
        });
        if (settings.id) {
            tween.id = settings.id;
        }

        // convert decay and growth to alpha
        if (Utils.isDefined(settings.decay)) {
            alpha = -settings.decay;
        }
        if (Utils.isDefined(settings.growth)) {
            alpha = settings.growth;
        }
        if (Utils.isDefined(settings.oscillations)) {
            beta = settings.oscillations;
            if (settings.ease === 'sin' || settings.ease === 'cos') {
                alpha = settings.oscillations;
            }
        }

        // if (!Utils.isDefined(settings.ease)) {
        //     Utils.log("WARNING: settings.ease is undefined.");
        // }

        // Assuming that when a tween is created when the game is paused,
        // one wants to see the tween move during that pause
        if (!Utils.isDefined(settings.updateWhenPaused)) {
            tween.updateWhenPaused = Bento.objects.isPaused();
        }

        // tween automatically starts
        if (running) {
            tweenBehavior.begin();
        }

        return tween;
    };

    // enums
    Tween.LINEAR = 'linear';
    Tween.QUADRATIC = 'quadratic';
    Tween.CUBIC = 'cubic';
    Tween.SQUAREROOT = 'squareroot';
    Tween.CUBEROOT = 'cuberoot';
    Tween.EXPONENTIAL = 'exponential';
    Tween.ELASTIC = 'elastic';
    Tween.SIN = 'sin';
    Tween.COS = 'cos';
    Tween.EASEINQUAD = 'easeInQuad';
    Tween.EASEOUTQUAD = 'easeOutQuad';
    Tween.EASEINOUTQUAD = 'easeInOutQuad';
    Tween.EASEINCUBIC = 'easeInCubic';
    Tween.EASEOUTCUBIC = 'easeOutCubic';
    Tween.EASEINOUTCUBIC = 'easeInOutCubic';
    Tween.EASEINQUART = 'easeInQuart';
    Tween.EASEOUTQUART = 'easeOutQuart';
    Tween.EASEINOUTQUART = 'easeInOutQuart';
    Tween.EASEINQUINT = 'easeInQuint';
    Tween.EASEOUTQUINT = 'easeOutQuint';
    Tween.EASEINOUTQUINT = 'easeInOutQuint';
    Tween.EASEINSINE = 'easeInSine';
    Tween.EASEOUTSINE = 'easeOutSine';
    Tween.EASEINOUTSINE = 'easeInOutSine';
    Tween.EASEINEXPO = 'easeInExpo';
    Tween.EASEOUTEXPO = 'easeOutExpo';
    Tween.EASEINOUTEXPO = 'easeInOutExpo';
    Tween.EASEINCIRC = 'easeInCirc';
    Tween.EASEOUTCIRC = 'easeOutCirc';
    Tween.EASEINOUTCIRC = 'easeInOutCirc';
    Tween.EASEINELASTIC = 'easeInElastic';
    Tween.EASEOUTELASTIC = 'easeOutElastic';
    Tween.EASEINOUTELASTIC = 'easeInOutElastic';
    Tween.EASEINBACK = 'easeInBack';
    Tween.EASEOUTBACK = 'easeOutBack';
    Tween.EASEINOUTBACK = 'easeInOutBack';
    Tween.EASEINBOUNCE = 'easeInBounce';
    Tween.EASEOUTBOUNCE = 'easeOutBounce';
    Tween.EASEINOUTBOUNCE = 'easeInOutBounce';

    return Tween;
});