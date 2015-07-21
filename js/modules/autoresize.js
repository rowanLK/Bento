/**
 * A helper module that returns a rectangle as the best fit of a multiplication of the screen size.
 * Assuming portrait mode, autoresize first tries to fit the width and then fills up the height
 * <br>Exports: Function
 * @module bento/autoresize
 * @param {Rectangle} canvasDimension - Default size
 * @param {Number} minSize - Minimal width/height
 * @param {Number} maxSize - Maximum width/height
 * @param {Boolean} isLandscape - Landscape or portrait
 * @returns Rectangle
 */
 bento.define('bento/autoresize', [
    'bento/utils'
], function (Utils) {
    return function (canvasDimension, minSize, maxSize, isLandscape) {
        var originalDimension = canvasDimension.clone(),
            innerWidth = window.innerWidth,
            innerHeight = window.innerHeight,
            deviceHeight = isLandscape ? innerWidth : innerHeight,
            deviceWidth = isLandscape ? innerHeight : innerWidth,
            swap = function () {
                // swap width and height
                temp = canvasDimension.width;
                canvasDimension.width = canvasDimension.height;
                canvasDimension.height = temp;
            },
            setup = function () {
                var i = 2,
                    height = canvasDimension.height,
                    screenHeight,
                    windowRatio = deviceHeight / deviceWidth,
                    canvasRatio = canvasDimension.height / canvasDimension.width;

                if (windowRatio < 1) {
                    canvasRatio = windowRatio;
                    screenHeight = deviceHeight;
                } else {
                    // user is holding device wrong
                    canvasRatio = deviceWidth / deviceHeight;
                    screenHeight = deviceWidth;
                }

                height = screenHeight;
                // real screenheight is not reported correctly
                screenHeight *= window.devicePixelRatio || 1;
                console.log(screenHeight);
                
                // dynamic height
                while (height > maxSize) {
                    height = Math.floor(screenHeight / i);
                    i += 1;
                    // too small: give up
                    if (height < minSize) {
                        height = isLandscape ? originalDimension.height : originalDimension.width;
                        break;
                    }
                }

                canvasDimension.width = height / canvasRatio;
                canvasDimension.height = height;
                if (!isLandscape) {
                    swap();
                }
                return canvasDimension;
            },
            scrollAndResize = function () {
                window.scrollTo(0, 0);
            };
        window.addEventListener('orientationchange', scrollAndResize, false);
        if (!isLandscape) {
            swap();
        }
        return setup();
    };
});