bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/translation',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/utils'
], function (Bento, Vector2, Rectangle, Entity, Sprite, Translation, Fill, Clickable, Utils) {
    var hash = window.location ? window.location.hash : '',
        renderer = 'auto',
        getRandom = function (val) {
            return Math.floor(Math.random() * val);
        },
        BunnyBehavior = function () {
            this.speed = new Vector2(getRandom(50) / 10, getRandom(30) / 10);
        };
    if (hash && hash === '#canvas2d') {
        renderer = 'canvas2d';
    } else if (hash && hash === '#webgl') {
        renderer = 'webgl';
    }
    BunnyBehavior.prototype.update = function (data) {
        var position = data.entity.position;
        var viewport = Bento.getViewport();
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
    };
    Bento.setup({
        canvasId: 'canvas',
        debug: true,
        canvasDimension: new Rectangle(0, 0, 640, 960),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: renderer,
        smoothing: true,
        deltaT: true,
        sortMode: Utils.SortMode.ALWAYS
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                bunnies = 0,
                renderer = Bento.getRenderer().name,
                pointerDown = false,
                background = new Entity({
                    components: [
                        new Fill({
                            color: renderer === 'webgl' ? [0, 0, 0, 1] : [1, 1, 1, 1]
                        }), new Clickable({
                            pointerDown: function (evt) {
                                pointerDown = true;
                            },
                            pointerUp: function () {
                                pointerDown = false;
                                console.log('Current bunnies: ' + bunnies);
                            }
                        })
                    ]
                }).attach({
                    update: function () {
                        if (pointerDown) {
                            window.add(10);
                        }
                    }
                });
            Bento.add(background);

            window.add = function (val) {
                var i;
                val = val || 100;
                for (i = 0; i < val; ++i) {
                    new Entity({
                        z: bunnies,
                        addNow: true,
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
                        position: new Vector2(8, 8),
                        originRelative: new Vector2(0.5, 0.5),
                        init: function () {
                            // this.pixi.setAnimation('idle');
                        }
                    }).attach(new BunnyBehavior());
                    bunnies += 1;
                }
                // console.log('Current bunnies:', bunnies);
                return bunnies;
            }
        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});