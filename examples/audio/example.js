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
        canvasDimension: Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'webgl'
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = Entity({
                    addNow: true,
                    components: [Fill],
                    fill: {
                        color: 'rgba(0, 0, 0, 1)'
                    }
                }),
                gravityComponent = {
                    speed: 0,
                    update: function () {
                        var position = bunny.getPosition();
                        position.y += this.speed;
                        this.speed += 0.2;
                        if (position.y >= 120) {
                            position.y = 120;
                            bunny.animation.setAnimation('idle');
                        }
                    }
                },
                bunny = Entity({
                    components: [Sprite, Clickable],
                    position: Vector2(80, 120),
                    originRelative: Vector2(0.5, 1),
                    addNow: true,
                    animation: {
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
                    },
                    clickable: {
                        pointerDown: function (evt) {
                            if (bunny.getPosition().y >= 120) {
                                Bento.audio.playSound('sfx_jump');
                                bunny.animation.setAnimation('jump');
                                gravityComponent.speed = -5;
                            }
                        }
                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                    }
                }).attach(gravityComponent);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});