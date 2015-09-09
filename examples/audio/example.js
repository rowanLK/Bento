bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'webgl'
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = new Entity({
                    addNow: true,
                    components: [new Fill({
                        color: [0, 0, 0, 1]
                    })]
                }),
                gravityComponent = {
                    speed: 0,
                    update: function () {
                        var position = bunny.position;
                        position.y += this.speed;
                        this.speed += 0.2;
                        if (position.y >= 120) {
                            position.y = 120;
                            bunny.getComponent('animation').setAnimation('idle');
                        }
                    }
                },
                bunny = new Entity({
                    components: [new Sprite({
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
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
                    }), new Clickable({
                        pointerDown: function (evt) {
                            if (bunny.position.y >= 120) {
                                Bento.audio.playSound('sfx_jump');
                                bunny.getComponent('animation').setAnimation('jump');
                                gravityComponent.speed = -5;
                            }
                        }
                    })],
                    position: new Vector2(80, 120),
                    originRelative: new Vector2(0.5, 1),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                    }
                });
            bunny.attach(gravityComponent);
            Bento.objects.attach(bunny);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});