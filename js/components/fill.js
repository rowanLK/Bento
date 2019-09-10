/**
 * Component that fills a rectangle with a color.
 * <br>Exports: Constructor
 * @module bento/components/fill
 * @moduleName Fill
 * @param {Object} settings - Settings
 * @param {Array} settings.color - Color ([1, 1, 1, 1] is pure white). Alternatively use the Color module.
 * @param {Rectangle} settings.dimension - Size to fill up (defaults to viewport size)
 * @param {Rectangle} settings.origin - Origin point
 * @param {Rectangle} settings.originRelative - Set origin with relative to the dimension
 * @returns Returns a component object to be attached to an entity.
 * @snippet Fill|constructor
Fill({
    name: 'fill',
    dimension: viewport.getSize(),
    color: [${1:0}, ${2:0}, ${3:0}, 1], // [1, 1, 1, 1] is pure white
    originRelative: new Vector2(${4:0}, ${5:0})
})
 */
bento.define('bento/components/fill', [
    'bento/utils',
    'bento',
    'bento/math/vector2',
    'bento/components/canvas2d/fill',
    'bento/components/pixi/fill',
    'bento/components/three/fill'
], function (
    Utils,
    Bento,
    Vector2,
    Canvas2DFill,
    PixiFill,
    ThreeFill
) {
    'use strict';
    // The fill is always an inherited version of either canvas2d, pixi or three versions,
    // similar to Sprite
    var renderer = Bento.getRenderer();
    var Constructor = Canvas2DFill;
    var Fill = function (settings) {
        if (!(this instanceof Fill)) {
            return new Fill(settings);
        }
        Constructor.call(this, settings);
    };

    // pick the class
    if (!renderer) {
        console.warn('Warning: Fill is included before renderer is set. Defaulting to canvas2d Fill');
    } else if (renderer.name === 'pixi') {
        Constructor = PixiFill;
    } else if (renderer.name === 'three.js') {
        Constructor = ThreeFill;
    }
    // inherit from class
    Fill.prototype = Object.create(Constructor.prototype);
    Fill.prototype.constructor = Fill;

    return Fill;
});