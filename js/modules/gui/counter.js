bento.define('bento/gui/counter', [
    'bento',
    'bento/entity',
    'bento/math/vector2',
    'bento/components/sprite',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/utils'
], function (
    Bento,
    Entity,
    Vector2,
    Sprite,
    Translation,
    Rotation,
    Scale,
    Utils
) {
    'use strict';
    return function (settings) {
        /*{
            value: Number,
            spacing: Vector,
            align: String,
            frameWidth: Number,
            frameHeight: Number,
            image: Image,
            position: Vector
        }*/
        var value = settings.value || 0,
            spacing = settings.spacing || new Vector2(0, 0),
            alignment = settings.align || settings.alignment || 'right',
            digitWidth = 0,
            children = [],
            /*
             * Counts the number of digits in the value
             */
            getDigits = function () {
                return Math.floor(value).toString().length;
            },
            /*
             * Returns an entity with all digits as animation
             */
            createDigit = function () {
                return new Entity({
                    components: [Sprite],
                    sprite: {
                        image: settings.image,
                        frameWidth: settings.frameWidth,
                        frameHeight: settings.frameHeight,
                        animations: {
                            '0': {
                                frames: [0]
                            },
                            '1': {
                                frames: [1]
                            },
                            '2': {
                                frames: [2]
                            },
                            '3': {
                                frames: [3]
                            },
                            '4': {
                                frames: [4]
                            },
                            '5': {
                                frames: [5]
                            },
                            '6': {
                                frames: [6]
                            },
                            '7': {
                                frames: [7]
                            },
                            '8': {
                                frames: [8]
                            },
                            '9': {
                                frames: [9]
                            }
                        }
                    },
                    init: function () {
                        // setup all digits
                        digitWidth = settings.frameWidth;
                    }
                });
            },
            /*
             * Adds or removes children depending on the value
             * and number of current digits and updates
             * the visualuzation of the digits
             */
            updateDigits = function () {
                // add or remove digits
                var i,
                    valueStr = value.toString(),
                    pos,
                    digit,
                    digits = getDigits(),
                    difference = children.length - digits;
                /* update number of children to be
                    the same as number of digits*/
                if (difference < 0) {
                    // create new
                    for (i = 0; i < Math.abs(difference); ++i) {
                        digit = createDigit();
                        children.push(digit);
                        base.attach(digit);

                    }
                } else if (difference > 0) {
                    // remove
                    for (i = 0; i < Math.abs(difference); ++i) {
                        digit = children.pop();
                        base.remove(digit);
                    }
                }
                /* update animations */
                for (i = 0; i < children.length; ++i) {
                    digit = children[i];
                    digit.position = new Vector2((digitWidth + spacing.x) * i, 0);
                    digit.sprite.setAnimation(valueStr.substr(i, 1));
                }

                /* alignment */
                if (alignment === 'right') {
                    // move all the children
                    for (i = 0; i < children.length; ++i) {
                        digit = children[i];
                        pos = digit.position.clone();
                        pos.substract(new Vector2((digitWidth + spacing.x) * digits - spacing.x, 0));
                        digit.position = pos;
                    }
                } else if (alignment === 'center') {
                    for (i = 0; i < children.length; ++i) {
                        digit = children[i];
                        pos = digit.position;
                        pos.addTo(new Vector2(((digitWidth + spacing.x) * digits - spacing.x) / -2, 0));
                    }
                }
            },
            entitySettings = {
                z: settings.z,
                name: settings.name,
                position: settings.position,
                components: [Translation, Rotation, Scale]
            },
            base;

        Utils.extend(entitySettings, settings);

        /*
         * Public interface
         */
        base = new Entity(entitySettings).extend({
            init: function () {
                updateDigits();
            },
            /*
             * Sets current value
             */
            setValue: function (val) {
                value = val;
                updateDigits();
            },
            /*
             * Retrieves current value
             */
            getValue: function () {
                return value;
            },
            addValue: function (val) {
                value += val;
                updateDigits();
            },
            getDigits: function () {
                return getDigits();
            }
        });
        return base;
    };
});