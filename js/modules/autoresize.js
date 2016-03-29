/**
 * A helper module that returns a rectangle as the best fit of a multiplication of the screen size.
 * Assuming portrait mode, autoresize first tries to fit the width and then fills up the height
 * <br>Exports: Constructor
 * @module bento/autoresize
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
            innerWidth = window.innerWidth,
            innerHeight = window.innerHeight,
            devicePixelRatio = window.devicePixelRatio,
            deviceHeight = !isLandscape ? innerHeight * devicePixelRatio : innerWidth * devicePixelRatio,
            deviceWidth = !isLandscape ? innerWidth * devicePixelRatio : innerHeight * devicePixelRatio,
            swap = function () {
                // swap width and height
                var temp = canvasDimension.width;
                canvasDimension.width = canvasDimension.height;
                canvasDimension.height = temp;
                console.log('swap')
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
                console.log('Resolution:', canvasDimension);
                // round up
                canvasDimension.width = Math.ceil(canvasDimension.width);
                canvasDimension.height = Math.ceil(canvasDimension.height);
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