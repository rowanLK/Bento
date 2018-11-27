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
            name: 'background',
            components: [new Fill({
                color: [0, 0, 0, 1]
            })]
        });
        var text = new Text({
            z: 1,
            position: new Vector2(0, 0),
            text: 'Current Pause Level: 0',
            font: 'Arial',
            fontSize: 12,
            fontColor: '#ffffff',
            align: 'left',
            textBaseline: 'top'
        });
        // bunny factory
        var bunnyCount = 0;
        var makeBunny = function () {
            // unique id for each bunny
            var bunnyId = bunnyCount;
            // behavior for moving
            var moveBehavior = {
                name: 'moveBehavior',
                update: function () {
                    entity.position.x = viewport.width / 2 + 48 * Math.sin(timerComponent.time / 20 + bunnyId * 0.5);
                }
            };
            // bunny sprite
            var sprite = new Sprite({
                imageName: 'bunnygirlsmall',
                originRelative: new Vector2(0.5, 0.5),
                frameCountX: 4,
                frameCountY: 4,
                animations: {
                    default: {
                        speed: 0.1,
                        frames: [0, 10, 11, 12]
                    }
                }
            });
            // the entity
            var entity = new Entity({
                z: 1,
                name: 'bunny',
                position: new Vector2(viewport.width / 2, 48 + bunnyId * 32),
                updateWhenPaused: bunnyId, // every bunny has a higher pause level
                components: [
                    sprite,
                    moveBehavior
                ]
            });
            bunnyCount += 1;
            Bento.objects.attach(entity);
            return entity;
        };
        // make some bunnies with different pauselevels
        Utils.repeat(makeBunny, 6);

        // something that checks for a click and keeps track of time
        var timerComponent = {
            time: 0,
            name: 'timerBehavior',
            update: function () {
                this.time += 1;
            }
        };
        var currentPauseLevel = 0;
        var clickable = new Clickable({
            pointerDown: function (data) {
                // increase pause level on every click
                currentPauseLevel += 1;
                Bento.objects.pause(currentPauseLevel);

                // reset
                if (currentPauseLevel > bunnyCount) {
                    currentPauseLevel = 0;
                    Bento.objects.resume();
                }

                // update text
                text.setText('Current Pause Level: ' + currentPauseLevel);
            }
        });
        var clicker = new Entity({
            z: 0,
            name: 'clicker',
            updateWhenPaused: Infinity,
            components: [
                timerComponent,
                clickable
            ]
        });

        // add those things to the game, bunnies are added during makeBunny
        Bento.objects.attach(background);
        Bento.objects.attach(text);
        Bento.objects.attach(clicker);
    };

    // setup game
    Bento.setup({
        canvasId: 'canvas',
        pixelSize: 4,
        antiAlias: false,
        canvasDimension: new Rectangle(0, 0, 160, 240),
        onComplete: loadAssets
    });
});