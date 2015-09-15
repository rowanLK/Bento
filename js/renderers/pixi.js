bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils'
], function (Bento, Utils) {
    return function (canvas, settings) {
        var context,
            pixiStage,
            pixiRenderer,
            pixiBatch,
            currentObject,
            sortMode = settings.sortMode || 0,
            renderer = {
                name: 'pixi',
                init: function () {

                },
                destroy: function () {},
                save: function () {},
                restore: function () {},
                translate: function (x, y) {},
                scale: function (x, y) {},
                rotate: function (angle) {},
                fillRect: function (color, x, y, w, h) {},
                fillCircle: function (color, x, y, radius) {},
                drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {},
                begin: function () {
                    if (sortMode === Utils.SortMode.ALWAYS) {
                        sort();
                    }
                },
                flush: function () {
                    var viewport = Bento.getViewport();
                    pixiStage.x = -viewport.x;
                    pixiStage.y = -viewport.y;
                    pixiRenderer.render(pixiStage);
                },
                addChild: function (child) {
                    pixiStage.addChild(child);
                    if (sortMode === Utils.SortMode.SORT_ON_ADD) {
                        sort();
                    }                },
                removeChild: function (child) {
                    pixiStage.removeChild(child);
                }
            },
            sort = function () {
                Utils.stableSort.inplace(pixiStage.children, function (a, b) {
                    return a.z - b.z;
                });
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