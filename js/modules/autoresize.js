/**
 * A helper module that returns an object with a correctly sized width and height for the aspect ratio
 * 'type' defines the allowed orientation
 * If the height goes over the max or minimum size, then the width gets adapted.
 * <br>Exports: Constructor
 * @module bento/autoresize
 * @moduleName AutoResize
 * @param {Number} minWidth - Lowest clamped width in portrait. Smaller than this, and height is scaled up to fit the aspect ratio. Acts as a 'target dimension'
 * @param {Number} maxWidth - Max clamped width in portrait.
 * @param {Number} minHeight - Lowest clamped height in portrait. . Smaller than this, and width is scaled up to fit the aspect ratio. Acts as a 'target dimension'
 * @param {Number} maxHeight - Max clamped height in portrait.
 * @param {String} lockedRotation - 'portrait' or 'landscape' - Enforces an aspect ratio for one or the other, not necessary if forcable by other means
 * @returns Object
 */
bento.define('bento/autoresize', [
    'bento/utils'
], function (Utils) {
    return function (minWidth, maxWidth, minHeight, maxHeight, lockedRotation) {
        var screenSize = Utils.getScreenSize();
        // get the ration of screen height to width 
        var ratio = screenSize.width / screenSize.height;
        // work out if we are currently in portrait or landscape
        var isPortrait = (ratio <= 1);

        //force a specific rotation
        switch (lockedRotation) {
        case 'portrait':
            isPortrait = true;
            break;
        case 'landscape':
            isPortrait = false;
            break;
        }

        // create new object with correctly scaled and clamped dimensions
        var newDimension = (isPortrait) ? {
            width: Math.ceil(Utils.clamp(minWidth, minHeight * ratio, maxWidth)),
            height: Math.ceil(Utils.clamp(minHeight, minWidth / ratio, maxHeight))
        } : {
            width: Math.ceil(Utils.clamp(minHeight, minWidth * ratio, maxHeight)),
            height: Math.ceil(Utils.clamp(minWidth, minHeight / ratio, maxWidth))
        };
        return newDimension;
    };
});