bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/tween',
    'bento/utils',
    'bento/components/fill',
    'bento/gui/text',
    'text'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Tween,
    Utils,
    Fill,
    Text,
    Text2
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        renderer: 'canvas2d'
    }, function () {
        Bento.assets.loadAllAssets({
            onComplete: function () {
                var background = new Entity({
                    components: [
                        new Fill({
                            color: [1, 1, 1, 1]
                        })
                    ]
                });

                var text = new Text({
                    z: 0,
                    position: new Vector2(32, 32),
                    text: 'Hello',
                    font: 'font',
                    fontSize: 16,
                    fontColor: '#000000',
                    align: 'left',
                    textBaseline: 'bottom',
                    ySpacing: 0
                });

                Bento.objects.attach(background);
                Bento.objects.attach(text);
            }
        });
    });
});