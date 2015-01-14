rice.define('rice/components/sprite', [
    'rice/sugar',
    'rice/components/translation',
    'rice/components/rotation',
    'rice/components/scale',
    'rice/components/animation'
], function (Sugar, Translation, Rotation, Scale, Animation) {
    'use strict';
    return function (base, settings) {
        Translation(base, settings);
        Scale(base, settings);
        Rotation(base, settings);
        Animation(base, settings)
        return base;
    };
});