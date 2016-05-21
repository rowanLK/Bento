bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/tween',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Clickable,
    Tween,
    Utils
) {
    var onShow = function () {
        var viewport = Bento.getViewport();
        var bunnySprite = {
            image: Bento.assets.getImage('bunnygirlsmall'),
            frameWidth: 32,
            frameHeight: 32,
            animations: {
                'default': {
                    speed: 0.1,
                    frames: [0, 10, 11, 12]
                }
            },
        };
        var bunny1 = new Entity({
            components: [
                new Sprite(bunnySprite),
                new Clickable({
                    pointerDown: function (evt) {
                        console.log(evt);
                        Tween({
                            from: 16,
                            to: 160,
                            'in': 60,
                            ease: 'easeOutBounce',
                            do :
                            function (v, t) {
                                bunny1.position.y = v;
                            },
                            onComplete: function () {

                            }
                        });
                    }
                })
            ],
            position: new Vector2(16, 16),
            originRelative: new Vector2(0.5, 0.5)
        });
        var bunny2 = new Entity({
            components: [new Sprite(bunnySprite)],
            position: new Vector2(16 + 32, 16),
            originRelative: new Vector2(0.5, 0.5),
            init: function () {
                this.scale.x = 2;
            }
        });
        var rotateBehavior = {
            update: function () {
                bunny3.rotation += Utils.toRadian(1);
                if (Bento.input.isKeyDown('down')) {
                    bunny3.position.y += 1;
                }
            }
        };
        var bunny3 = new Entity({
            components: [
                new Sprite(bunnySprite),
                rotateBehavior
            ],
            position: new Vector2(16 + 64, 16),
            originRelative: new Vector2(0.5, 0.5)
        });
        var rotateScaleBehavior = {
            update: function () {
                bunny4.rotation += Utils.toRadian(1);
                bunny4.scale.x = Math.sin(bunny4.timer / 10);
            }
        };
        var bunny4 = new Entity({
            components: [
                new Sprite(bunnySprite),
                rotateScaleBehavior
            ],
            position: new Vector2(16 + 96, 16),
            originRelative: new Vector2(0.5, 0.5)
        });
        // uses a manual pixi sprite to draw
        var makePixiSprite = function () {
            // todo: make a nice pixi component one day?
            var drawPixiComponent = {
                update: function (data) {
                    blurFilter.blur = 20 * Math.cos(entity.timer / 50);
                },
                draw: function (data) {
                    data.renderer.translate(-16, -16); // temp: origin set manually
                    data.renderer.drawPixi(pixiSprite);
                }
            };
            var baseTexture = new PIXI.BaseTexture(
                Bento.assets.getImage('bunnygirlsmall').image,
                PIXI.SCALE_MODES.NEAREST
            );
            var rectangle = new PIXI.Rectangle(0, 0, 32, 32);
            var texture = new PIXI.Texture(baseTexture, rectangle);
            var pixiSprite = new PIXI.Sprite(texture);
            var blurFilter = new PIXI.filters.BlurFilter();
            var entity = new Entity({
                name: 'bunny5',
                position: new Vector2(viewport.width / 2, viewport.height / 2),
                originRelative: new Vector2(0.5, 0.5),
                components: [
                    drawPixiComponent
                ]
            });

            pixiSprite.filters = [blurFilter];
            Bento.objects.add(entity);
        };

        Bento.objects.add(bunny1);
        Bento.objects.add(bunny2);
        Bento.objects.add(bunny3);
        Bento.objects.add(bunny4);

        // test with fillRect
        // bunny4.attach({
        //     draw: function (data) {
        //         data.renderer.fillRect([1, 0, 0, 1], 0, 0, 16, 16);
        //     }
        // });

        // test with renderer.drawPixi
        makePixiSprite();
    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'pixi',
        pixelSize: 2
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});