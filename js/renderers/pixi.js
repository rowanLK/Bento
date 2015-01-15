bento.define('bento/renderers/pixi', [
    'bento/utils'
], function (Utils) {
    return function (canvas, context) {
        var useBatch = false,
            pixiStage,
            pixiRenderer,
            pixiBatch,
            currentObject,
            renderer = {
                name: 'pixi',
                init: function () {

                },
                destroy: function () {},
                save: function (obj) {
                    currentObject = obj;
                    pixiBatch.addChild(obj.pixiSprite);
                    currentObject.pixiSprite.position.x = 0;
                    currentObject.pixiSprite.position.y = 0;
                },
                restore: function () {},
                translate: function (x, y) {
                    currentObject.pixiSprite.position.x += x;
                    currentObject.pixiSprite.position.y += y;
                },
                scale: function (x, y) {},
                rotate: function (angle) {},
                fillRect: function (color, x, y, w, h) {},
                drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {
                    currentObject.pixiTexture.setFrame(new PIXI.Rectangle(sx, sy, sw, sh));
                },
                flush: function () {
                    pixiRenderer.render(pixiStage);
                    pixiBatch.removeChildren();
                }
            };
        // init pixi
        pixiStage = new PIXI.Stage(0x000000);
        pixiRenderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {
            view: canvas
        });
        if (useBatch) {
            pixiBatch = new PIXI.SpriteBatch();
            pixiStage.addChild(pixiBatch);
        } else {
            pixiBatch = pixiStage;
        }
        console.log('Init pixi as renderer');
        return renderer;
    }
});