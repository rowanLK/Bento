bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/tiled'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Tiled
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'webgl'
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                tiled = Tiled({
                    name: 'level',
                    spawn: true
                });
            console.log(tiled)
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});