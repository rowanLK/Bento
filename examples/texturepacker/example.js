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
    'bento/components/clickable'
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
        console.log('ready');
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = new Entity({
                    addNow: true,
                    components: [new Fill({
                        color: [0, 0, 0, 1]
                    })]
                }),
                bunny1 = new Entity({
                    components: [
                        new Translation(),
                        new Animation({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            frameWidth: 32,
                            frameHeight: 32,
                            animations: {
                                'idle': {
                                    speed: 0.1,
                                    frames: [0, 10, 11, 12]
                                }
                            }
                        }),
                        new Clickable({
                            pointerDown: function (evt) {
                                console.log(evt)
                            }
                        })
                    ],
                    position: new Vector2(16, 16),
                    originRelative: new Vector2(0.5, 0.5),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                    }
                }),
                bunny2 = new Entity({
                    components: [
                        new Translation(),
                        new Scale(),
                        new Animation({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            frameWidth: 32,
                            frameHeight: 32,
                            animations: {
                                'idle': {
                                    speed: 0.1,
                                    frames: [0, 10, 11, 12]
                                }
                            }
                        })
                    ],
                    position: new Vector2(16 + 32, 16),
                    originRelative: new Vector2(0.5, 0.5),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                        this.scale.x = 2;
                    }
                }),
                bunny3 = new Entity({
                    components: [
                        new Translation(),
                        new Rotation(),
                        new Animation({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            frameWidth: 32,
                            frameHeight: 32,
                            animations: {
                                'idle': {
                                    speed: 0.1,
                                    frames: [0, 10, 11, 12]
                                }
                            }
                        })
                    ],
                    position: new Vector2(16 + 64, 16),
                    originRelative: new Vector2(0.5, 0.5),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                    }
                }).attach({
                    update: function () {
                        bunny3.getComponent('rotation').addAngleDegree(1);
                    }
                }),
                bunny4 = new Entity({
                    components: [
                        new Translation(),
                        new Rotation(),
                        new Scale(),
                        new Animation({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            frameWidth: 32,
                            frameHeight: 32,
                            animations: {
                                'idle': {
                                    speed: 0.1,
                                    frames: [0, 10, 11, 12]
                                }
                            }
                        })
                    ],
                    position: new Vector2(16 + 96, 16),
                    originRelative: new Vector2(0.5, 0.5),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                    }
                }).attach({
                    update: function () {
                        bunny4.getComponent('rotation').addAngleDegree(1);
                        bunny4.scale.x = Math.sin(bunny4.timer / 10);
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