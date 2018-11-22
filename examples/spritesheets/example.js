/**
 * TODO: provide a proper explanation of whats going on here!
 */
bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/tween',
    'bento/utils',
    'bento/canvas',
    'bunny',
    'bento/components/clickable'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Tween,
    Utils,
    Canvas,
    Bunny,
    Clickable
) {
    var loadAssets = function () {
        Bento.assets.loadAllAssets({
            onComplete: onLoaded
        });
    };
    var onLoaded = function (err) {
        console.log(Bento.assets.getSpriteSheet('idle'));

        var viewport = Bento.getViewport();
        var background = new Entity({
            z: 0,
            name: 'background',
            components: [new Fill({
                    color: [1, 1, 1, 1]
                }),
                new Clickable({
                    pointerDown: function (data) {
                        bunny.punch();
                    }
                })
            ]
        });

        var bunny = new Bunny();
        bunny.position = new Vector2(viewport.width / 2, viewport.height / 2);

        Bento.objects.attach(background);
        Bento.objects.attach(bunny);

    };

    Bento.setup({
        canvasId: 'canvas',
        //renderer: 'pixi',
        pixelSize: 2,
        antiAlias: false,
        canvasDimension: new Rectangle(0, 0, 320, 240),
        onComplete: loadAssets
    });
});