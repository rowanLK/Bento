bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/pixisprite',
    'bento/components/translation',
    'bento/components/fill',
    'bento/components/clickable'
], function (Bento, Vector2, Rectangle, Entity, Animation, Translation, Fill, Clickable) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: Rectangle(0, 0, 320, 480),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'pixi',
        debug: true
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                bunnies = 0,
                background = Entity({
                    components: [Fill, Clickable],
                    clickable: {
                        pointerDown: function (evt) {
                            var i;
                            for (i = 0; i < 100; ++i) {
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
                        components: [Translation, Animation],
                        position: Vector2(getRandom(320), getRandom(480)),
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
                    Bento.objects.add(entity);
                    return entity;
                };
            Bento.add(background);
            addBunny();
            window.add = function (val) {
                var i;
                val = val || 100;
                for (i = 0; i < val; ++i) {
                    addBunny();
                }
                // console.log('Current bunnies:', bunnies);
                return bunnies;
            };
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});