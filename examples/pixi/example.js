bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/pixi/sprite',
    'bento/components/clickable',
    'bento/tween',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    PixiSprite,
    Clickable,
    Tween,
    Utils
) {
    var onShow = function () {
        var viewport = Bento.getViewport();
        var bunnySprite = {
            image: Bento.assets.getImage('bunnygirlsmall'),
            originRelative: new Vector2(0.5, 0.5),
            frameWidth: 32,
            frameHeight: 32,
            animations: {
                'default': {
                    speed: 0.1,
                    frames: [0, 10, 11, 12]
                }
            },
        };
        // An example of manually setting up a pixi sprite to draw
        // not shown in the example
        var makePixiSpriteManual = function () {
            // PIXI: setup the pixi stuff
            var baseTexture = new PIXI.BaseTexture(
                Bento.assets.getImage('bunnygirlsmall').image,
                PIXI.SCALE_MODES.NEAREST
            );
            var rectangle = new PIXI.Rectangle(0, 0, 32, 32);
            var texture = new PIXI.Texture(baseTexture, rectangle);
            var pixiSprite = new PIXI.Sprite(texture);
            pixiSprite.pivot.set(16, 16);

            // PIXI: setup blurfilter
            var blurFilter = new PIXI.filters.BlurFilter();
            pixiSprite.filters = [blurFilter];

            // bento stuff
            var drawPixiComponent = {
                // this component draws the actual sprite using data.renderer.drawPixi
                name: 'drawPixi',
                update: function (data) {
                    // test with filter
                    blurFilter.blur = 20 * Math.cos(entity.timer / 50);
                },
                draw: function (data) {
                    data.renderer.translate(-16, -16);
                    data.renderer.drawPixi(pixiSprite);
                }
            };
            var entity = new Entity({
                name: 'bunny5',
                position: new Vector2(viewport.width / 2, viewport.height / 2 + 16),
                components: [
                    drawPixiComponent
                ]
            });
            Bento.objects.add(entity);
        };
        // setting up an animated sprite using PixiSprite
        // the constructor is the same as Sprite, except PixiSprite exposes a member called sprite
        // this is the PIXI sprite, you can use it to attach other PIXI stuff
        var makePixiSprite = function () {
            var blurBehavior = {
                update: function (data) {
                    // test with filter
                    blurFilter.blur = 20 * Math.cos(entity.timer / 50);
                }
            };
            var rotateBehavior = {
                update: function (data) {
                    entity.rotation += Utils.toRadian(1);
                }
            };
            var blurFilter = new PIXI.filters.BlurFilter();
            var pixiSprite = new PixiSprite(bunnySprite);
            var entity = new Entity({
                name: 'bunny6',
                position: new Vector2(viewport.width / 2, viewport.height / 2 - 16),
                components: [
                    pixiSprite,
                    blurBehavior,
                    // rotateBehavior
                ]
            });

            pixiSprite.sprite.filters = [blurFilter];
            Bento.objects.add(entity);

        };

        makePixiSprite();
        // makePixiSpriteManual();
    };

    // start setup
    Bento.setup({
        canvasId: "canvas",
        canvasDimension: new Rectangle(0, 0, 160, 240),
        renderer: 'pixi', // must use pixi! the pixi library is included in index.html
        pixelSize: 3,
        onComplete: function () {
            // load all assets and start game afterwards
            Bento.assets.loadAllAssets({
                onComplete: onShow
            });
        }
    });
});