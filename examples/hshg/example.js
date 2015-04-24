bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/translation',
    'bento/components/fill',
    'bento/components/clickable'
], function (Bento, Vector2, Rectangle, Entity, Sprite, Translation, Fill, Clickable) {
    var hash = window.location ? window.location.hash : '',
        renderer = 'auto',
        useHsgh = true;
    if (hash && hash === '#canvas2d') {
        renderer = 'canvas2d';
    } else if (hash && hash === '#webgl') {
        renderer = 'webgl';
    }
    if (hash && hash === '#brute') {
        useHsgh = false;
    }
    Bento.setup({
        canvasId: 'canvas',
        debug: true,
        canvasDimension: Rectangle(0, 0, 1024, 768),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: renderer,
        deltaT: true
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                bunnies = 0,
                renderer = Bento.getRenderer().name;
            background = Entity({
                components: [Fill, Clickable],
                clickable: {
                    pointerDown: function (evt) {
                        var i;
                        for (i = 0; i < 100; ++i) {
                            addBunny();
                        }
                        console.log(renderer)
                        console.log('Current bunnies:', bunnies);
                    }
                },
                fill: {
                    color: renderer === 'webgl' ? [0, 0, 0, 1] : [1, 1, 1, 1]
                }
            }),
            getRandom = function (val) {
                return Math.floor(Math.random() * val);
            },
            addBunny = function () {
                var entity = Entity({
                    components: [Sprite],
                    position: Vector2(getRandom(viewport.width), getRandom(viewport.height)),
                    originRelative: Vector2(0.5, 0.5),
                    family: ['bunny'],
                    sprite: {
                        image: Bento.assets.getImage('bunnygirlsmall'),
                        frameWidth: 32,
                        frameHeight: 32,
                        animations: {
                            'idle': {
                                speed: 0.1,
                                frames: [0, 10, 11, 12]
                            },
                            'collide': {
                                speed: 0.5,
                                frames: [2, 2]
                            }
                        },
                    },
                    useHsgh: useHsgh,
                    onCollide: function (other) {
                        //console.log('hshg');
                        entity.sprite.setAnimation('collide', function () {
                            entity.sprite.setAnimation('idle');
                        });

                    },
                    init: function () {
                        this.animation.setAnimation('idle');
                        this.setBoundingBox(Rectangle(-8, -16, 16, 16));
                    }
                }).attach({
                    speed: Vector2(getRandom(30) / 10 - getRandom(30) / 10, getRandom(30) / 10 - getRandom(30) / 10),
                    update: function () {
                        var self = this,
                            position = entity.getPosition();
                        position.y += this.speed.y;
                        position.x += this.speed.x;
                        this.speed.y += 0.05;

                        if (position.y > viewport.height) {
                            position.y = viewport.height;
                            this.speed.y = -getRandom(100) / 10;
                        }
                        if (position.x >= viewport.width) {
                            position.x = viewport.width;
                            this.speed.x *= -1;
                        }
                        if (position.x <= 0) {
                            position.x = 0;
                            this.speed.x *= -1;
                        }
                        // collision
                        if (!useHsgh) {
                            entity.collidesWithGroup(Bento.objects.getByFamily('bunny'), Vector2(0, 0), function (other) {
                                entity.sprite.setAnimation('collide', function () {
                                    entity.sprite.setAnimation('idle');
                                });
                                //console.log('brute')
                                // var otherPos = entity.getPosition(),
                                //     intersection = entity.getBoundingBox().intersection(other.getBoundingBox());

                                // if (position.x > otherPos.x) {
                                //     position.x += intersection.width  / 2;
                                //     otherPos.x -= intersection.width  / 2;
                                // } else {
                                //     position.x -= intersection.width  / 2;
                                //     otherPos.x += intersection.width  / 2;
                                //     console.log(intersection.width)
                                // }
                                // if (position.y > otherPos.y) {
                                //     position.y += intersection.height  / 2;
                                //     otherPos.y -= intersection.height  / 2;
                                // } else {
                                //     position.y -= intersection.height  / 2;
                                //     otherPos.y += intersection.height  / 2;
                                // }
                                // push eachother out
                                //self.speed.x *= -1;
                                //self.speed.y *= -1;
                            });
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
            }
            console.log('useHsgh', useHsgh);
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});