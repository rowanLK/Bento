bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'bento/gui/clickbutton',
    'bento/gui/text'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Tween,
    ClickButton,
    Text
) {
    var onLoaded = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            z: 0,
            name: 'background',
            components: [
                new Fill({
                    color: [1, 1, 1, 1]
                })
            ]
        });
        var text1 = new Text({
            z: 1,
            position: new Vector2(viewport.width / 2, viewport.height / 3 - 48),
            text: 'Click to move',
            font: 'font',
            fontSize: 16,
            fontColor: '#000000',
            align: 'center'
        });
        var text2 = new Text({
            z: 1,
            position: new Vector2(viewport.width / 2, viewport.height * 2 / 3 - 36),
            text: 'Click to reset',
            font: 'font',
            fontSize: 16,
            fontColor: '#000000',
            align: 'center'
        });
        // an entity with a clickable component attached
        var triangle = new Entity({
            z: 1,
            name: 'triangle',
            position: new Vector2(viewport.width / 2, viewport.height / 3),
            components: [
                new Sprite({
                    originRelative: new Vector2(0.5, 0.5),
                    imageName: 'buttonr'
                }),
                new Clickable({
                    onClick: function () {
                        triangle.position.x += 8;
                    }
                })
            ]
        });
        // a full implementation of entity + clickable to make a standard click button
        // check the source to see how it works
        var buttonPlay = new ClickButton({
            z: 1,
            name: 'play',
            imageName: 'buttonplay',
            frameCountX: 1,
            frameCountY: 2,
            position: new Vector2(viewport.width / 2, viewport.height * 2 / 3),
            onClick: function () {
                triangle.position.x = viewport.width / 2;
            }
        });

        Bento.objects.attach(background);
        Bento.objects.attach(triangle);
        Bento.objects.attach(buttonPlay);
        Bento.objects.attach(text1);
        Bento.objects.attach(text2);
    };

    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        pixelSize: 3,
        antiAlias: false,
        onComplete: function () {
            // load all assets and start game afterwards
            Bento.assets.loadAllAssets({
                onComplete: onLoaded
            });
        }
    });
});