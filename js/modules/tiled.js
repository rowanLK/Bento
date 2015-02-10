/*
 * Reads tiled json files
 * @copyright (C) HeiGames
 */
define('bento/tiled', [
    'bento',
    'bento/entity',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/polygon',
    'bento/packedimage'
], function (Bento, Entity, Vector2, Rectangle, Polygon, PackedImage) {
    'use strict';
    return function (settings, onReady) {
        /*settings = {
            name: String, // name of JSON file
            background: Boolean // TODO false: splits tileLayer tile entities,
            spawn: Boolean // adds objects into game immediately
        }*/
        var json = Bento.assets.getJson(settings.name),
            i,
            j,
            k,
            width = json.width,
            height = json.height,
            layers = json.layers.length,
            tileWidth = json.tilewidth,
            tileHeight = json.tileheight,
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            image,
            layer,
            firstgid,
            object,
            points,
            objects = [],
            shapes = [],
            viewport = Bento.getViewport(),
            background = Entity().extend({
                z: 0,
                draw: function (gameData) {
                    var w = Math.max(Math.min(canvas.width - viewport.x, viewport.width), 0),
                        h = Math.max(Math.min(canvas.height - viewport.y, viewport.height), 0),
                        img = PackedImage(canvas);

                    if (w === 0 || h === 0) {
                        return;
                    }
                    // only draw the part in the viewport
                    gameData.renderer.drawImage(
                        img, ~~(Math.max(Math.min(viewport.x, canvas.width), 0)), ~~(Math.max(Math.min(viewport.y, canvas.height), 0)), ~~w, ~~h,
                        0,
                        0, ~~w, ~~h
                    );
                }
            }),
            getTileset = function (gid) {
                var l,
                    tileset,
                    current = null;
                // loop through tilesets and find the highest firstgid that's
                // still lower or equal to the gid
                for (l = 0; l < json.tilesets.length; ++l) {
                    tileset = json.tilesets[l];
                    if (tileset.firstgid <= gid) {
                        current = tileset;
                    }
                }
                return current;
            },
            getTile = function (tileset, gid) {
                var index,
                    tilesetWidth,
                    tilesetHeight;
                if (tileset === null) {
                    return null;
                }
                index = gid - tileset.firstgid;
                tilesetWidth = Math.floor(tileset.imagewidth / tileset.tilewidth);
                tilesetHeight = Math.floor(tileset.imageheight / tileset.tileheight);
                return {
                    // convention: the tileset name must be equal to the asset name!
                    subimage: Bento.assets.getImage(tileset.name),
                    x: (index % tilesetWidth) * tileset.tilewidth,
                    y: Math.floor(index / tilesetWidth) * tileset.tileheight,
                    width: tileset.tilewidth,
                    height: tileset.tileheight
                };
            },
            drawTileLayer = function (x, y) {
                var gid = layer.data[y * width + x],
                    // get correct tileset and image
                    tileset = getTileset(gid),
                    tile = getTile(tileset, gid);
                // draw background to offscreen canvas
                if (tile) {
                    context.drawImage(
                        tile.subimage.image,
                        tile.subimage.x + tile.x,
                        tile.subimage.y + tile.y,
                        tile.width,
                        tile.height,
                        x * tileWidth,
                        y * tileHeight,
                        tileWidth,
                        tileHeight
                    );
                }
            },
            spawn = function (name, obj, tilesetProperties) {
                var x = obj.x,
                    y = obj.y,
                    params = [],
                    getParams = function (properties) {
                        var prop;
                        for (prop in properties) {
                            if (!prop.match(/param\d+/)) {
                                continue;
                            }
                            if (isNaN(properties[prop])) {
                                params.push(properties[prop]);
                            } else {
                                params.push((+properties[prop]));
                            }
                        }
                    };

                // search params
                getParams(tilesetProperties);
                getParams(obj.properties);

                require([name], function (Instance) {
                    var instance = Instance.apply(this, params),
                        origin = instance.getOrigin(),
                        dimension = instance.getDimension(),
                        prop,
                        addProperties = function (properties) {
                            var prop;
                            for (prop in properties) {
                                if (prop === 'module' || prop.match(/param\d+/)) {
                                    continue;
                                }
                                if (properties.hasOwnProperty(prop)) {
                                    // number or string?
                                    if (isNaN(properties[prop])) {
                                        instance[prop] = properties[prop];
                                    } else {
                                        instance[prop] = (+properties[prop]);
                                    }
                                }
                            }
                        };

                    instance.setPosition({
                        // tiled assumes origin (0, 1)
                        x: x + (origin.x),
                        y: y + (origin.y - dimension.height)
                    });
                    // add in tileset properties
                    addProperties(tilesetProperties);
                    // add tile properties
                    addProperties(obj.properties);
                    // add to game
                    if (settings.spawn) {
                        Bento.objects.add(instance);
                    }
                    objects.push(instance);
                });
            },
            spawnObject = function (obj) {
                var gid = obj.gid,
                    // get tileset: should contain module name
                    tileset = getTileset(gid),
                    id = gid - tileset.firstgid,
                    properties,
                    moduleName;
                if (tileset.tileproperties) {
                    properties = tileset.tileproperties[id.toString()];
                    if (properties) {
                        moduleName = properties.module;
                    }
                }
                if (moduleName) {
                    spawn(moduleName, obj, properties);
                }
            },
            spawnShape = function (shape, type) {
                var obj;
                if (settings.spawn) {
                    obj = Entity({
                        z: 0,
                        name: type,
                        family: [type]
                    }).extend({
                        update: function () {},
                        draw: function () {}
                    });
                    obj.setBoundingBox(shape);
                    Bento.objects.add(obj);
                }
                shape.type = type;
                shapes.push(shape);
            };

        // setup canvas
        // to do: split up in multiple canvas elements due to max
        // size
        canvas.width = width * tileWidth;
        canvas.height = height * tileHeight;

        // loop through layers
        for (k = 0; k < layers; ++k) {
            layer = json.layers[k];
            if (layer.type === 'tilelayer') {
                // loop through tiles
                for (j = 0; j < layer.height; ++j) {
                    for (i = 0; i < layer.width; ++i) {
                        drawTileLayer(i, j);
                    }
                }
            } else if (layer.type === 'objectgroup') {
                for (i = 0; i < layer.objects.length; ++i) {
                    object = layer.objects[i];

                    // default type is solid
                    if (object.type === '') {
                        object.type = 'solid';
                    }

                    if (object.gid) {
                        // normal object
                        spawnObject(object);
                    } else if (object.polygon) {
                        // polygon 
                        points = [];
                        for (j = 0; j < object.polygon.length; ++j) {
                            points.push(object.polygon[j]);
                            points[j].x += object.x;
                            // shift polygons 1 pixel down?
                            // something might be wrong with polygon definition
                            points[j].y += object.y + 1;
                        }
                        spawnShape(Polygon(points), object.type);
                    } else {
                        // rectangle
                        spawnShape(Rectangle(object.x, object.y, object.width, object.height), object.type);
                    }
                }
            }
        }

        // add background to game
        if (settings.spawn) {
            Bento.objects.add(background);
        }

        return {
            tileLayer: background,
            objects: objects,
            shapes: shapes,
            dimension: Rectangle(0, 0, tileWidth * width, tileHeight * height)
        };
    };
});