bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/gui/text'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Text
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
        var text = new Text({
            z: 1,
            position: new Vector2(viewport.width / 2, viewport.height / 2),
            text: 'Click or tap!',
            font: 'font',
            fontSize: 16,
            fontColor: '#ffffff',
            align: 'center',
            sharpness: 3
        });
        var background = new Entity({
            name: 'background',
            components: [new Fill({
                color: [0, 0, 0, 1]
            })]
        });
        var behavior = new Object({
            name: 'behavior',
            speed: 0,
            start: function () {
                sprite.setAnimation('idle');
            },
            update: function () {
                var position = bunny.position;
                position.y += this.speed;
                this.speed += 0.2;
                if (position.y >= 120) {
                    position.y = 120;
                    sprite.setAnimation('idle');
                }
            }
        });
        var sprite = new Sprite({
            image: Bento.assets.getImage('bunnygirlsmall'),
            frameWidth: 32,
            frameHeight: 32,
            originRelative: new Vector2(0.5, 1),
            animations: {
                'idle': {
                    speed: 0.1,
                    frames: [0, 10, 11, 12]
                },
                'jump': {
                    speed: 0.1,
                    frames: [1]
                }
            },
        });
        var clickable = new Clickable({
            pointerDown: function (evt) {
                if (bunny.position.y >= 120) {
                    Bento.audio.playSound('sfx_jump');
                    sprite.setAnimation('jump');
                    behavior.speed = -5;
                }
            }
        });
        var bunny = new Entity({
            name: 'bunny',
            position: new Vector2(80, 120),
            components: [
                sprite,
                clickable,
                behavior
            ]
        });

        Bento.objects.attach(background);
        Bento.objects.attach(bunny);
        Bento.objects.attach(text);

        // play music
        Bento.audio.playMusic('bgm_oldbrokenradio');

    };

    // setup game
    Bento.setup({
        canvasId: "canvas",
        antiAlias: false,
        pixelSize: 3,
        canvasDimension: new Rectangle(0, 0, 160, 240),
        onComplete: loadAssets
    });
});