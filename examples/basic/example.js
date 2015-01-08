rice.require([
    'rice/game',
    'rice/math/vector2',
    'rice/math/rectangle',
    'rice/base',
    'rice/components/sprite',
    'rice/components/fill'
], function (Game, Vector2, Rectangle, Base, Sprite, Fill) {
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
                bunnies = 0,
                background = Base({
                    components: [Fill]
                }).attach(),
                getRandom = function (val) {
                    return Math.floor(Math.random() * val);
                },
                addBunny = function () {
                    var base = Base({
                        components: [Sprite],
                        position: Vector2(0, 0),
                        originRelative: Vector2(0.5, 1),
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
                            console.log('object added');
                            this.sprite.setAnimation('idle');
                        }
                    }).attach({
                        speed: Vector2(0, 0),
                        update: function () {
                            return;
                            var position = base.getPosition();
                            position.y += this.speed.y;
                            position.x += this.speed.x;
                            this.speed.y += 0.1;

                            if (position.y > viewport.height) {
                                position.y = viewport.height;
                                this.speed.y *= -1;
                            }
                            if (position.y < 0) {
                                position.y = 0;
                                this.speed.y *= -1;
                            }
                            if (position.x > viewport.width) {
                                position.x = viewport.width;
                                this.speed.x *= -1;
                            }
                            if (position.x < 0) {
                                position.x = 0;
                                this.speed.x *= -1;
                            }
                        }
                    });
                    bunnies += 1;
                    Game.Objects.add(base);
                    return base;
                };
            Game.Objects.add(background);
            addBunny();

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});