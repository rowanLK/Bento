/**
 *  Manager that controls all assets
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
rice.define('rice/managers/asset', [
    'rice/sugar'
], function (Sugar) {
    'use strict';
    var assetGroups = {},
        assets = {
            audio: {},
            json: {},
            images: {}
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
                    if ((xhr.status === 200) || ((xhr.status === 0) && xhr.responseText)) {
                        callback(null, name, JSON.parse(xhr.responseText));
                    } else {
                        callback('Error: State ' + xhr.readyState + ' ' + source);
                    }
                }
            };
            xhr.send(null);
        },
        loadImage = function (name, source, callback) {
            // TODO: Implement failure
            var img = new Image();
            img.src = source;
            img.addEventListener('load', function () {
                callback(null, name, img);
            }, false);
        },
        /**
         * Loads json files containing asset paths
         * @param {Object} jsonFiles: name with json path
         * @param {Function} onReady: callback when ready
         * @param {Function} onLoaded: callback when json file is loaded
         */
        loadAssetGroups = function (jsonFiles, onReady, onLoaded) {
            var jsonName,
                keyCount = Sugar.getKeyLength(jsonFiles),
                loaded = 0,
                callback = function (err, name, json) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    assetGroups[name] = json;
                    loaded += 1;
                    if (Sugar.isDefined(onLoaded)) {
                        onLoaded(loaded, keyCount);
                    }
                    if (keyCount === loaded && Sugar.isDefined(onReady)) {
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
         * Loads assets from group
         * @param {String} groupName: name of asset group
         * @param {Function} onReady: callback when ready
         * @param {Function} onLoaded: callback when asset file is loaded
         */
        load = function (groupName, onReady, onLoaded) {
            var group = assetGroups[groupName],
                asset,
                assetsLoaded = 0,
                path = '',
                assetCount = 0,
                checkLoaded = function () {
                    if (assetsLoaded === assetCount && Sugar.isDefined(onReady)) {
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
                    if (Sugar.isDefined(onLoaded)) {
                        onLoaded(assetsLoaded, assetCount);
                    }
                    checkLoaded();
                };

            if (!Sugar.isDefined(group)) {
                onReady('Could not find asset group ' + groupName);
                return;
            }
            // set path
            if (Sugar.isDefined(group.path)) {
                path += group.path;
            }
            // load images
            if (Sugar.isDefined(group.images)) {
                assetCount += Sugar.getKeyLength(group.images);
                for (asset in group.images) {
                    if (!group.images.hasOwnProperty(asset)) {
                        continue;
                    }
                    loadImage(asset, path + group.images[asset], onLoadImage);
                }
            }
            // load audio
            if (Sugar.isDefined(group.audio)) {
                assetCount += Sugar.getKeyLength(group.audio);
            }
            // load json
            if (Sugar.isDefined(group.json)) {
                assetCount += Sugar.getKeyLength(group.json);
            }

        },
        unload = function () {},
        getImage = function (name) {
            var asset = assets.images[name];
            if (!Sugar.isDefined(asset)) {
                throw ('Asset ' + name + ' could not be found');
            }
            return asset;
        },
        getSubImage = function (name) {

        };
    return {
        loadAssetGroups: loadAssetGroups,
        load: load,
        unload: unload,
        getImage: getImage,
        getSubImage: getSubImage
    };
});