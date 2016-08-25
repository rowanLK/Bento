bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/gui/counter',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Counter,
    Sprite,
    Fill,
    Clickable,
    Tween,
    Utils
) {
    var onLoaded = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            addNow: true,
            components: [new Fill({
                color: [1, 1, 1, 1]
            })]
        });
        // method 1: parameters
        var counter1 = new Counter({
            z: 1,
            imageName: 'numberslarge',
            frameCountX: 5,
            frameCountY: 2,
            alignment: 'center',
            spacing: new Vector2(-16, 0),
            position: new Vector2(viewport.width / 2, 32)
        });
        // method 2: sprite as parameter
        var counter2 = new Counter({
            z: 1,
            sprite: new Sprite({
                imageName: 'numberslarge',
                frameWidth: 48, // can also use frameWidth and frameHeight if you wish
                frameHeight: 48
            }),
            alignment: 'center',
            spacing: new Vector2(-16, 0),
            position: new Vector2(viewport.width / 2, 96)
        });

        // attach the counters
        Bento.objects.attach(counter1);
        // Bento.objects.attach(counter2);

        // attach counting behaviors
        counter1.attach({
            name: 'countingBehavior',
            update: function () {
                if (counter1.timer % 10 === 0) {
                    counter1.addValue(1);
                }
            }
        });
        counter2.attach({
            name: 'countingBehavior',
            update: function () {
                if (counter2.timer % 30 === 0) {
                    counter2.addValue(1);
                }
            }
        });
    };

    Bento.setup({
        canvasId: "canvas",
        canvasDimension: new Rectangle(0, 0, 320, 240),
        onComplete: function () {
            // load all assets and start game afterwards
            Bento.assets.loadAllAssets({
                onComplete: onLoaded
            });
        }
    });
});