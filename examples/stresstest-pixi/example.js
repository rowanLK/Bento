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
        renderer = 'pixi';

    Bento.setup({
        canvasId: 'canvas',
        debug: true,
        canvasDimension: new Rectangle(0, 0, 640, 960),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: renderer,
        deltaT: true
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                bunnies = 0,
                renderer = Bento.getRenderer().name,
                background = new Entity({
                    components: [new Clickable({
                        pointerDown: function (evt) {
                            var i;
                            for (i = 0; i < 100; ++i) {
                                addBunny();
                            }
                            console.log(renderer)
                            console.log('Current bunnies:', bunnies);
                        }
                    })]
                }),
                getRandom = function (val) {
                    return Math.floor(Math.random() * val);
                },
                addBunny = function () {
                    var entity = new Entity({
                        components: [new Sprite({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            frameWidth: 32,
                            frameHeight: 32,
                            animations: {
                                'idle': {
                                    speed: 0.1,
                                    frames: [0, 10, 11, 12]
                                }
                            },
                        })],
                        position: new Vector2(getRandom(viewport.width), getRandom(viewport.height)),
                        originRelative: new Vector2(0.5, 0.5),
                        init: function () {
                            // this.pixi.setAnimation('idle');
                        }
                    }).attach({
                        speed: new Vector2(getRandom(30) / 10 - getRandom(30) / 10, getRandom(30) / 10 - getRandom(30) / 10),
                        update: function () {
                            var position = entity.position;
                            position.y += this.speed.y;
                            position.x += this.speed.x;
                            this.speed.y += 0.1;

                            if (position.y > viewport.height) {
                                position.y = viewport.height;
                                this.speed.y = -getRandom(140) / 10;
                            }
                            if (position.x >= viewport.width) {
                                position.x = viewport.width;
                                this.speed.x *= -1;
                            }
                            if (position.x <= 0) {
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
            }
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});