/**
 * A generic interpreter for Tiled map JSON files.
 * <br>Exports: Constructor
 * @module bento/tiledreader
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Tiled map JSON asset
 * @param {Function} settings.onExternalTileset - Called if an external tileset is needed, expects a JSON to be returned (the developer is expected to load the external tileset)
 * @param {Function} [settings.onLayer] - Called when passing a layer, parameters: layer JSON
 * @param {Function} [settings.onTile] - Called when passing a tile, parameters: tile x, tile y, tileset JSON, tileIndex, flipX, flipY
 * @param {Function} [settings.onObject] - Called when passing an object, parameters: object JSON, tileset JSON, tileIndex (if a gid is present)
 * @param {Function} [settings.onComplete] - Called when the reader is done
 * @param {Boolean} [settings.spawn] - Spawns entities
 * @returns Object
 */
bento.define('bento/tiledreader', [], function () {
    'use strict';
    var TiledReader = function (settings) {
        // cache callbacks
        var onExternalTileset = settings.onExternalTileset;
        var onLayer = settings.onLayer;
        var onTile = settings.onTile;
        var onObject = settings.onObject;

        // the tiled json
        var json = settings.tiled || {};

        // width and height in tiles
        var width = json.width || 0;
        var height = json.height || 0;

        // width and height of a single tile
        var tileWidth = json.tilewidth || 0;
        var tileHeight = json.tileheight || 0;

        // tilesets
        var tilesets = json.tilesets || [];
        var tilesetsCount = tilesets.length;
        var externalTilesets = {
            // "source": tileset JSON
        };
        var cachedFirstGids = [];

        // layers
        var layers = json.layers || [];
        var layersCount = layers.length;

        // load external tilesets
        var importTilesets = function () {
            var i;
            var l;
            var tileset;
            var source;

            // loop through all tilesets, look for external tilesets
            for (i = 0, l = tilesets.length; i < l; ++i) {
                tileset = tilesets[i];
                source = tileset.source;
                if (source) {
                    // to stay independent of any asset loader, this is loaded through a callback
                    externalTilesets[source] = onExternalTileset(source);
                }

                // meanwhile, cache all firstGids for faster lookups
                firstGids.push(tileset.firstgid);
            }
        };
        var loopLayers = function () {
            var i, il;
            var j, jl;
            var k, kl;
            var layers = json.layers;
            var layer;
            var layerData;
            var lh;
            var lw;
            var objects;
            var object;
            var properties;
            var layerId = 0;
            var type;
            var getTileset = function (gid) {
                var l,
                    tileset,
                    count = tilesetsCount,
                    current = null,
                    firstGid,
                    currentFirstGid;

                // loop through tilesets and find the highest firstgid that's
                // still lower or equal to the gid
                for (l = 0; l < count; ++l) {
                    firstGid = firstGids[l];
                    if (firstGid <= gid) {
                        current = tilesets[l];
                        currentFirstGid = firstGid;
                    }
                }
                return {
                    tileSet: current,
                    firstGid: currentFirstGid
                };
            };
            var tileCallback = function (data, x, y) {
                // callback for every tile (stored layer.data)
                var gid = data[y * width + x];
                var tilesetData;
                var tileIndex;

                if (gid === 0) {
                    return;
                }
                // get the corresponding tileset and tile index
                tilesetData = getTileset(gid);
                tileIndex = gid - tilesetData.firstGid;

                // callback
                onTile(x, y, tilesetData.tileset, tileIndex);
            };
            var objectCallback = function (object) {
                var tileIndex;
                var gid = object.gid;
                if (gid) {
                    // get the corresponding tileset and tile index
                    tilesetData = getTileset(gid);
                    tileIndex = gid - tilesetData.firstGid;
                    onObject(object, tilesetData.tileSet, tileIndex);
                } else {
                    // gid may not be present, in that case it's a rectangle or other shape
                    onObject(object);
                }
            };

            // loop through layers
            for (k = 0, kl = layers.length; k < kl; ++k) {
                layer = layers[k];
                type = layer.type;

                if (onLayer) {
                    onLayer(layer);
                }
                if (type === 'tilelayer') {
                    // skip layer if invisible???
                    if (!layer.visible) {
                        continue;
                    }
                    
                    layerData = layer.data;

                    // loop through layer.data, which should be width * height in size
                    for (j = 0; j < height; ++j) {
                        for (i = 0; i < width; ++i) {
                            tileCallback(layerData, i, j);
                        }
                    }

                } else if (type === 'objectgroup') {
                    objects = layer.objects || [];
                    il = objects.length;
                    for (i = 0; i < il; ++i) {
                        object = objects[i];

                        objectCallback(object);
                    }
                }
            }
        };

        importTilesets();

        // loopLayers();

        return {
            read: loopLayers
        };
    };

    return TiledReader;
});