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
                    // console.log('correct')
                } else {
                    // user is holding device wrong
                    canvasRatio = deviceWidth / deviceHeight;
                    screenHeight = deviceWidth;
                    // console.log('incorrect')
                }

                // console.log(canvasRatio, 'screenHeight = ' + screenHeight);

                height = screenHeight;

                // dynamic height
                while (height > maxSize) {
                    height = Math.floor(screenHeight / i);
                    i += 1;
                    console.log(height);
                    // too small: give up
                    if (height < minSize) {
                        console.log('cannot fit pixels');
                        height = originalDimension.height;
                        break;
                    }
                }
                console.log(height);

                //canvasRatio = Math.min(Math.max(canvasRatio, 0.5), 1.5)
                canvasDimension.width = height / canvasRatio;
                canvasDimension.height = height;
                if (!isLandscape) {
                    swap();
                }
                console.log(canvasDimension.width, canvasDimension.height);
                return canvasDimension;
            },
            scrollAndResize = function () {
                window.scrollTo(0, 0);
            };
        window.addEventListener('orientationchange', scrollAndResize, false);
        //window.addEventListener('resize', onResize, false);
        if (!isLandscape) {
            swap();
        }
        return setup();
    };
});