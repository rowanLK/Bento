bento.define('bento/renderers/pixi', [
    'bento/utils'
], function (Utils) {
    return function (canvas, settings) {
        var context,
            pixiStage,
            pixiRenderer,
            pixiBatch,
            currentObject,
            renderer = {
                name: 'pixi',
                init: function () {

                },
                destroy: function () {},
                save: function (obj) {},
                restore: function () {},
                translate: function (x, y) {},
                scale: function (x, y) {},
                rotate: function (angle) {},
                fillRect: function (color, x, y, w, h) {},
                fillCircle: function (color, x, y, radius) {},
                drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {},
                flush: function () {
                    pixiRenderer.render(pixiStage);
                },
                addChild: function (child) {
                    pixiStage.addChild(child);
                },
                removeChild: function (child) {
                    pixiStage.removeChild(sprite);
                }
            };
        if (!window.PIXI) {
            throw 'Pixi library missing';
        }

        // init pixi
        pixiStage = new PIXI.Container();
        pixiRenderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {
            view: canvas,
            backgroundColor: 0x000000
        });
        console.log('Init pixi as renderer');
        console.log(pixiRenderer.view === canvas);

        return renderer;
    };
});