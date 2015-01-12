rice.require([
    'rice/game',
    'rice/math/vector2',
    'rice/math/rectangle',
    'rice/entity',
    'rice/components/pixisprite',
    'rice/components/translation',
    'rice/components/fill',
    'rice/components/clickable'
], function (Game, Vector2, Rectangle, Entity, Sprite, Translation, Fill, Clickable) {
    Game.setup({
        canvasId: 'canvas',
        debug: true,
        canvasDimension: Rectangle(0, 0, 320, 480),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'pixi'
    }, function () {
        Game.Assets.load('assets', function (err) {
            var viewport = Game.getViewport(),
                bunnies = 0,
                background = Entity({
                    components: [Fill, Clickable],
                    clickable: {
                        pointerDown: function (evt) {
                            var i;
                            for (i = 0; i < 500; ++i) {
                                addBunny();
                            }
                            console.log('Current bunnies:', bunnies);
                        }
                    },
                }),
                getRandom = function (val) {
                    return Math.floor(Math.random() * val);
                },
                addBunny = function () {
                    var entity = Entity({
                        components: [Translation, Sprite],
                        position: Vector2(getRandom(320), getRandom(480)),
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
                        speed: Vector2(getRandom(30) / 10 - getRandom(30) / 10, getRandom(30) / 10 - getRandom(30) / 10),
                        update: function () {
                            var position = entity.getPosition();
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
                    Game.Objects.add(entity);
                    return entity;
                };
            Game.add(background);
            addBunny();
            window.add = function (val) {
                var i;
                val = val || 100;
                for (i = 0; i < val; ++i) {
                    addBunny();
                }
                // console.log('Current bunnies:', bunnies);
                return bunnies;
            }
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});