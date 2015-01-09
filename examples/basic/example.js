rice.require([
    'rice/game',
    'rice/math/vector2',
    'rice/math/rectangle',
    'rice/base',
    'rice/components/sprite',
    'rice/components/translation',
    'rice/components/rotation',
    'rice/components/scale',
    'rice/components/fill'
], function (Game, Vector2, Rectangle, Base, Sprite, Translation, Rotation, Scale, Fill) {
    Game.init({
        canvasId: 'canvas',
        canvasDimension: Rectangle(0, 0, 320, 480),
        assetGroups: {
            'assets': 'assets/assets.json'
        }
    }, function () {
        console.log('ready');
        Game.Assets.load('assets', function (err) {
            var viewport = Game.getViewport(),
                background = Base({
                    components: [Fill]
                }),
                bunny1 = Base({
                    components: [Translation, Sprite],
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
                    init: function () {
                        this.sprite.setAnimation('idle');
                    }
                }),
                bunny2 = Base({
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
                bunny3 = Base({
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