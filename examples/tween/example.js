bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
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
            z: 1,
            position: new Vector2(0, 0),
            text: 'Click anywhere on the screen!',
            font: 'Arial',
            fontSize: 12,
            fontColor: '#ffffff',
            align: 'left',
            textBaseline: 'top'
        });
        // bunny factory
        var bunnyCount = 0;
        var makeBunny = function () {
            var entity = new Entity({
                z: 1,
                name: 'bunny',
                position: new Vector2(32, 48 + bunnyCount * 32),
                originRelative: new Vector2(0.5, 0.5),
                components: [
                    new Sprite({
                        imageName: 'bunnygirlsmall'
                    })
                ]
            });
            bunnyCount += 1;
            Bento.objects.attach(entity);
            return entity;
        };
        // make some bunnies
        var bunny1 = makeBunny();
        var bunny2 = makeBunny();
        var bunny3 = makeBunny();
        var bunny4 = makeBunny();
        var bunny5 = makeBunny();

        // this function defines tweens for the 5 bunnies
        var startTweens = function (xPos) {
            // bunny 1: simple linear tween
            new Tween({
                from: bunny1.position.x,
                to: xPos,
                'in': 60,
                ease: Tween.LINEAR,
                onUpdate: function (v, t) {
                    bunny1.position.x = v;
                }
            });
            // bunny 2: quadratic
            new Tween({
                from: bunny2.position.x,
                to: xPos,
                'in': 60,
                ease: Tween.QUADRATIC,
                onUpdate: function (v, t) {
                    bunny2.position.x = v;
                }
            });
            // bunny 3: use any from easings.net
            new Tween({
                from: bunny3.position.x,
                to: xPos,
                'in': 60,
                ease: Tween.EASEOUTBOUNCE,
                onUpdate: function (v, t) {
                    bunny3.position.x = v;
                }
            });
            // bunny 4: example with starting a 2nd tween during onComplete
            new Tween({
                from: bunny4.position.x,
                to: xPos, // go to middle 
                'in': 60,
                ease: Tween.EASEOUTBACK,
                onUpdate: function (v, t) {
                    bunny4.position.x = v;
                },
                onComplete: function () {
                    // start rotation tween
                    new Tween({
                        from: 0,
                        to: Math.PI * 2,
                        'in': 60,
                        ease: Tween.EASEOUTBACK,
                        onUpdate: function (v, t) {
                            bunny4.rotation = v;
                        },
                        onComplete: function () {
                            bunny4.rotation = 0;
                        }
                    });
                }
            });

            // bunny 5: delayed tween
            new Tween({
                delay: 30,
                from: bunny5.position.x,
                to: xPos,
                'in': 30,
                ease: Tween.LINEAR,
                onUpdate: function (v, t) {
                    bunny5.position.x = v;
                }
            });
        };

        // something that checks for a click
        var clicker = new Entity({
            z: 0,
            name: 'clicker',
            components: [
                new Clickable({
                    pointerDown: function (data) {
                        var x = data.worldPosition.x;
                        // start tweens for bunnies!
                        startTweens(x);
                    }
                })
            ]
        });

        // add those things to the game, bunnies are added during makeBunny
        Bento.objects.attach(background);
        Bento.objects.attach(text);
        Bento.objects.attach(clicker);
    };

    // setup game
    Bento.setup({
        canvasId: "canvas",
        pixelSize: 4,
        canvasDimension: new Rectangle(0, 0, 160, 240),
        onComplete: loadAssets
    });
});