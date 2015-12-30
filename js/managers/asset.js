/**
 * Manager that loads and controls assets. Can be accessed through Bento.assets namespace.
 * Assets MUST be loaded through assetGroups (for now). An assetgroup is a json file that indicates which
 * assets to load, and where to find them.
 * <br>Exports: Constructor, can be accessed through Bento.asset namespace
 * @module bento/managers/asset
 * @returns AssetManager
 */
bento.define('bento/managers/asset', [
    'bento/packedimage',
    'bento/utils',
    'audia'
], function (PackedImage, Utils, Audia) {
    'use strict';
    return function () {
        var assetGroups = {},
            path = '',
            assets = {
                audio: {},
                json: {},
                images: {},
                binary: {}
            },
            texturePacker = {},
            packs = [],
            loadAudio = function (name, source, callback) {
                var i,
                    failed = true,
                    loadAudio = function (index) {
                        var audio = new Audia(),
                            canPlay = audio.canPlayType('audio/' + source[index].slice(-3));
                        if (!!canPlay || window.ejecta) {
                            // success!
                            audio.onload = function () {
                                callback(null, name, audio);
                            };
                            audio.src = source[index];
                            failed = false;
                            return true;
                        }
                        return false;
                    };
                if (!Utils.isArray(source)) {
                    source = [path + 'audio/' + source];
                } else {
                    // prepend asset paths
                    for (i = 0; i < source.length; i += 1) {
                        source[i] = path + 'audio/' + source[i];
                    }
                }
                // try every type
                for (i = 0; i < source.length; ++i) {
                    if (loadAudio(i)) {
                        break;
                    }
                }
                if (failed) {
                    callback('This audio type is not supported:', name, source);
                }
            },
            loadJSON = function (name, source, callback) {
                var xhr = new XMLHttpRequest();
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType('application/json');
                }
                xhr.open('GET', source, true);
                xhr.onerror = function () {
                    callback('Error ' + source);
                };
                xhr.ontimeout = function () {
                    callback('Timeout' + source);
                };
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if ((xhr.status === 304) || (xhr.status === 200) || ((xhr.status === 0) && xhr.responseText)) {
                            callback(null, name, JSON.parse(xhr.responseText));
                        } else {
                            callback('Error: State ' + xhr.readyState + ' ' + source);
                        }
                    }
                };
                xhr.send(null);
            },
            loadBinary = function (name, source, success, failure) {
                var xhr = new XMLHttpRequest(),
                    arrayBuffer,
                    byteArray,
                    buffer,
                    i = 0;

                xhr.open('GET', source, true);
                xhr.onerror = function () {
                    callback('Error ' + name);
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
                        callback(null, name, binary);
                    }
                };
                xhr.send();
            },
            loadImage = function (name, source, callback) {
                var img = new Image();
                img.src = source;
                img.addEventListener('load', function () {
                    callback(null, name, img);
                }, false);
                img.addEventListener('error', function (evt) {
                    // TODO: Implement failure: should it retry to load the image?
                    console.log('ERROR: loading image failed');
                }, false);
            },
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
            loadAssetGroups = function (jsonFiles, onReady, onLoaded) {
                var jsonName,
                    keyCount = Utils.getKeyLength(jsonFiles),
                    loaded = 0,
                    callback = function (err, name, json) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        assetGroups[name] = json;
                        loaded += 1;
                        if (Utils.isDefined(onLoaded)) {
                            onLoaded(loaded, keyCount);
                        }
                        if (keyCount === loaded && Utils.isDefined(onReady)) {
                            onReady(null);
                        }
                    };
                for (jsonName in jsonFiles) {
                    if (jsonFiles.hasOwnProperty(jsonName)) {
                        loadJSON(jsonName, jsonFiles[jsonName], callback);
                    }
                }
            },
            /**
             * Loads assets from asset group.
             * @function
             * @instance
             * @param {String} groupName - Name of asset group
             * @param {Function} onReady - Callback when ready
             * @param {Function} onLoaded - Callback when asset file is loaded
             * @name load
             */
            load = function (groupName, onReady, onLoaded) {
                var group = assetGroups[groupName],
                    asset,
                    assetsLoaded = 0,
                    assetCount = 0,
                    toLoad = [],
                    checkLoaded = function () {
                        if (assetsLoaded === assetCount && Utils.isDefined(onReady)) {
                            initPackedImages();
                            onReady(null);
                        }
                    },
                    onLoadImage = function (err, name, image) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        assets.images[name] = image;
                        assetsLoaded += 1;
                        if (Utils.isDefined(onLoaded)) {
                            onLoaded(assetsLoaded, assetCount);
                        }
                        checkLoaded();
                    },
                    onLoadPack = function (err, name, json) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        assets.json[name] = json;
                        packs.push(name);
                        assetsLoaded += 1;
                        if (Utils.isDefined(onLoaded)) {
                            onLoaded(assetsLoaded, assetCount);
                        }
                        checkLoaded();
                    },
                    onLoadJson = function (err, name, json) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        assets.json[name] = json;
                        assetsLoaded += 1;
                        if (Utils.isDefined(onLoaded)) {
                            onLoaded(assetsLoaded, assetCount);
                        }
                        checkLoaded();
                    },
                    onLoadAudio = function (err, name, audio) {
                        if (err) {
                            console.log(err);
                        } else {
                            assets.audio[name] = audio;
                        }
                        assetsLoaded += 1;
                        if (Utils.isDefined(onLoaded)) {
                            onLoaded(assetsLoaded, assetCount);
                        }
                        checkLoaded();
                    },
                    readyForLoading = function (fn, asset, path, callback) {
                        toLoad.push({
                            fn: fn,
                            asset: asset,
                            path: path,
                            callback: callback
                        });
                    },
                    loadAllAssets = function () {
                        var i = 0,
                            data;
                        for (i = 0; i < toLoad.length; ++i) {
                            data = toLoad[i];
                            data.fn(data.asset, data.path, data.callback);
                        }
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
                // load all assets
                loadAllAssets();
            },
            /**
             * Loads image from URL. The resulting asset can be accessed through Bento.assets.getImage().
             * @function
             * @instance
             * @param {String} name - Name of asset
             * @param {String} url - Url path (relative to your index.html)
             * @param {Function} callback - Callback function
             * @name loadImageFromUrl
             */
            loadImageFromUrl = function (name, url, callback) {
                var onLoadImage = function (err, name, image) {
                    if (err) {
                        console.log(err);
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
            },
            /**
             * Loads JSON from URL. The resulting asset can be accessed through Bento.assets.getJson().
             * @function
             * @instance
             * @param {String} name - Name of asset
             * @param {String} url - Url path (relative to your index.html)
             * @param {Function} callback - Callback function
             * @name loadJsonFromUrl
             */
            loadJsonFromUrl = function (name, url, callback) {
                var onLoadJson = function (err, name, json) {
                    if (err) {
                        console.log(err);
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
            },
            /**
             * Loads audio from URL. The resulting asset can be accessed through Bento.assets.getAudio().
             * @function
             * @instance
             * @param {String} name - Name of asset
             * @param {String} url - Url path (relative to your index.html)
             * @param {Function} callback - Callback function
             * @name loadAudioFromUrl
             */
            loadAudioFromUrl = function (name, url, callback) {
                var onLoadAudio = function (err, name, audio) {
                    if (err) {
                        console.log(err);
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
            },
            /**
             * Unloads assets (not implemented yet)
             * @function
             * @instance
             * @param {String} groupName - Name of asset group
             * @name unload
             */
            unload = function (groupName) {},
            /**
             * Returns a previously loaded image
             * @function
             * @instance
             * @param {String} name - Name of image
             * @returns {PackedImage} Image
             * @name getImage
             */
            getImage = function (name) {
                var image, packedImage = texturePacker[name];
                if (!packedImage) {
                    image = getImageElement(name);
                    if (!image) {
                        throw 'Can not find ' + name;
                    }
                    packedImage = PackedImage(image);
                    texturePacker[name] = packedImage;
                }
                return packedImage;
            },
            /**
             * Returns a previously loaded image element
             * @function
             * @instance
             * @param {String} name - Name of image
             * @returns {HTMLImage} Html Image element
             * @name getImageElement
             */
            getImageElement = function (name) {
                var asset = assets.images[name];
                if (!Utils.isDefined(asset)) {
                    throw ('Asset ' + name + ' could not be found');
                }
                return asset;
            },
            /**
             * Returns a previously loaded json object
             * @function
             * @instance
             * @param {String} name - Name of image
             * @returns {Object} Json object
             * @name getJson
             */
            getJson = function (name) {
                var asset = assets.json[name];
                if (!Utils.isDefined(asset)) {
                    throw ('Asset ' + name + ' could not be found');
                }
                return asset;
            },
            /**
             * Returns a previously loaded audio element (currently by howler)
             * @function
             * @instance
             * @param {String} name - Name of image
             * @returns {Audia} Audia object
             * @name getAudio
             */
            getAudio = function (name) {
                var asset = assets.audio[name];
                if (!Utils.isDefined(asset)) {
                    throw ('Asset ' + name + ' could not be found');
                }
                return asset;
            },
            /**
             * Returns all assets
             * @function
             * @instance
             * @param {String} name - Name of image
             * @returns {Object} assets - Object with reference to all loaded assets
             * @name getAssets
             */
            getAssets = function () {
                return assets;
            },
            initPackedImages = function () {
                var frame, pack, i, image, json, name;
                while (packs.length) {
                    pack = packs.pop();
                    image = getImageElement(pack);
                    json = getJson(pack);

                    // parse json
                    for (i = 0; i < json.frames.length; ++i) {
                        name = json.frames[i].filename;
                        name = name.substring(0, name.length - 4);
                        frame = json.frames[i].frame;
                        texturePacker[name] = PackedImage(image, frame);
                    }
                }
            },
            /**
             * Returns asset group
             * @function
             * @instance
             * @returns {Object} assetGroups - reference to loaded JSON file
             * @name getAssetGroups
             */
            getAssetGroups = function () {
                return assetGroups;
            };
        return {
            loadAssetGroups: loadAssetGroups,
            load: load,
            loadImageFromUrl: loadImageFromUrl,
            loadJsonFromUrl: loadJsonFromUrl,
            loadAudioFromUrl: loadAudioFromUrl,
            unload: unload,
            getImage: getImage,
            getImageElement: getImageElement,
            getJson: getJson,
            getAudio: getAudio,
            getAssets: getAssets,
            getAssetGroups: getAssetGroups
        };
    };
});