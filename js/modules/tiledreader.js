/**
 * A generic interpreter for Tiled map JSON files.
 * <br>Exports: Constructor
 * @module bento/tiledreader
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Tiled map JSON asset
 * @param {Function} settings.onExternalTileset - Called if an external tileset is needed, expects a JSON to be returned (the developer is expected to load the external tileset) Must be .json and not .tsx files.
 * @param {Function} [settings.onLayer] - Called when passing a layer, parameters: (layerJSON)
 * @param {Function} [settings.onTile] - Called when passing a tile, parameters: (tileX, tileY, tilesetJSON, tileIndex, flipX, flipY, flipDiagonal)
 * @param {Function} [settings.onObject] - Called when passing an object, parameters: (objectJSON, tilesetJSON, tileIndex) <br>Latter two if a gid is present in the objectJSON
 * @param {Function} [settings.onComplete] - Called when the reader is done
 * @param {Boolean} [settings.spawn] - Spawns entities
 * @returns Object
 */
bento.define('bento/tiledreader', [], function () {
    'use strict';
    var FLIPX = 0x80000000;
    var FLIPY = 0x40000000;
    var FLIPDIAGONAL = 0x20000000;

    var TiledReader = function (settings) {
        // cache callbacks
        var onExternalTileset = settings.onExternalTileset;
        var onLayer = settings.onLayer;
        var onTile = settings.onTile;
        var onObject = settings.onObject;
        var onComplete = settings.onComplete;

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
                cachedFirstGids.push(tileset.firstgid);
            }
        };
        var decompress = function (layer) {
            var base64ToUint32array = function (base64) {
                var raw = window.atob(base64);
                var i;
                var len = raw.length;
                var bytes = new Uint8Array(len);
                for (i = 0; i < len; i++) {
                    bytes[i] = raw.charCodeAt(i);
                }
                var data = new Uint32Array(bytes.buffer, 0, len / 4);
                return data;
            };
            var encoding = layer.encoding;
            if (encoding === 'base64') {
                layer.data = base64ToUint32array(layer.data);
                layer.encoding = null;
            } else if (encoding) {
                // TODO: compression formats
                throw "ERROR: compression not supported. Please set Tile Layer Format to CSV in Tiled.";
            }
            return layer;
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
                    firstGid = cachedFirstGids[l];
                    if (firstGid <= gid) {
                        current = tilesets[l];
                        currentFirstGid = firstGid;
                    }
                }

                // tileset is external?
                if (current.source) {
                    current = externalTilesets[current.source];
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
                var flipX;
                var flipY;
                var flipDiagonal;

                // no tile
                if (gid === 0) {
                    return;
                }

                // read out the flags
                flipX = (gid & FLIPX);
                flipY = (gid & FLIPY);
                flipDiagonal = (gid & FLIPDIAGONAL);

                // clear flags
                gid &= ~(FLIPX | FLIPY | FLIPDIAGONAL);

                // get the corresponding tileset and tile index
                tilesetData = getTileset(gid);
                tileIndex = gid - tilesetData.firstGid;

                // callback
                onTile(x, y, tilesetData.tileSet, tileIndex, flipX, flipY, flipDiagonal);
            };
            var objectCallback = function (object) {
                var tileIndex;
                var tilesetData;
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

                    // decompress data?
                    decompress(layer);

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
            if (onComplete) {
                onComplete();
            }
        };

        importTilesets();

        // loopLayers();

        return {
            /**
             * Read tiled JSON and loop through all layers, tiles and objects
             * @function
             * @instance
             * @name read
             */
            read: loopLayers
        };
    };

    return TiledReader;
});