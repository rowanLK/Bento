/**
 * Create a LoadingManager to be passed to GLTFLoader / FBXLoader
 * These are used to rewrite URLs of local buffer/texture resources.
 * e.g. if a relative path to a resource is encountered, we can find an
 *  appropriate Base64 URI from assets.json and supply that instead.
 */
bento.define('threeloadingmanager', [
    'bento/utils'
], function (
    Utils
) {
    'use strict';

    var hasPatched = false;

    var patchLoaderUtils = function () {
        // Fix this Three function so that it doesn't mess up data URIs
        var extractUrlBase = THREE.LoaderUtils.extractUrlBase;
        THREE.LoaderUtils.extractUrlBase = function (url) {
            if (url.startsWith('data:')) {
                return '';
            } else {
                return extractUrlBase(url);
            }
        };
    };

    return function (group, meshKind, assetPath, log) {

        if (!hasPatched) {
            patchLoaderUtils();
            hasPatched = true;
        }

        var manager = new THREE.LoadingManager();

        // Note: if additional logic is needed, we can override the loaders like this:
        // manager.addHandler(/\.gltf$/i, gltfLoader);
        // manager.addHandler(/\.png$/i, textureLoader);
        // manager.addHandler(/\.bin$/i, bufferLoader);

        manager.setURLModifier(function (url) {
            if (url.startsWith('data:')) {
                // Base64 URI
                return url;
            } else if (url.startsWith('assets/')) {
                // We already have the full path to an asset
                return url;
            } else {
                // Find an asset in the group by name
                var assetName = assetPath + url;
                var resources = group[meshKind];

                // Remove extension for FBX resources, but not for GLTF ones
                if (meshKind !== 'gltf') assetName = assetName.split('.')[0];
                
                var realUrl = resources ? resources[assetName] : null;
                if (realUrl) {
                    return realUrl;
                } else {
                    Utils.log('Failed to find ' + meshKind + ' resource: ' + assetName);
                    return url;
                }
            }
        });

        return manager;
    };

});