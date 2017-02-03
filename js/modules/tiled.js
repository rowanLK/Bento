/**
 * Reads Tiled JSON file and draws layers.
 * Tile layers are drawn onto canvas images. If the map is larger than maxCanvasSize (default 1024 * 1024),
 * the layer is split into multiple canvases. Easiest way to get started is to pass the asset name of the Tiled
 * JSON and set spawnBackground and spawnEntities to true.
 * <br>Exports: Constructor
 * @module bento/tiled
 * @moduleName Tiled
 * @param {Object} settings - Settings object
 * @param {String} settings.assetName - Name of the Tiled JSON asset to load
 * @param {Boolean} [settings.merge] - Merge tile layers into a single canvas layer, default: false
 * @param {Vector2} [settings.maxCanvasSize] - Max canvasSize for the canvas objects, default: Vector2(1024, 1024)
 * @param {Vector2} [settings.offset] - Offsets all entities/backgrounds spawned
 * @param {Function} [settings.onInit] - Callback on initial parsing, parameters: (tiledJson, externalTilesets)
 * @param {Function} [settings.onLayer] - Callback when the reader passes a layer object, parameters: (layer)
 * @param {Function} [settings.onTile] - Callback after tile is drawn, parameters: (tileX, tileY, tilesetJSON, tileIndex)
 * @param {Function} [settings.onObject] - Callback when the reader passes a Tiled object, parameters: (objectJSON, tilesetJSON, tileIndex) <br>Latter two if a gid is present. If no gid is present in the object JSON, it's most likely a shape! Check for object.rectangle, object.polygon etc.
 * @param {Function} [settings.onComplete] - Called when the reader passed all layers
 * @param {Boolean} [settings.spawnBackground] - Spawns background entities (drawn tile layers)
 * @param {Boolean} [settings.spawnEntities] - Spawns objects (in Tiled: assign a tile property called "module" and enter the module name, placing an object with that tile will spawn the corresponding entity), shapes are not spawned! You are expected to handle this yourself with the onObject callback.
 * @param {Boolean} [settings.onSpawn] - Callback when entity is spawned, parameters: (entity)
 * @param {Boolean} [settings.onSpawnComplete] - Callback when all entities were spawned, may be called later than onComplete due to its asynchronous nature
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
            layers.length = Math.max(layers.length, layerId + 1);
        };
        var getCanvas = function (layerId, destination) {
            // convert destination position to array index
            var x = Math.floor(destination.x / canvasSize.x) % spritesCountX;
            var y = Math.floor(destination.y / canvasSize.y) % spritesCountY;
            var index = x + y * spritesCountX;

            // init collection if needed
            if (!layers[layerId]) {
                initLayer(layerId);
            }

            return {
                index: index,
                canvas: layers[layerId][index]
            };
        };

        return {
            spritesCountX: spritesCountX,
            spritesCountY: spritesCountY,
            canvasSize: canvasSize,
            layers: layers,
            getSpritesFromLayer: function (layerId) {
                return layers[layerId];
            },
            drawTile: function (layerId, destination, source, packedImage, flipX, flipY, flipD, opacity) {
                // get the corresponding canvas
                var canvasData = getCanvas(layerId, destination);
                var canvas = canvasData.canvas;
                var index = canvasData.index;
                var context = canvas.context;
                var doFlipX = false;
                var doFlipY = false;
                var rotation = 0;
                // canvas offset
                var offset = new Vector2(
                    canvasSize.x * (index % spritesCountX),
                    canvasSize.y * Math.floor(index / spritesCountX)
                );

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
                context.translate(destination.x - offset.x, destination.y - offset.y);
                // offset origin for rotation
                context.translate(source.width / 2, source.height / 2);
                // apply rotation
                context.rotate(rotation);
                context.scale(doFlipX ? -1 : 1, doFlipY ? -1 : 1);
                // offset origin
                context.translate(-source.width / 2, -source.height / 2);
                // opacity
                if (opacity !== undefined) {
                    context.globalAlpha = opacity;
                }

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
                context.globalAlpha = 1;
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
        var onInit = settings.onInit;
        var onLayer = settings.onLayer;
        var onTile = settings.onTile;
        var onObject = settings.onObject;
        var onComplete = settings.onComplete;
        var onSpawn = settings.onSpawn;
        var onSpawnComplete = settings.onSpawnComplete;
        var offset = settings.offset || new Vector2(0, 0);
        var maxCanvasSize = settings.maxCanvasSize || new Vector2(1024, 1024);
        var mapSize = new Vector2(width * tileWidth, height * tileHeight);
        var currentSpriteLayer = -1;
        var layerSprites = new LayerSprites(maxCanvasSize, mapSize);
        var entities = [];
        var backgrounds = [];
        var entitiesSpawned = 0;
        var entitiesToSpawn = 0;
        var opacity = 1;
        var tiledReader = new TiledReader({
            tiled: json,
            onInit: onInit,
            onExternalTileset: function (source) {
                // unfortunately, external tileset paths are relative to the tile json path
                // making it difficult to load (would need to do path parsing etc...)
                // instead we try to make an educated guess what the asset name is
                var json;
                var jsonPath = source.indexOf('json/');
                var relativePath = source.indexOf('../');
                var path = source;
                var split;
                if (jsonPath >= 0) {
                    // if the name "json/" is there, we can guess the path is after the json/ part
                    path = source.substring(jsonPath + ('json/').length);
                } else if (relativePath >= 0) {
                    // no json/ is there and the path has relative indicators
                    path = source;

                    if (assetName) {
                        // path parsing, urgh
                        split = assetName.split('/');
                        split.pop(); // remove filename
                        while (path.indexOf('../') >= 0) {
                            if (split.length === 0) {
                                throw "ERROR: Impossible path to external tileset";
                            }
                            // move up one folder
                            split.pop();
                            path = path.replace('../', '');
                        }
                        // final path, may need an extra slash
                        path = split.join('/') + (split.length ? '/' : '') + path;
                    } else {
                        // more dangerous method: try removing all relative indicators
                        while (path.indexOf('../') >= 0) {
                            path = path.replace('../', '');
                        }
                    }
                }
                path = path.replace('.json', '');

                json = Bento.assets.getJson(path);

                return json;
            },
            onLayer: function (layer) {
                if (layer.type === "tilelayer") {
                    if (!mergeLayers) {
                        currentSpriteLayer += 1;
                    } else {
                        currentSpriteLayer = 0;
                    }
                }
                opacity = layer.opacity;
                if (onLayer) {
                    onLayer(layer);
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
                // there is a very high chance the url contains "images/" since the json files
                // should be stored in the "json/" folder and images in "images/"
                var imageUrl = tileSet.image;
                var assetName;
                var imageAsset;
                assetName = imageUrl.substring(imageUrl.indexOf('images/') + ('images/').length);
                assetName = assetName.replace('.png', '');
                imageAsset = Bento.assets.getImage(assetName);

                // draw on the layer
                // TODO: cache the drawn layers? Would load faster if a player returns to a screen, on the other hand it could lead to memory hogging
                layerSprites.drawTile(
                    currentSpriteLayer,
                    destination,
                    source,
                    imageAsset,
                    flipX,
                    flipY,
                    flipD,
                    opacity
                );

                if (onTile) {
                    onTile(tileX, tileY, tileSet, tileIndex, flipX, flipY, flipD);
                }
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
                var canvasLayers = layerSprites.layers;
                var layer;
                var l = canvasLayers.length;
                var i;
                var canvasSize = layerSprites.canvasSize;
                var spritesCountX = layerSprites.spritesCountX;
                var spritesCountY = layerSprites.spritesCountY;
                var makeEntity = function () {
                    var j = 0;
                    var canvas;
                    var sprite;
                    var entity;
                    var tiledLayer = json.layers[i];
                    for (j = 0; j < layer.length; ++j) {
                        canvas = layer[j];
                        sprite = new Sprite({
                            image: new PackedImage(canvas)
                        });
                        entity = new Entity({
                            z: 0,
                            name: tiledLayer.name || 'background',
                            family: ['backgrounds'],
                            position: new Vector2(
                                offset.x + canvasSize.x * (j % spritesCountX),
                                offset.y + canvasSize.y * Math.floor(j / spritesCountX)
                            ),
                            components: [sprite]
                        });
                        // spawn background entities now?
                        if (settings.spawnBackground) {
                            Bento.objects.attach(entity);
                        }
                        backgrounds.push(entity);
                    }
                };

                for (i = 0; i < l; ++i) {
                    layer = canvasLayers[i];
                    if (layer) {
                        makeEntity();
                    }
                }

                if (onComplete) {
                    onComplete();
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
                    tileSet: tileSet,
                    tileIndex: tileIndex,
                    tileProperties: properties,
                    object: object,
                    objectProperties: object.properties,
                    jsonName: assetName // reference to current json name
                }
            };
            entitiesToSpawn += 1;
            bento.require([moduleName], function (Instance) {
                var instance = new Instance(params),
                    origin = instance.origin,
                    dimension = instance.dimension;

                instance.position = new Vector2(
                    offset.x + x + origin.x,
                    offset.y + y + (origin.y - dimension.height)
                );

                // add to game
                Bento.objects.attach(instance);
                entities.push(instance);

                entitiesSpawned += 1;

                if (onSpawn) {
                    onSpawn(instance);
                }

                if (entitiesSpawned === entitiesToSpawn && onSpawnComplete) {
                    onSpawnComplete();
                }
            });
        };

        tiledReader.read();

        return {
            name: settings.name || 'tiled',
            /**
             * Name of the Tiled JSON asset
             * @instance
             * @name assetName
             */
            assetName: assetName,
            /**
             * Rectangle with width and height of the Tiled map in pixels
             * @instance
             * @name dimension
             */
            dimension: new Rectangle(0, 0, mapSize.x, mapSize.y),
            /**
             * Array of all entities spawned
             * @instance
             * @name entities
             */
            entities: entities,
            /**
             * Array of all background entities spawned
             * @instance
             * @name backgrounds
             */
            backgrounds: backgrounds,
            /**
             * Object containing all drawn layers
             * @instance
             * @name layerImages
             */
            layerImages: layerSprites
        };
    };

    return Tiled;
});