/**
 * A helper module that returns a rectangle with the same aspect ratio as the screen size.
 * Assuming portrait mode, autoresize holds the width and then fills up the height
 * If the height goes over the max or minimum size, then the width gets adapted.
 * <br>Exports: Constructor
 * @module bento/autoresize
 * @moduleName AutoResize
 * @param {Rectangle} canvasDimension - Default size
 * @param {Number} minSize - Minimal height (in portrait mode), if the height goes lower than this,
 * then autoresize will start filling up the width
 * @param {Boolean} isLandscape - Game is landscape, swap operations of width and height
 * @returns Rectangle
 */
bento.define('bento/autoresize', [
    'bento/utils'
], function (Utils) {
    return function (canvasDimension, minSize, maxSize, isLandscape) {
        var originalDimension = canvasDimension.clone(),
            screenSize = Utils.getScreenSize(),
            innerWidth = screenSize.width,
            innerHeight = screenSize.height,
            devicePixelRatio = window.devicePixelRatio,
            deviceHeight = !isLandscape ? innerHeight * devicePixelRatio : innerWidth * devicePixelRatio,
            deviceWidth = !isLandscape ? innerWidth * devicePixelRatio : innerHeight * devicePixelRatio,
            swap = function () {
                // swap width and height
                var temp = canvasDimension.width;
                canvasDimension.width = canvasDimension.height;
                canvasDimension.height = temp;
            },
            setup = function () {
                var ratio = deviceWidth / deviceHeight;

                if (ratio > 1) {
                    // user is holding device wrong
                    ratio = 1 / ratio;
                }

                canvasDimension.height = canvasDimension.width / ratio;

                // exceed min size?
                if (canvasDimension.height < minSize) {
                    canvasDimension.height = minSize;
                    canvasDimension.width = ratio * canvasDimension.height;
                }
                if (canvasDimension.height > maxSize) {
                    canvasDimension.height = maxSize;
                    canvasDimension.width = ratio * canvasDimension.height;
                }

                if (isLandscape) {
                    swap();
                }

                console.log('Screen size: ' + innerWidth * devicePixelRatio + ' x ' + innerHeight * devicePixelRatio);
                console.log('Resolution: ' + canvasDimension.width.toFixed(2) + ' x ' + canvasDimension.height.toFixed(2));
                return canvasDimension;
            },
            scrollAndResize = function () {
                window.scrollTo(0, 0);
            };


        window.addEventListener('orientationchange', scrollAndResize, false);

        if (isLandscape) {
            swap();
        }

        return setup();
    };
});