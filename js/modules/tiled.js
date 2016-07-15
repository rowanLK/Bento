/**
 * Reads Tiled JSON file and draws layers.
 * Tile layers are drawn onto canvas images. If the map is larger than maxCanvasSize (default 1024 * 1024),
 * the layer is split into multiple sprites.
 * <br>Exports: Constructor
 * @module bento/tiled
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Tiled map JSON asset
 * @param {Boolean} settings.merge - Merge tile layers into a single sprite layer, default: false
 * @param {Number} settings.maxCanvasSize - Max size for the canvas objects, default: 1024
 * @param {Boolean} [settings.spawn] - Spawns entities
 * @returns Object
 */
bento.define('bento/tiled', [
    'bento',
    'bento/entity',
    'bento/components/sprite',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/polygon',
    'bento/packedimage',
    'bento/utils',
    'bento/tiledreader'
], function (
    Bento, 
    Entity, 
    Sprite, 
    Vector2, 
    Rectangle, 
    Polygon, 
    PackedImage, 
    Utils, 
    TiledReader
) {
    'use strict';
    // a collection of sprites that represent the drawn tiled layers
    var LayerSprites = function () {
        var layers = {
            // "1": [Sprite]
        };
        return {
            width: 0, // number of sprites horizontally
            get: function (layerId) {
                return layers[layerId];
            },
            drawTile: function (layerId, position, ) {
                // 
            }
        };
    };

    return function (settings) {
        var json = settings.tiled;
        var width = json.width || 0;
        var height = json.height || 0;
        var tileWidth = json.tilewidth || 0;
        var tileHeight = json.tileheight || 0;
        var tiledReader = new TiledReader({
            tiled: json,
            onLayer: function (layer) {},
            onTile: function (tileSet, tileIndex, flipX, flipY) {},
            onObject: function (object, tileSet, tileIndex) {},
            onComplete: function () {}
        });
    };
});