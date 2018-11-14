bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/gui/clickbutton',
    'bento/gui/text',
    'bento/tween',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    ClickButton,
    Text,
    Tween,
    Utils
) {
    // load all assets
    var loadAssets = function () {
        Bento.assets.loadAllAssets({
            onComplete: onLoaded
        });
    };
    // asset loading completed: setup game
    var onLoaded = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            components: [new Fill({
                color: [0, 0, 0, 1]
            })]
        });
        var text = new Text({
            z: 2,
            position: new Vector2(0, 0),
            text: 'Different methods of selection. If possible, cache your results, selecting entities can be expensive.',
            font: 'font',
            fontSize: 16,
            fontColor: '#ffffff',
            ySpacing: -4,
            align: 'left',
            textBaseline: 'top',
            maxWidth: viewport.width
        });
        // use getByFamily
        var buttonRed = new ClickButton({
            z: 1,
            name: 'buttonRed',
            imageName: 'buttonred',
            frameCountX: 1,
            frameCountY: 2,
            position: new Vector2(viewport.width / 2 - 52, viewport.height - 24),
            onClick: function () {
                // Select red entities by family
                Bento.objects.getByFamily('red', function (entities) {
                    // entities is an array, you can loop through it or use Utils.forEach like this
                    Utils.forEach(entities, function (entity, i, l, breakLoop) {
                        // toggle visibility
                        entity.visible = !entity.visible;
                    });
                });
            }
        });
        // use getByName
        var buttonBlue = new ClickButton({
            z: 1,
            name: 'buttonBlue',
            imageName: 'buttonblue',
            frameCountX: 1,
            frameCountY: 2,
            position: new Vector2(viewport.width / 2, viewport.height - 24),
            onClick: function () {
                // select blue entities by their name
                // slower than getByFamily, it's better to prepare for using families
                Bento.objects.getByName('blue', function (entities) {
                    // entities is an array, you can loop through it or use Utils.forEach like this
                    Utils.forEach(entities, function (entity, i, l, breakLoop) {
                        // toggle visibility
                        entity.visible = !entity.visible;
                    });
                });
            }
        });
        // use get
        var buttonGreen = new ClickButton({
            z: 1,
            name: 'buttonGreen',
            imageName: 'buttongreen',
            frameCountX: 1,
            frameCountY: 2,
            position: new Vector2(viewport.width / 2 + 52, viewport.height - 24),
            onClick: function () {
                // select the first green entity it can find by name, the rest is ignored
                Bento.objects.get('green', function (greenEntity) {
                    greenEntity.visible = !greenEntity.visible;
                });
            }
        });
        // make colored balls
        var makeRed = function () {
            var entity = new Entity({
                z: 1,
                name: 'red',
                family: ['red'],
                position: new Vector2(Utils.getRandom(viewport.width), Utils.getRandom(viewport.height - 48)),
                components: [
                    new Sprite({
                        originRelative: new Vector2(0.5, 0.5),
                        imageName: 'ballred'
                    })
                ]
            });
            Bento.objects.attach(entity);
        };
        var makeGreen = function () {
            var entity = new Entity({
                z: 1,
                name: 'green',
                family: ['green'],
                position: new Vector2(Utils.getRandom(viewport.width), Utils.getRandom(viewport.height - 48)),
                components: [
                    new Sprite({
                        originRelative: new Vector2(0.5, 0.5),
                        imageName: 'ballgreen'
                    })
                ]
            });
            Bento.objects.attach(entity);
        };
        var makeBlue = function () {
            var entity = new Entity({
                z: 1,
                name: 'blue',
                family: ['blue'],
                position: new Vector2(Utils.getRandom(viewport.width), Utils.getRandom(viewport.height - 48)),
                components: [
                    new Sprite({
                        originRelative: new Vector2(0.5, 0.5),
                        imageName: 'ballblue'
                    })
                ]
            });
            Bento.objects.attach(entity);
        };
        Utils.repeat(10, makeRed);
        Utils.repeat(10, makeGreen);
        Utils.repeat(10, makeBlue);

        // attach the other stuff
        Bento.objects.attach(background);
        Bento.objects.attach(buttonRed);
        Bento.objects.attach(buttonBlue);
        Bento.objects.attach(buttonGreen);
    };

    // setup game
    Bento.setup({
        canvasId: "canvas",
        antiAlias: false,
        pixelSize: 4,
        canvasDimension: new Rectangle(0, 0, 160, 240),
        onComplete: loadAssets
    });
});