/**
 * An entity that behaves like a counter.
 * <br>Exports: Constructor
 * @module bento/gui/counter
 * @moduleName Counter
 * @returns Entity
 * @snippet Counter|constructor
Counter({
    z: ${1:0},
    name: '$2',
    value: ${3:0},
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:10},
    padding: ${7:0},
    align: '${8:center}',
    spacing: new Vector2(${9:0}, ${10:0}),
    position: new Vector2(${11:0}, ${12:0}),
    updateWhenPaused: ${13:0},
    float: ${14:false},
});
 * @snippet Counter|animations
Counter({
    z: ${1:0},
    name: '$2',
    value: ${3:0},
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:10},
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
    },
    padding: ${7:0},
    align: '${8:center}',
    spacing: new Vector2(${9:0}, ${10:0}),
    position: new Vector2(${11:0}, ${12:0}),
    updateWhenPaused: ${13:0},
    float: ${14:false},
});
 */
bento.define('bento/gui/counter', [
    'bento',
    'bento/entity',
    'bento/math/vector2',
    'bento/components/sprite',
    'bento/utils'
], function (
    Bento,
    Entity,
    Vector2,
    Sprite,
    Utils
) {
    'use strict';
    return function (settings) {
        /*{
            value: Number,
            spacing: Vector,
            align: String,
            image: Image, // lower priority
            frameWidth: Number, // lower priority
            frameHeight: Number, // lower priority
            animations: Object, // only way to overwrite animations
            sprite: Sprite({
                image: Image,
                imageName: String,
                frameWidth: Number,
                frameHeight: Number,
                animations: Animation
            }),
            position: Vector
        }*/
        var value = settings.value || 0;
        var spacing = settings.spacing || new Vector2(0, 0);
        var alignment = settings.align || settings.alignment || 'right';
        var digitWidth = 0;
        var children = [];
        var spriteSettings = {};
        /*
         * Counts the number of digits in the value
         */
        var getDigits = function () {
            return value.toString().length;
        };
        /*
         * Returns an entity with all digits as animation
         */
        var createDigit = function () {
            var defaultNumbers = {
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
                // TODO: add a '-' as default or not?
                // '-': {
                //     frames: [10]
                // }
            };
            var sprite = new Sprite({
                image: spriteSettings.image,
                padding: spriteSettings.padding,
                imageName: spriteSettings.imageName,
                frameWidth: spriteSettings.frameWidth,
                frameHeight: spriteSettings.frameHeight,
                frameCountX: spriteSettings.frameCountX,
                frameCountY: spriteSettings.frameCountY,
                animations: settings.animations || defaultNumbers
            });
            // settings.digit can be used to change every digit entity constructor
            var digitSettings = Utils.extend({
                components: [sprite]
            }, settings.digit || {});
            var entity = new Entity(digitSettings);

            // update width
            digitWidth = sprite.frameWidth;

            return entity;
        };
        /*
         * Adds or removes children depending on the value
         * and number of current digits and updates
         * the visualuzation of the digits
         */
        var updateDigits = function () {
            // add or remove digits
            var i, l,
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
                    container.attach(digit);

                }
            } else if (difference > 0) {
                // remove
                for (i = 0; i < Math.abs(difference); ++i) {
                    digit = children.pop();
                    container.remove(digit);
                }
            }
            /* update animations */
            for (i = 0, l = children.length; i < l; ++i) {
                digit = children[i];
                digit.position = new Vector2((digitWidth + spacing.x) * i, 0);
                digit.getComponent('sprite', function (sprite) {
                    sprite.setAnimation(valueStr.substr(i, 1));
                });
            }

            /* alignment */
            if (alignment === 'right') {
                // move all the children
                for (i = 0, l = children.length; i < l; ++i) {
                    digit = children[i];
                    pos = digit.position;
                    pos.substractFrom(new Vector2((digitWidth + spacing.x) * digits - spacing.x, 0));
                }
            } else if (alignment === 'center') {
                for (i = 0, l = children.length; i < l; ++i) {
                    digit = children[i];
                    pos = digit.position;
                    pos.addTo(new Vector2(((digitWidth + spacing.x) * digits - spacing.x) / -2, 0));
                }
            }
        };
        var entitySettings = {
            z: settings.z,
            name: settings.name,
            position: settings.position
        };
        var container;

        // copy spritesettings
        spriteSettings.image = settings.image;
        spriteSettings.imageName = settings.imageName;
        spriteSettings.padding = settings.padding;
        spriteSettings.frameWidth = settings.frameWidth;
        spriteSettings.frameHeight = settings.frameHeight;
        spriteSettings.frameCountX = settings.frameCountX;
        spriteSettings.frameCountY = settings.frameCountY;
        // can also use a predetermined sprite as base for every
        if (settings.sprite) {
            settings.sprite = settings.sprite.animationSettings;
            spriteSettings.image = settings.sprite.image;
            spriteSettings.imageName = settings.sprite.imageName;
            spriteSettings.padding = settings.sprite.padding;
            spriteSettings.frameWidth = settings.sprite.frameWidth;
            spriteSettings.frameHeight = settings.sprite.frameHeight;
            spriteSettings.frameCountX = settings.sprite.frameCountX;
            spriteSettings.frameCountY = settings.sprite.frameCountY;
        }

        Utils.extend(entitySettings, settings);
        // merge components array
        entitySettings.components = settings.components;
        /*
         * Public interface
         */
        container = new Entity(entitySettings).extend({
            /*
             * Sets current value
             * @snippet #Counter.setValue|snippet
                setValue(${1:0});
             */
            setValue: function (val) {
                value = val;
                updateDigits();
            },
            /*
             * Retrieves current value
             * @snippet #Counter.getValue|Number
                getValue();
             */
            getValue: function () {
                return value;
            },
            /*
             * Add value
             * @snippet #Counter.addValue|snippet
                addValue(${1:0});
             */
            addValue: function (val) {
                value += val;
                updateDigits();
            },
            /*
             * Get number of digits
             * @snippet #Counter.getDigits|Number
                getDigits();
             */
            getDigits: function () {
                return getDigits();
            },
            /*
             * Loop through digits
             * @snippet #Counter.loopDigits|snippet
                loopDigits(function (digitEntity) {$1});
             */
            loopDigits: function (callback) {
                var i = 0, l;
                for (i = 0, l = children.length; i < l; ++i) {
                    callback(children[i]);
                }
            }
        });

        updateDigits();

        return container;
    };
});