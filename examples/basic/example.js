bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/animation',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Animation,
    Translation,
    Rotation,
    Scale,
    Fill,
    Clickable,
    Tween
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'webgl'
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = Entity({
                    addNow: true,
                    components: [Fill],
                    fill: {
                        color: [1, 1, 1, 1]
                    }
                }),
                bunny1 = Entity({
                    components: [Translation, Animation, Clickable],
                    position: Vector2(16, 16),
                    originRelative: Vector2(0.5, 0.5),
                    animation: {
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
                        animations: {
                            'idle': {
                                speed: 0.1,
                                frames: [0, 10, 11, 12]
                            }
                        },
                    },
                    clickable: {
                        pointerDown: function (evt) {
                            console.log(evt);
                            Tween({
                                from: 16,
                                to: 160,
                                'in': 60,
                                ease: 'easeOutBounce',
                                do: function (v, t) {
                                    bunny1.setPositionY(v);
                                },
                                onComplete: function () {
                            
                                }
                            });
                        }
                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                    }
                }),
                bunny2 = Entity({
                    components: [Translation, Scale, Animation],
                    position: Vector2(16 + 32, 16),
                    originRelative: Vector2(0.5, 0.5),
                    animation: {
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
                        animations: {
                            'idle': {
                                speed: 0.1,
                                frames: [0, 10, 11, 12]
                            }
                        },
                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                        this.scale.setScaleX(2);
                    }
                }),
                bunny3 = Entity({
                    components: [Translation, Rotation, Animation],
                    position: Vector2(16 + 64, 16),
                    originRelative: Vector2(0.5, 0.5),
                    animation: {
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
                        animations: {
                            'idle': {
                                speed: 0.1,
                                frames: [0, 10, 11, 12]
                            }
                        },
                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                    }
                }).attach({
                    update: function () {
                        bunny3.rotation.addAngleDegree(1);
                    }
                }),
                bunny4 = Entity({
                    components: [Translation, Rotation, Scale, Animation],
                    position: Vector2(16 + 96, 16),
                    originRelative: Vector2(0.5, 0.5),
                    animation: {
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
                        animations: {
                            'idle': {
                                speed: 0.1,
                                frames: [0, 10, 11, 12]
                            }
                        },
                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                    }
                }).attach({
                    update: function () {
                        bunny4.rotation.addAngleDegree(1);
                        bunny4.scale.setScaleX(Math.sin(bunny4.timer / 10));
                    }
                });
            Bento.objects.add(bunny1);
            Bento.objects.add(bunny2);
            Bento.objects.add(bunny3);
            Bento.objects.add(bunny4);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});