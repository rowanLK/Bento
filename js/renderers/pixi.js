rice.define('rice/renderers/pixi', [
    'rice/sugar'
], function (Sugar) {
    return function (canvas, context) {
        var pixiStage,
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
                    pixiStage.addChild(obj.pixiSprite);
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
                    pixiStage.removeChildren();
                }
            };
        // init pixi
        pixiStage = new PIXI.Stage(0x000000);
        pixiRenderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {
            view: canvas
        });
        console.log('initialized pixi as renderer');
        return renderer;
    }
});