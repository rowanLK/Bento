bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'bento/autoresize'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Tween,
    AutoResize
) {
    var onShow = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            z: -100,
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
            originRelative: new Vector2(0.5, 0.5),
            components: [
                new Sprite({
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
    var canvasDimension = new AutoResize(
        new Rectangle(0, 0, 180, 320), // base size
        320, // minimum height
        320 // maximum height
    );
    var onResize = function () {
        var viewport = Bento.getViewport();
        var canvas = document.getElementById('canvas');
        canvasDimension = new AutoResize(
            new Rectangle(0, 0, 180, 320), // base size
            320, // minimum height
            320 // maximum height
        );
        // max/min width
        if (canvasDimension.width > 240) {
            canvasDimension.width = 240;
        }
        if (canvasDimension.width < 180) {
            canvasDimension.width = 180;
        }
        canvas.width = canvasDimension.width * 3;
        canvas.height = canvasDimension.height * 3;
        viewport.width = canvasDimension.width;
        viewport.height = canvasDimension.height;

        // fit to height
        canvas.style.height = window.innerHeight + 'px';
        canvas.style.width = (viewport.width / viewport.height * window.innerHeight) + 'px';
    };
    window.addEventListener('resize', onResize, false);
    window.addEventListener('orientationchange', onResize, false);
    onResize();

    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: canvasDimension,
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'canvas2d',
        pixelSize: 3,
        manualResize: true
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});