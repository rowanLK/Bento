bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'bento/autoresize',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Tween,
    AutoResize,
    Utils
) {
    var onShow = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            z: -100,
            name: 'background',
            addNow: true,
            components: [new Fill({
                color: [1, 1, 1, 1]
            })]
        });
        // cursor test with getLocalPosition
        var cursor = new Entity({
            z: 10,
            name: 'cursor',
            position: new Vector2(0, 0),
            components: [
                new Sprite({
                    originRelative: new Vector2(0.5, 0.5),
                    imageName: 'cursor'
                }),
                new Clickable({
                    pointerMove: function (evt) {
                        cursor.position.x = evt.position.x;
                        cursor.position.y = evt.position.y;
                    }
                })
            ]
        });

        Bento.objects.attach(cursor);

    };

    Bento.setup({
        canvasId: 'canvas',
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'canvas2d',
        pixelSize: 3,
        antiAlias: false,
        responsiveResize: {
            landscape: false,
            minWidth: 180,
            maxWidth: 240,
            minHeight: 320, // minimum for iPad -> 240 x 320
            maxHeight: 390, // will fill up for iPhoneX (ratio 19.5:9) -> 180 x 390
        },
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});