/**
 * Intercepts GLTF and FBX loader with base64 inline urls. Run this before GLTFLoader begins.
 * When parsing a GLTF/FBX file, if a relative path to an asset is encountered, it will be replaced by a Base64 asset if one exists.
 * This allows the loaders to work in compact builds.
 * @moduleName InlineThreeLoaders
 */
bento.define('inlinethreeloaders', [
    'bento/utils'
], function (
    Utils
) {
    'use strict';
    var cache = {};
    var InlineGltfLoader = function (AssetManager) {
        if (!THREE.GLTFLoader) {
            console.log('ERROR: there is no THREE.GLTFLoader');
            return;
        }
        if (!THREE.GLTFParser) {
            console.log('ERROR: GLTFParser is not exposed');
            return;
        }
        var GLTFParser = THREE.GLTFParser;
        // cache original functions
        if (!cache.loadBuffer) {
            cache.loadBuffer = GLTFParser.prototype.loadBuffer;
        }
        if (!cache.loadTexture) {
            cache.loadTexture = GLTFParser.prototype.loadTexture;
        }

        // replace prototype
        GLTFParser.prototype.loadBuffer = function (bufferIndex) {
            var bufferDef = this.json.buffers[bufferIndex];
            var path = this.options.path;
            // check if there is an asset that's exactly this 
            var assetsJson = AssetManager.getAssetGroups();
            var comparison;

            if (path) {
                comparison = path + '/' + bufferDef.uri;
            } else {
                comparison = bufferDef.uri;
            }
            Utils.forEach(assetsJson, function (types, groupName) {
                Utils.forEach(types, function (assetGroup, groupType) {
                    Utils.forEach(assetGroup, function (value, key) {
                        if (key === comparison) {
                            if (value.startsWith('data:')) {
                                // replace uri with base64
                                bufferDef.uri = value;
                            }
                        }
                    });
                });
            });


            // call original function
            return cache.loadBuffer.apply(this, arguments);
        };
        // replace prototype
        GLTFParser.prototype.loadTexture = function (textureIndex) {
            var textureDef = this.json.textures[textureIndex];
            var textureExtensions = textureDef.extensions || {};
            var source;
            var path = this.options.path;
            var comparison;

            if (textureExtensions['MSFT_texture_dds']) {
                source = this.json.images[textureExtensions['MSFT_texture_dds'].source];
            } else {
                source = this.json.images[textureDef.source];
            }
            if (path) {
                comparison = path + '/' + source.uri;
            } else {
                comparison = source.uri;
            }

            // check if there is an asset that's exactly this 
            var assetsJson = AssetManager.getAssetGroups();
            Utils.forEach(assetsJson, function (types, groupName) {
                Utils.forEach(types, function (assetGroup, groupType) {
                    Utils.forEach(assetGroup, function (value, key) {
                        if (key === comparison) {
                            if (value.startsWith('data:')) {
                                // replace uri with base64
                                source.uri = value;
                            }
                        }
                    });
                });
            });

            // call original function
            return cache.loadTexture.apply(this, arguments);
        };
    };
    var InlineFbxLoader = function (AssetManager) {
        if (!THREE.FBXLoader) {
            console.log('ERROR: there is no THREE.FBXLoader');
            return;
        }
        if (!THREE.FBXTreeParser) {
            console.log('ERROR: FBXTreeParser is not exposed');
            return;
        }
        var FBXTreeParser = THREE.FBXTreeParser;
        // cache original functions
        if (!cache.loadTextureFbx) {
            cache.loadTextureFbx = FBXTreeParser.prototype.loadTexture;
        }

        // replace prototype
        FBXTreeParser.prototype.loadTexture = function (textureNode, images) {
            var fileName;
            var children = this.connections.get(textureNode.id).children;

            if (children !== undefined && children.length > 0 && images[children[0].ID] !== undefined) {

                fileName = images[children[0].ID];

                // check if there is an asset that's exactly this 
                var assetsJson = AssetManager.getAssetGroups();
                Utils.forEach(assetsJson, function (types, groupName) {
                    Utils.forEach(types, function (assetGroup, groupType) {
                        Utils.forEach(assetGroup, function (value, key) {
                            if (key + '.png' === fileName) {
                                if (value.startsWith('data:')) {
                                    // replace uri with base64
                                    images[children[0].ID] = value;
                                }
                            }
                        });
                    });
                });
            }

            // call original function
            return cache.loadTextureFbx.apply(this, arguments);
        };
    };
    return {
        gltf: InlineGltfLoader,
        fbx: InlineFbxLoader
    };
});