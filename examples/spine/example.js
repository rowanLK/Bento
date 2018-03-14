bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/components/spine',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Spine,
    Tween
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
        var spineComponent = new Spine({
            spine: 'spineboy',
            animation: 'idle'
        });
        var spineBoy = new Entity({
            z: 0,
            name: 'spineBoy',
            position: new Vector2(160, 240),
            components: [
                spineComponent
            ]
        });
        Bento.objects.attach(spineBoy);

    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 320, 480),
        renderer: 'canvas2d',
        pixelSize: 3
    }, function () {
        console.log('ready');
        Bento.assets.load('example', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});