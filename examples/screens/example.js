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
    // if (document) {
    //     if (document.addEventListener) {
    //         // right click
    //         document.addEventListener('contextmenu', function (e) {
    //             Bento.reload();
    //             e.preventDefault();
    //         }, false);
    //         // "1"
    //         document.addEventListener("keydown", function (e) {
    //             // console.log(e.keyCode, e)
    //             if (e.keyCode === 49) {
    //                 // 1: reload
    //                 window.devReload();
    //             }
    //             if (e.keyCode === 50) {
    //                 // 2: reload assets and then reload game
    //                 window.reloadAssets(window.devReload);
    //             }
    //             if (e.keyCode === 51) {
    //                 // 3: reload to title screen
    //                 window.devReload('screens/title');
    //             }
    //         });
    //     }
    // }
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        preventContextMenu: true,
        reload: {
            simple: 'mouseDown-right'
        }
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport()/*,
                tiled = Tiled({
                    name: 'level',
                    spawn: true
                })*/;
        Bento.screens.show('screen1');
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});
