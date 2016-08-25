bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/gui/text',
    'bento/tween',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Text,
    Tween,
    Utils
) {
    var onLoaded = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            z: 0,
            components: [new Fill({
                color: [1, 1, 1, 1]
            })]
        });
        var text = new Text({
            z: 1,
            position: new Vector2(8, -4),
            text: '1. Normal\n\n\n2. Scaled\n\n\n3. Rotating\n\n\n4. Scaling and rotating',
            font: 'font',
            fontSize: 16,
            ySpacing: 3,
            fontColor: '#ccc',
            align: 'left'
        });

        /*
         * Bunny 1: control bunny
         */
        var normalBunny = new Entity({
            z: 1,
            name: 'normalBunny',
            components: [
                new Sprite(Bento.assets.getJson('bunny'))
            ],
            position: new Vector2(viewport.width / 2, 32),
            originRelative: new Vector2(0.5, 0.5)
        });

        /*
         * Bunny 2: stretched bunny
         */
        var stretchComponent = {
            start: function () {
                // stretch in y when bunny is placed in the game
                stretchBunny.scale.y = 0.5;
            }
        };
        var stretchBunny = new Entity({
            z: 1,
            name: 'stretchBunny',
            scale: new Vector2(2, 1), // stretched in x
            position: new Vector2(viewport.width / 2, 88),
            originRelative: new Vector2(0.5, 0.5),
            components: [
                new Sprite(Bento.assets.getJson('bunny')),
                stretchComponent
            ]
        });

        /*  
         * Bunny 3: rotating bunny
         */
        var rotationBehavior = {
            name: 'rotationBehavior',
            update: function () {
                // add 1 degree every tick
                rotatingBunny.rotation += Utils.toRadian(1);
            }
        };
        var rotatingBunny = new Entity({
            z: 1,
            name: 'rotatingBunny',
            position: new Vector2(viewport.width / 2, 152),
            originRelative: new Vector2(0.5, 0.5),
            components: [
                new Sprite(Bento.assets.getJson('bunny')),
                rotationBehavior
            ]
        });

        /*
         * Bunny 4: rotating and stretching
         */
        var stretchAndRotate = {
            name: 'stretchAndRotate',
            update: function () {
                bunny4.rotation += Utils.toRadian(1);
                bunny4.scale.x = (Math.sin(bunny4.timer / 10));
            }
        };
        var bunny4 = new Entity({
            z: 1,
            name: 'rotatingBunny',
            position: new Vector2(viewport.width / 2, 208),
            originRelative: new Vector2(0.5, 0.5),
            components: [
                new Sprite(Bento.assets.getJson('bunny')),
                stretchAndRotate
            ]
        });

        Bento.objects.attach(background);
        Bento.objects.attach(text);
        Bento.objects.attach(normalBunny);
        Bento.objects.attach(stretchBunny);
        Bento.objects.attach(rotatingBunny);
        Bento.objects.attach(bunny4);

    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        pixelSize: 3, // notice how scaling and rotations are smooth due to the pixelSize
        onComplete: function () {
            // load all assets and start game afterwards
            Bento.assets.loadAllAssets({
                onComplete: onLoaded
            });
        }
    });
});