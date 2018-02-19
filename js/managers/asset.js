/**
 * Manager that loads and controls assets. Can be accessed through Bento.assets namespace.
 * Assets MUST be loaded through assetGroups (for now). An assetgroup is a json file that indicates which
 * assets to load, and where to find them.
 * <br>Exports: Constructor, can be accessed through Bento.assets namespace
 * @module bento/managers/asset
 * @moduleName AssetManager
 * @returns AssetManager
 */
bento.define('bento/managers/asset', [
    'bento/packedimage',
    'bento/utils',
    'audia',
    'lzstring'
], function (
    PackedImage,
    Utils,
    Audia,
    LZString
) {
    'use strict';
    return function () {
        var assetGroups = {};
        var loadedGroups = {};
        var path = '';
        var assets = {
            audio: {},
            json: {},
            images: {},
            binary: {},
            fonts: {},
            spritesheets: {},
            texturePacker: {},

            // packed
            'packed-images': {},
            'packed-spritesheets': {},
            'packed-json': {}
        };
        /**
         * (Down)Load asset types
         */
        var loadAudio = function (name, source, callback) {
            var i;
            var failed = true;
            var loadAudioFile = function (index, src) {
                var audio = new Audia();
                var canPlay = audio.canPlayType('audio/' + source[index].slice(-3));
                if (!!canPlay || window.ejecta) {
                    // success!
                    if (!manager.skipAudioCallback) {
                        audio.onload = function () {
                            callback(null, name, audio);
                        };
                    } else {
                        // callback immediately
                        window.setTimeout(function () {
                            callback(null, name, audio);
                        }, 0);
                    }
                    audio.src = src;
                    failed = false;
                    return true;
                }
                return false;
            };
            if (!Utils.isArray(source)) {
                // source = [path + 'audio/' + source];
                source = [source];
            }
            // try every type
            for (i = 0; i < source.length; ++i) {
                if (loadAudioFile(i, path + 'audio/' + source[i])) {
                    break;
                }
            }
            if (failed) {
                callback('This audio type is not supported:', name, source);
            }
        };
        var loadJSON = function (name, source, callback, isCompressed) {
            var xhr = new window.XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType('application/json');
            }

            xhr.open('GET', source, true);
            xhr.onerror = function () {
                callback('Error: loading JSON ' + source);
            };
            xhr.ontimeout = function () {
                callback('Timeout: loading JSON ' + source);
            };
            xhr.onreadystatechange = function () {
                var jsonData;
                var response;
                if (xhr.readyState === 4) {
                    if ((xhr.status === 304) || (xhr.status === 200) || ((xhr.status === 0) && xhr.responseText)) {
                        try {
                            response = xhr.responseText;
                            // read header
                            if (response[0] === 'L' && response[1] === 'Z' && response[2] === 'S') {
                                isCompressed = true;
                                // trim header
                                response = response.substring(3);
                            }

                            if (isCompressed) {
                                // decompress if needed
                                jsonData = JSON.parse(LZString.decompressFromBase64(response));
                            } else {
                                jsonData = JSON.parse(response);
                            }
                        } catch (e) {
                            console.log('WARNING: Could not parse JSON ' + name + ' at ' + source + ': ' + e);
                            console.log('Trying to parse', response);
                            jsonData = xhr.responseText;
                        }
                        callback(null, name, jsonData);
                    } else {
                        callback('Error: State ' + xhr.readyState + ' ' + source);
                    }
                }
            };
            xhr.send(null);
        };
        var loadJsonCompressed = function (name, source, callback) {
            return loadJSON(name, source, callback, true);
        };
        var loadBinary = function (name, source, success, failure) {
            var xhr = new window.XMLHttpRequest();
            var arrayBuffer;
            var byteArray;
            var buffer;
            var i = 0;

            xhr.open('GET', source, true);
            xhr.onerror = function () {
                failure('ERROR: loading binary ' + source);
            };
            xhr.responseType = 'arraybuffer';
            xhr.onload = function (e) {
                var binary;
                arrayBuffer = xhr.response;
                if (arrayBuffer) {
                    byteArray = new Uint8Array(arrayBuffer);
                    buffer = [];
                    for (i; i < byteArray.byteLength; ++i) {
                        buffer[i] = String.fromCharCode(byteArray[i]);
                    }
                    // loadedAssets.binary[name] = buffer.join('');
                    binary = buffer.join('');
                    success(null, name, binary);
                }
            };
            xhr.send();
        };
        var loadImage = function (name, source, callback) {
            var img = new Image();

            // cocoon lazy load, might be useful some day?
            // img.cocoonLazyLoad = true;

            img.src = source;
            img.addEventListener('load', function () {
                callback(null, name, img);
            }, false);
            img.addEventListener('error', function (evt) {
                // TODO: Implement failure: should it retry to load the image?
                Utils.log('ERROR: loading image ' + source);
            }, false);
        };
        var loadTTF = function (name, source, callback) {
            // for every font to load we measure the width on a canvas
            var splitName = name;
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            var width = 0;
            var oldWidth;
            var intervalId;
            var checkCount = 0;
            var measure = function () {
                width = context.measureText('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.,').width;
                return width;
            };
            var loadFont = function () {
                // append a style element with the font face
                // this method works with Canvas+
                var style = document.createElement('style');
                style.setAttribute("type", "text/css");
                style.innerHTML = "@font-face { font-family: '" + name +
                    "'; src: url('" + source + "');}";

                document.body.appendChild(style);

                // try setting it
                context.font = "normal 16px " + name;
            };
            // detect a loaded font by checking if the width changed
            var isLoaded = function () {
                return oldWidth !== measure();
            };

            // unlike other assets, the font name is not allowed to have slashes!
            if (name.indexOf("/") >= 0) {
                splitName = name.split("/");
                // swap name with last word
                name = splitName[splitName.length - 1];
            }

            loadFont();

            // measure for the first time
            oldWidth = measure();

            // check every 100ms
            intervalId = window.setInterval(function () {
                if (isLoaded()) {
                    // done!
                    window.clearInterval(intervalId);
                    if (callback) {
                        callback(null, name, name);
                    }
                } else if (checkCount >= 10) {
                    // give up after 1000ms
                    // possible scenarios:
                    // * a mistake was made, for example a typo in the path, and the font was never loaded
                    // * the font was already loaded (can happen in reloading in Cocoon devapp)
                    // either way we continue as if nothing happened, not loading the font shouldn't crash the game
                    window.clearInterval(intervalId);
                    console.log('Warning: font "' + name + '" timed out with loading.');
                    if (callback) {
                        callback(null, name, name);
                    }
                }
                checkCount += 1;
            }, 100);
        };
        var loadSpriteSheet = function (name, source, callback) {
            var spriteSheet = {
                image: null,
                animation: null
            };

            var checkForCompletion = function () {
                if (spriteSheet.image !== null && spriteSheet.animation !== null) {
                    callback(null, name, spriteSheet);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.animation = json;
                checkForCompletion();
            });

            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.image = PackedImage(img);
                checkForCompletion();
            });
        };
        var loadPackedImage = function (name, source, callback) {
            // very similar to spritesheet: load an image and load a json
            var packedImage = {
                image: null,
                data: null
            };
            var checkForCompletion = function () {
                if (packedImage.image !== null && packedImage.data !== null) {
                    callback(null, name, packedImage);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                packedImage.data = json;
                checkForCompletion();
            });
            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                packedImage.image = img;
                checkForCompletion();
            });
        };
        var loadSpriteSheetPack = function (name, source, callback) {
            var spriteSheet = {
                image: null,
                data: null
            };

            var checkForCompletion = function () {
                if (spriteSheet.image !== null && spriteSheet.data !== null) {
                    callback(null, name, spriteSheet);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.data = json;
                checkForCompletion();
            });

            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.image = img;
                checkForCompletion();
            });
        };
        /**
         * Loads asset groups (json files containing names and asset paths to load)
         * If the assetGroup parameter is passed to Bento.setup, this function will be
         * called automatically by Bento.
         * This will not load the assets (merely the assetgroups). To load the assets,
         * you must call Bento.assets.load()
         * @function
         * @instance
         * @param {Object} jsonFiles - Name with json path
         * @param {Function} onReady - Callback when ready
         * @param {Function} onLoaded - Callback when json file is loaded
         * @name loadAssetGroups
         */
        var loadAssetGroups = function (jsonFiles, onReady, onLoaded) {
            var jsonName;
            var keyCount = Utils.getKeyLength(jsonFiles);
            var loaded = 0;
            var callback = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assetGroups[name] = json;
                loaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(loaded, keyCount, name, 'json');
                }
                if (keyCount === loaded && Utils.isDefined(onReady)) {
                    onReady(null, 'assetGroup');
                }
            };
            for (jsonName in jsonFiles) {
                if (jsonFiles.hasOwnProperty(jsonName)) {
                    loadJSON(jsonName, jsonFiles[jsonName], callback);
                }
            }
        };
        /**
         * Loads assets from asset group.
         * @function
         * @instance
         * @param {String} groupName - Name of asset group
         * @param {Function} onReady - Callback when ready
         * @param {Function} onLoaded - Callback when asset file is loaded
         * @param {Bool} skipPackedImages - do not initialize texture packed images
         * @name load
         */
        var load = function (groupName, onReady, onLoaded) {
            var group = assetGroups[groupName];
            var asset;
            var assetsLoaded = 0;
            var assetCount = 0;
            var toLoad = [];
            // assets to unpack
            var toUnpack = {
                'packed-images': {},
                'packed-spritesheets': {},
                'packed-json': {}
            };
            var packs = [];
            var postLoad = function () {
                var initPackedImagesLegacy = function () {
                    // old way of packed images
                    var frame, pack, i, image, json, name;
                    while (packs.length) {
                        pack = packs.pop();
                        image = getImageElement(pack);
                        json = getJson(pack);

                        if (!image || !json) {
                            // TODO: should have a cleaner method to check if packs are not loaded yet
                            // return the pack until the image/json is loaded
                            packs.push(pack);
                            return;
                        }

                        // parse json
                        for (i = 0; i < json.frames.length; ++i) {
                            name = json.frames[i].filename;
                            name = name.substring(0, name.length - 4);
                            frame = json.frames[i].frame;
                            assets.texturePacker[name] = new PackedImage(image, frame);
                        }
                    }
                };
                var initPackedImages = function () {
                    // expand into images
                    var packedImages = toUnpack['packed-images'];
                    Utils.forEach(packedImages, function (packData, name) {
                        var image = packData.image;
                        var data = packData.data;
                        Utils.forEach(data, function (textureData, i) {
                            // turn into image data
                            var assetName = textureData.assetName;
                            var frame = {
                                x: textureData.x,
                                y: textureData.y,
                                w: textureData.width,
                                h: textureData.height,
                            };
                            assets.texturePacker[assetName] = new PackedImage(image, frame);
                        });
                    });
                };
                var unpackJson = function () {
                    // unpack json into multiple jsons
                    var key;
                    var packedJson = toUnpack['packed-json'];
                    Utils.forEach(packedJson, function (group) {
                        Utils.forEach(group, function (json, key, l, breakLoop) {
                            assets.json[key] = json;
                        });
                    });
                };
                var unpackSpriteSheets = function () {
                    // expand into images
                    var packedImages = toUnpack['packed-spritesheets'];
                    Utils.forEach(packedImages, function (packData, name) {
                        var image = packData.image;
                        var data = packData.data;
                        Utils.forEach(data, function (textureData, i) {
                            // turn into image data
                            var assetName = textureData.assetName;
                            var frame = {
                                x: textureData.x,
                                y: textureData.y,
                                w: textureData.width,
                                h: textureData.height,
                            };
                            var spriteSheet = {
                                image: new PackedImage(image, frame),
                                animation: textureData.spriteSheet
                            };
                            assets.spritesheets[assetName] = spriteSheet;
                        });
                    });
                };
                // after everything has loaded, do some post processing
                initPackedImagesLegacy();
                initPackedImages();
                unpackJson();
                unpackSpriteSheets();
                // mark as loaded
                loadedGroups[groupName] = true;
                // callback
                if (Utils.isDefined(onReady)) {
                    onReady(null, groupName);
                }
            };
            var checkLoaded = function () {
                if (assetCount === 0 || (assetCount > 0 && assetsLoaded === assetCount)) {
                    postLoad();
                }
            };
            var onLoadImage = function (err, name, image) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.images[name] = image;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'image');
                }
                checkLoaded();
            };
            // DEPRECATED
            var onLoadPack = function (err, name, json) {
                // TODO: fix texturepacker loading
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.json[name] = json;
                packs.push(name);
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'pack');
                }
                checkLoaded();
            };
            var onLoadJson = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.json[name] = json;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'json');
                }
                checkLoaded();
            };
            var onLoadTTF = function (err, name, ttf) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.fonts[name] = ttf;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'ttf');
                }
                checkLoaded();
            };
            var onLoadAudio = function (err, name, audio) {
                if (err) {
                    Utils.log(err);
                } else {
                    assets.audio[name] = audio;
                }
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'audio');
                }
                checkLoaded();
            };
            var onLoadSpriteSheet = function (err, name, spriteSheet) {
                if (err) {
                    Utils.log(err);
                } else {
                    assets.spritesheets[name] = spriteSheet;
                }
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'spriteSheet');
                }
                checkLoaded();
            };
            // packs
            var onLoadImagePack = function (err, name, imagePack) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets['packed-images'][name] = imagePack;
                toUnpack['packed-images'][name] = imagePack;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'imagePack');
                }
                checkLoaded();
            };
            var onLoadJsonPack = function (err, name, json) {
                if (err) {
                    console.log(err);
                    return;
                }
                assets['packed-json'][name] = json;
                toUnpack['packed-json'][name] = json;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'jsonPack');
                }
                checkLoaded();
            };
            var onLoadSpriteSheetPack = function (err, name, spriteSheetPack) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets['packed-spritesheets'][name] = spriteSheetPack;
                toUnpack['packed-spritesheets'][name] = spriteSheetPack;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'spriteSheetPack');
                }
                checkLoaded();
            };

            var readyForLoading = function (fn, asset, path, callback) {
                toLoad.push({
                    fn: fn,
                    asset: asset,
                    path: path,
                    callback: callback
                });
            };
            var loadAllAssets = function () {
                var i = 0;
                var data;
                for (i = 0; i < toLoad.length; ++i) {
                    data = toLoad[i];
                    data.fn(data.asset, data.path, data.callback);
                }
                checkLoaded();
            };

            if (!Utils.isDefined(group)) {
                onReady('Could not find asset group ' + groupName);
                return;
            }
            // set path
            if (Utils.isDefined(group.path)) {
                path = group.path;
            }
            // count the number of assets first
            // get images
            if (Utils.isDefined(group.images)) {
                assetCount += Utils.getKeyLength(group.images);
                for (asset in group.images) {
                    if (!group.images.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadImage, asset, path + 'images/' + group.images[asset], onLoadImage);
                }
            }
            // get packed images
            if (Utils.isDefined(group.texturePacker)) {
                assetCount += Utils.getKeyLength(group.texturePacker);
                for (asset in group.texturePacker) {
                    if (!group.texturePacker.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadJSON, asset, path + 'json/' + group.texturePacker[asset], onLoadPack);
                }
            }
            // get audio
            if (Utils.isDefined(group.audio)) {
                assetCount += Utils.getKeyLength(group.audio);
                for (asset in group.audio) {
                    if (!group.audio.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadAudio, asset, group.audio[asset], onLoadAudio);
                }
            }
            // get json
            if (Utils.isDefined(group.json)) {
                assetCount += Utils.getKeyLength(group.json);
                for (asset in group.json) {
                    if (!group.json.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadJSON, asset, path + 'json/' + group.json[asset], onLoadJson);
                }
            }
            // get fonts
            if (Utils.isDefined(group.fonts)) {
                assetCount += Utils.getKeyLength(group.fonts);
                for (asset in group.fonts) {
                    if (!group.fonts.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadTTF, asset, path + 'fonts/' + group.fonts[asset], onLoadTTF);
                }
            }
            // get spritesheets
            if (Utils.isDefined(group.spritesheets)) {
                assetCount += Utils.getKeyLength(group.spritesheets);
                for (asset in group.spritesheets) {
                    if (!group.spritesheets.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadSpriteSheet, asset, path + 'spritesheets/' + group.spritesheets[asset], onLoadSpriteSheet);
                }
            }

            // packed assets
            if (Utils.isDefined(group['packed-images'])) {
                assetCount += Utils.getKeyLength(group['packed-images']);
                Utils.forEach(group['packed-images'], function (assetPath, assetName) {
                    readyForLoading(loadPackedImage, assetName, path + 'packed-images/' + assetPath, onLoadImagePack);
                });
            }
            // get (compressed) packed json
            if (Utils.isDefined(group['packed-json'])) {
                assetCount += Utils.getKeyLength(group['packed-json']);
                Utils.forEach(group['packed-json'], function (assetPath, assetName) {
                    readyForLoading(loadJSON, assetName, path + 'packed-json/' + assetPath, onLoadJsonPack);
                });
            }
            // get packed spritesheet
            if (Utils.isDefined(group['packed-spritesheets'])) {
                assetCount += Utils.getKeyLength(group['packed-spritesheets']);
                Utils.forEach(group['packed-spritesheets'], function (assetPath, assetName) {
                    readyForLoading(loadSpriteSheetPack, assetName, path + 'packed-spritesheets/' + assetPath, onLoadSpriteSheetPack);
                });
            }

            // load all assets
            loadAllAssets();

            return assetCount;
        };
        /**
         * Loads image from URL. The resulting asset can be accessed through Bento.assets.getImage().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadImageFromUrl
         */
        var loadImageFromUrl = function (name, url, callback) {
            var onLoadImage = function (err, name, image) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.images[name] = image;
                if (callback) {
                    callback(null, image);
                }
            };
            loadImage(name, url, onLoadImage);
        };
        /**
         * Loads JSON from URL. The resulting asset can be accessed through Bento.assets.getJson().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadJsonFromUrl
         */
        var loadJsonFromUrl = function (name, url, callback) {
            var onLoadJson = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.json[name] = json;
                if (callback) {
                    callback(null, json);
                }
            };
            loadJSON(name, url, onLoadJson);
        };
        /**
         * Loads audio from URL. The resulting asset can be accessed through Bento.assets.getAudio().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadAudioFromUrl
         */
        var loadAudioFromUrl = function (name, url, callback) {
            var onLoadAudio = function (err, name, audio) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.audio[name] = audio;
                if (callback) {
                    callback(audio);
                }
            };
            loadAudio(name, url, onLoadAudio);
        };
        /**
         * Unloads assets
         * @function
         * @instance
         * @param {String} groupName - Name of asset group
         * @param {Boolean} dispose - Should use Canvas+ dispose
         * @name unload
         */
        var unload = function (groupName, dispose) {
            // find all assets in this group
            var assetGroup = assetGroups[groupName];

            if (!assetGroup) {
                Utils.log('ERROR: asset group ' + groupName + ' does not exist');
                return;
            }
            Utils.forEach(assetGroup, function (group, type) {
                if (typeof group !== "object") {
                    return;
                }
                Utils.forEach(group, function (assetPath, name) {
                    // NOTE: from this point on there are a lot of manual checks etc.
                    // would be nicer to make unify the logic...

                    // find the corresponding asset from the assets object
                    var assetTypeGroup = assets[type] || {};
                    var asset = assetTypeGroup[name];
                    var removePackedImage = function (packedImages) {
                        // find what it unpacked to
                        var image = packedImages.image;
                        var data = packedImages.data;
                        Utils.forEach(data, function (textureData, i) {
                            // find out the asset name
                            var assetName = textureData.assetName;
                            var textureAsset = assets.texturePacker[assetName];
                            // delete if this asset still exists
                            if (textureAsset) {
                                delete assets.texturePacker[assetName];
                            }
                        });
                        // dispose if possible
                        if (dispose && image.dispose) {
                            image.dispose();
                        }
                        if (dispose && image.image && image.image.dispose) {
                            image.image.dispose();
                        }
                    };
                    var removePackedSpriteSheet = function (packedSpriteSheets) {
                        // find what it unpacked to
                        var image = packedSpriteSheets.image;
                        var data = packedSpriteSheets.data;
                        Utils.forEach(data, function (textureData, i) {
                            // find out the asset name
                            var assetName = textureData.assetName;
                            var spriteSheet = assets.spritesheets[assetName];
                            // delete if this asset still exists
                            if (spriteSheet) {
                                delete assets.spritesheets[assetName];
                            }
                        });
                        // dispose if possible
                        if (dispose && image.dispose) {
                            image.dispose();
                        }
                        if (dispose && image.image && image.image.dispose) {
                            image.image.dispose();
                        }
                    };
                    var removePackedJson = function (packedJson) {
                        // find what it unpacked to
                        Utils.forEach(packedJson, function (json, key, l, breakLoop) {
                            delete assets.json[key];
                        });
                    };

                    if (asset) {
                        // remove reference to it
                        assetTypeGroup[name] = undefined;
                        // delete could be bad for performance(?)
                        delete assetTypeGroup[name];

                        if (type === 'images') {
                            // also remove corresponding texturepacker
                            if (assets.texturePacker[name]) {
                                assets.texturePacker[name] = undefined;
                                delete assets.texturePacker[name];
                            }
                        } else if (type === 'packed-images') {
                            removePackedImage(asset);
                        } else if (type === 'packed-spritesheets') {
                            removePackedSpriteSheet(asset);
                        } else if (type === 'packed-json') {
                            removePackedJson(asset);
                        }

                        // Canvas+ only: dispose if possible
                        // https://blog.ludei.com/techniques-to-optimize-memory-use-in-ludeis-canvas-environment/
                        if (dispose) {
                            // image
                            if (asset.dispose) {
                                asset.dispose();
                            }
                            // spritesheet
                            else if (asset.image && asset.image.dispose) {
                                asset.image.dispose();
                            } else if (asset.image && asset.image.image && asset.image.image.dispose) {
                                asset.image.image.dispose();
                            }
                            // audia
                            else if (asset._audioNode && asset._audioNode.dispose) {
                                asset._audioNode.dispose();
                            }
                        }
                    }
                });
            });
            // mark as unloaded
            loadedGroups[groupName] = false;
        };
        /**
         * Returns a previously loaded image
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {PackedImage} Image
         * @name getImage
         */
        var getImage = function (name) {
            // NOTE: getImage always returns a PackedImage
            // if the loaded image has not been initialized as PackedImage yet,
            // getImage will do that now and caches the PackedImage in assets.texturePacker
            var image, packedImage = assets.texturePacker[name];
            if (!packedImage) {
                image = getImageElement(name);
                if (!image) {
                    Utils.log("ERROR: Image " + name + " could not be found");
                    return null;
                }
                packedImage = PackedImage(image);
                assets.texturePacker[name] = packedImage;
            }
            return packedImage;
        };
        /**
         * Returns a previously loaded image element
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {HTMLImage} Html Image element
         * @name getImageElement
         */
        var getImageElement = function (name) {
            var asset = assets.images[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: ImageElement " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded json object
         * @function
         * @instance
         * @param {String} name - Name of json file
         * @returns {Object} Json object
         * @name getJson
         */
        var getJson = function (name) {
            var asset = assets.json[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: JSON " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded audio element (currently by howler)
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {Audia} Audia object
         * @name getAudio
         */
        var getAudio = function (name) {
            var asset = assets.audio[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: Audio " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded spriteSheet element
         * @function
         * @instance
         * @param {String} name - Name of spriteSheet
         * @returns {Object} spriteSheet object
         * @name getSpriteSheet
         */
        var getSpriteSheet = function (name) {
            var asset = assets.spritesheets[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: Sprite sheet " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns all assets
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {Object} assets - Object with reference to all loaded assets
         * @name getAssets
         */
        var getAssets = function () {
            return assets;
        };
        /**
         * Returns asset group
         * @function
         * @instance
         * @returns {Object} assetGroups - reference to loaded JSON file
         * @name getAssetGroups
         */
        var getAssetGroups = function () {
            return assetGroups;
        };
        /**
         * Reloads all previously loaded assets
         * @function
         * @instance
         * @param {Function} callback - called when all assets are loaded
         * @name reload
         */
        var reload = function (callback) {
            var group;
            var loaded = 0;
            var groupsToLoad = [];
            var loadGroups = function () {
                var i;
                for (i = 0; i < groupsToLoad.length; ++i) {
                    load(groupsToLoad[i], end, function (current, total, name) {});
                }
            };
            var end = function () {
                loaded += 1;

                if (loaded === groupsToLoad.length && callback) {
                    callback();
                }
            };
            // collect groups
            for (group in assetGroups) {
                if (!assetGroups.hasOwnProperty(group)) {
                    continue;
                }
                if (!loadedGroups[group]) {
                    // havent loaded this group yet
                    continue;
                }
                groupsToLoad.push(group);
            }

            // load them
            loadGroups();
        };
        /**
         * Attempts to load ./assets.json and interpret it as assetgroups
         * @function
         * @instance
         * @param {Function} onRead - Called with an error string or null if successful
         * @name loadAssetsJson
         */
        var loadAssetsJson = function (onReady) {
            if(!Utils.isDuktape()) {
                loadJSON('assets.json', 'assets.json', function (error, name, assetsJson) {
                    var isLoading = false;
                    var groupsToLoad = {};
                    if (error) {
                        onReady(error);
                        return;
                    }
                    // check the contents of json
                    Utils.forEach(assetsJson, function (group, groupName, l, breakLoop) {
                        if (Utils.isString(group)) {
                            // assume assets.json consists of strings to load json files with
                            isLoading = true;
                            groupsToLoad[groupName] = group;
                        } else {
                            // the asset group is present
                            assetGroups[groupName] = group;
                        }
                    });

                    if (isLoading) {
                        // load jsons
                        loadAssetGroups(groupsToLoad, onReady);
                    } else {
                        // done
                        onReady(null, 'assetsJson');
                    }
                });
            } else {
                // Todo: add logic for switch
                // sfml automatically loads the assets in directly from the folder
            }
        };
        /**
         * Loads all assets
         * @function
         * @instance
         * @param {Object} settings
         * @param {Array} settings.exceptions - array of strings, which asset groups not to load
         * @param {Function} settings.onComplete - called when all assets are loaded
         * @param {Function} settings.onLoad - called on every asset loaded
         * @name reload
         */
        var loadAllAssets = function (settings) {
            var exceptions = settings.exceptions || [];
            var onReady = settings.onReady || settings.onComplete || function (err, name) {};
            var onLoaded = settings.onLoaded || settings.onLoad || function (count, total, name, type) {};
            var group;
            var groupName;
            var groupCount = 0;
            var assetCount = 0;
            var groupsLoaded = 0;
            var current = 0;
            // check if all groups loaded
            var end = function (err) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                groupsLoaded += 1;
                if (groupsLoaded === groupCount && onReady) {
                    onReady(null);
                }
            };
            // called on every asset
            var loadAsset = function (c, a, name, type) {
                current += 1;
                if (onLoaded) {
                    onLoaded(current, assetCount, name, type);
                }
            };

            // check every assetgroup and load its assets
            for (groupName in assetGroups) {
                if (!assetGroups.hasOwnProperty(groupName)) {
                    continue;
                }
                if (exceptions.indexOf(groupName) >= 0) {
                    continue;
                }
                group = assetGroups[groupName];
                assetCount += load(groupName, end, loadAsset);
                groupCount += 1;
            }

            // nothing to load
            if (groupCount === 0 && onReady) {
                onReady();
            }
        };
        var manager = {
            skipAudioCallback: false,
            reload: reload,
            loadAllAssets: loadAllAssets,
            loadAssetGroups: loadAssetGroups,
            loadAssetsJson: loadAssetsJson,
            load: load,
            loadJson: loadJSON,
            loadImageFromUrl: loadImageFromUrl,
            loadJsonFromUrl: loadJsonFromUrl,
            loadAudioFromUrl: loadAudioFromUrl,
            unload: unload,
            getImage: getImage,
            getImageElement: getImageElement,
            getJson: getJson,
            getAudio: getAudio,
            getSpriteSheet: getSpriteSheet,
            getAssets: getAssets,
            getAssetGroups: getAssetGroups
        };
        return manager;
    };
});