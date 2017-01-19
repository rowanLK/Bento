bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'bento/gui/clickbutton'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Tween,
    ClickButton
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
        var makeButton = function (settings) {
            var button = new ClickButton({
                z: settings.z,
                name: settings.name || 'button',
                imageName: 'buttonplay',
                frameCountX: 1,
                frameCountY: 2,
                position: settings.position,
                onClick: settings.onClick,
                sort: true
            });
            if (settings.addNow) {
                Bento.objects.attach(button);
            }
            return button;
        };
        // the order of button creation shouldn't matter!
        // whichever button is visually on top is the one that should be clicked
        var button0 = makeButton({
            z: 0,
            name: 'button0',
            position: new Vector2(viewport.width / 2, 64),
            addNow: true
        });
        var button2 = makeButton({
            z: 2,
            name: 'button2',
            position: new Vector2(viewport.width / 2, 64 + 16),
            addNow: true
        });
        var button1 = makeButton({
            z: 1,
            name: 'button1',
            position: new Vector2(viewport.width / 2, 64 + 8),
            addNow: true
        });

        // extra button: change z order
        var button3 = makeButton({
            z: 2,
            name: 'buttonChangeZ',
            position: new Vector2(viewport.width / 2, 64 + 64),
            addNow: true,
            onClick: function () {
                // make button1 the highest z
                button1.z = 3;
            }
        });

        // should also work with scenegraphs
        var container = new Entity({
            z: 1,
            name: 'container',
            position: new Vector2(viewport.width / 2, 64 + 100),
            components: [
                makeButton({
                    name: 'buttonAttached0',
                    position: new Vector2(0, 8)
                }),
                makeButton({
                    name: 'buttonAttached1',
                    position: new Vector2(-8, 16)
                }).attach(makeButton({
                    name: 'buttonAttached1-1',
                    position: new Vector2(16, 0)
                })),
                makeButton({
                    name: 'buttonAttached2',
                    position: new Vector2(0, 24)
                })
            ]
        });
        Bento.objects.attach(container);
    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'canvas2d',
        pixelSize: 3
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});