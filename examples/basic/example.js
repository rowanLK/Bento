rice.require([
    'rice/game',
    'rice/math/vector2',
    'rice/math/rectangle',
    'rice/entity',
    'rice/components/sprite',
    'rice/components/translation',
    'rice/components/rotation',
    'rice/components/scale',
    'rice/components/fill',
    'rice/components/clickable'
], function (Game, Vector2, Rectangle, Entity, Sprite, Translation, Rotation, Scale, Fill, Clickable) {
    Game.setup({
        canvasId: 'canvas',
        canvasDimension: Rectangle(0, 0, 320, 480),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'webgl'
    }, function () {
        console.log('ready');
        Game.Assets.load('assets', function (err) {
            var viewport = Game.getViewport(),
                background = Entity({
                    components: [Fill]
                }),
                bunny1 = Entity({
                    components: [Translation, Sprite, Clickable],
                    position: Vector2(16, 16),
                    originRelative: Vector2(0.5, 0.5),
                    sprite: {
                        image: Game.Assets.getImage('bunnygirlsmall'),
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
                            console.log(evt)
                        }
                    },
                    init: function () {
                        this.sprite.setAnimation('idle');
                    }
                }),
                bunny2 = Entity({
                    components: [Translation, Scale, Sprite],
                    position: Vector2(16 + 32, 16),
                    originRelative: Vector2(0.5, 0.5),
                    sprite: {
                        image: Game.Assets.getImage('bunnygirlsmall'),
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
                        this.sprite.setAnimation('idle');
                        this.scale.setScaleX(2);
                    }
                }),
                bunny3 = Entity({
                    components: [Translation, Rotation, Sprite],
                    position: Vector2(16 + 64, 16),
                    originRelative: Vector2(0.5, 0.5),
                    sprite: {
                        image: Game.Assets.getImage('bunnygirlsmall'),
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
                        this.sprite.setAnimation('idle');
                    }
                }).attach({
                    update: function () {
                        bunny3.rotation.addAngleDegree(1);
                    }
                });
            Game.Objects.add(background);
            Game.Objects.add(bunny1);
            Game.Objects.add(bunny2);
            Game.Objects.add(bunny3);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});