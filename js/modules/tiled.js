/**
 * Reads Tiled JSON file and draws layers.
 * Tile layers are drawn onto canvas images. If the map is larger than maxCanvasSize (default 1024 * 1024),
 * the layer is split into multiple sprites.
 * <br>Exports: Constructor
 * @module bento/tiled
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Tiled map JSON asset
 * @param {Boolean} settings.merge - Merge tile layers into a single sprite layer, default: false
 * @param {Number} settings.maxCanvasSize - Max canvasSize for the canvas objects, default: Vector2(1024, 1024)
 * @param {Number} settings.onObject - callback for tiled objects
 * @param {Boolean} [settings.spawn] - Spawns background entities (drawn tile layers)
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
    // a collection of sprites/canvases that represent the drawn tiled layers
    var LayerSprites = function (canvasSize, mapSize) {
        // number of sprites horizontally
        var spritesCountX = Math.ceil(mapSize.x / canvasSize.x);
        var spritesCountY = Math.ceil(mapSize.y / canvasSize.y);
        // combined width of canvases
        var width = spritesCountX * canvasSize.x;
        var height = spritesCountY * canvasSize.y;
        // collection of canvases
        var layers = {
            // "0": [canvas, canvas, ...]
            length: 0
        };
        var initLayer = function (layerId) {
            var i;
            var layer = [];
            var canvas;
            var context;

            for (i = 0; i < spritesCountX * spritesCountY; ++i) {
                canvas = document.createElement('canvas');
                canvas.width = canvasSize.x;
                canvas.height = canvasSize.y;
                context = canvas.getContext('2d');
                canvas.context = context;
                layer.push(canvas);
            }
            layers[layerId] = layer;
            layers.length += 1;
        };
        var getCanvas = function (layerId, destination) {
            // convert destination position to sprite index
            var x = Math.floor(destination.x / canvasSize.x) % spritesCountX;
            var y = Math.floor(Math.floor(destination.y / canvasSize.y) / spritesCountX);
            var index = x + y * spritesCountX;

            // init collection if needed
            if (!layers[layerId]) {
                initLayer(layerId);
            }

            return layers[layerId][index];
        };

        return {
            spritesCountX: spritesCountX,
            spritesCountY: spritesCountY,
            canvasSize: canvasSize,
            layers: layers,
            getSpritesFromLayer: function (layerId) {
                return layers[layerId];
            },
            drawTile: function (layerId, destination, source, packedImage, flipX, flipY, flipD) {
                // get the corresponding canvas
                var canvas = getCanvas(layerId, destination);
                var context = canvas.context;
                var doFlipX = false;
                var doFlipY = false;
                var rotation = 0;

                // convert to rotation and flipping
                if (!flipD) {
                    if (flipX && flipY) {
                        rotation = Math.PI;
                    } else {
                        doFlipX = flipX;
                        doFlipY = flipY;
                    }
                } else {
                    if (!flipX && !flipY) {
                        rotation = Math.PI / 2;
                        doFlipY = true;
                    } else if (flipX && !flipY) {
                        rotation = Math.PI / 2;
                    } else if (!flipX && flipY) {
                        rotation = Math.PI * 3 / 2;
                    } else if (flipX && flipY) {
                        rotation = Math.PI / 2;
                        doFlipX = true;
                    }
                }

                context.save();
                // move to destination
                context.translate(destination.x, destination.y);
                // offset origin for rotation
                context.translate(source.width / 2, source.height / 2);
                // apply rotation
                context.rotate(rotation);
                context.scale(doFlipX ? -1 : 1, doFlipY ? -1 : 1);
                // offset origin
                context.translate(-source.width / 2, -source.height / 2);
                // draw the tile!
                context.drawImage(
                    packedImage.image,
                    packedImage.x + source.x,
                    packedImage.y + source.y,
                    source.width,
                    source.height,
                    0,
                    0,
                    destination.width,
                    destination.height
                );
                context.restore();
            }
        };
    };

    var Tiled = function (settings) {
        var assetName = settings.assetName;
        var json = settings.tiled || Bento.assets.getJson(assetName);
        var width = json.width || 0;
        var height = json.height || 0;
        var tileWidth = json.tilewidth || 0;
        var tileHeight = json.tileheight || 0;
        var mergeLayers = json.merge || false;
        var onObject = settings.onObject;
        var maxCanvasSize = settings.maxCanvasSize || new Vector2(1024, 1024);
        var mapSize = new Vector2(width * tileWidth, height * tileHeight);
        var currentSpriteLayer = -1;
        var layerSprites = new LayerSprites(maxCanvasSize, mapSize);
        var entities = [];
        var tiledReader = new TiledReader({
            tiled: json,
            onLayer: function (layer) {
                if (layer.type === "tilelayer") {
                    if (!mergeLayers) {
                        currentSpriteLayer += 1;
                    } else {
                        currentSpriteLayer = 0;
                    }
                }
            },
            onTile: function (tileX, tileY, tileSet, tileIndex, flipX, flipY, flipD) {
                // get destination position
                var x = tileX * tileWidth;
                var y = tileY * tileHeight;
                var destination = new Rectangle(x, y, tileWidth, tileHeight);

                // get source position
                var source = getSourceTile(tileSet, tileIndex);

                // retrieve the corresponding image asset
                // assuming the asset name is the same the image url!
                var imageUrl = tileSet.image;
                var assetName;
                var imageAsset;
                assetName = imageUrl.substring(imageUrl.indexOf('images/') + ('images/').length);
                assetName = assetName.replace('.png', '');
                imageAsset = Bento.assets.getImage(assetName);

                // draw on the layer
                layerSprites.drawTile(
                    currentSpriteLayer,
                    destination,
                    source,
                    imageAsset,
                    flipX,
                    flipY,
                    flipD
                );
            },
            onObject: function (object, tileSet, tileIndex) {
                if (onObject) {
                    onObject(object, tileSet, tileIndex);
                }
                if (settings.spawnEntities) {
                    spawnEntity(object, tileSet, tileIndex);
                }
            },
            onComplete: function () {
                // spawn background entities?
                if (!settings.spawnBackground) {
                    return;
                }
                var layers = layerSprites.layers;
                var layer;
                var l = layers.length;
                var i;
                var canvasSize = layerSprites.canvasSize;
                var spritesCountX = layerSprites.spritesCountX;
                var spritesCountY = layerSprites.spritesCountY;
                var makeEntity = function () {
                    var j = 0;
                    var canvas;
                    var sprite;
                    var entity;
                    for (j = 0; j < layer.length; ++j) {
                        canvas = layer[j];
                        sprite = new Sprite({
                            image: new PackedImage(canvas)
                        });
                        entity = new Entity({
                            z: 0,
                            name: 'background',
                            family: ['backgrounds'],
                            position: new Vector2(
                                canvasSize.x * (j % spritesCountX),
                                canvasSize.y * Math.floor(j / spritesCountX)
                            ),
                            components: [sprite]
                        });
                        Bento.objects.attach(entity);
                        entities.push(entity);
                    }
                };

                for (i = 0; i < l; ++i) {
                    layer = layers[i];
                    makeEntity();
                }
            }
        });
        // helper function to get the source in the image
        var getSourceTile = function (tileset, index) {
            var tilesetWidth = Math.floor(tileset.imagewidth / tileset.tilewidth);
            var tilesetHeight = Math.floor(tileset.imageheight / tileset.tileheight);

            return new Rectangle(
                (index % tilesetWidth) * tileset.tilewidth,
                Math.floor(index / tilesetWidth) * tileset.tileheight,
                tileset.tilewidth,
                tileset.tileheight
            );
        };
        // attempt to spawn object by tileproperty "module"
        // this is mainly for backwards compatibility of the old Tiled module
        var spawnEntity = function (object, tileSet, tileIndex) {
            var tileproperties;
            var properties;
            var moduleName;
            var x = object.x;
            var y = object.y;
            var params;
            if (!object.gid) {
                // not an entity (it's a rectangle or other shape)
                return;
            }
            tileproperties = tileSet.tileproperties;
            if (!tileproperties) {
                return;
            }
            properties = tileproperties[tileIndex];
            if (!properties) {
                return;
            }
            moduleName = properties.module;
            if (!moduleName) {
                return;
            }
            params = {
                tiled: {
                    position: new Vector2(x, y),
                    tile: properties,
                    object: Utils.extend(object, object.properties), // extend properties with tiled info
                    json: settings.name // reference to current json name
                }
            };
            bento.require([moduleName], function (Instance) {
                var instance = new Instance(params),
                    origin = instance.origin,
                    dimension = instance.dimension;

                instance.position = new Vector2(x + origin.x, y + (origin.y - dimension.height));

                // add to game
                Bento.objects.attach(instance);
                entities.push(instance);
            });
        };

        tiledReader.read();

        return {
            name: settings.name || 'tiled',
            dimension: new Rectangle(0, 0, mapSize.x, mapSize.y),
            entities: entities
        };
    };

    return Tiled;
});