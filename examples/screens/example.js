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
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        preventContextMenu: true,
        dev: true,
        screenshot: 'buttonDown-q',
        reload: {
            simple: 'mouseDown-right'
        },
        pixelSize: 3,
        antiAlias: false
    }, function () {
        Bento.assets.load('assets', function (err) {
            // when assets are loaded, go to screen 1
            Bento.screens.show('screen1');
        });
    });
});