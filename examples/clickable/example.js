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
    'bento/tween',
    'clickbutton'
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
    Tween,
    ClickButton
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'auto'
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = new Entity({
                    addNow: true,
                    components: [new Fill({
                        color: [1, 1, 1, 1]
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
                            },
                        }),
                        new Clickable({
                            pointerDown: function (evt) {
                                console.log(this.isHovering);
                                /*Tween({
                                from: 16,
                                to: 160,
                                'in': 60,
                                ease: 'easeOutBounce',
                                do: function (v, t) {
                                    bunny1.setPositionY(v);
                                },
                                onComplete: function () {

                                }
                            });*/
                            },
                            pointerMove: function (evt) {
                                //console.log(evt.worldPosition.x);
                            },
                            holding: function () {
                                console.log('holding')
                            },
                            hovering: function () {
                                console.log('hovering')
                            }
                        })
                    ],
                    position: new Vector2(16, 16),
                    originRelative: new Vector2(0.5, 0.5),
                    init: function () {
                        this.getComponent('animation').setAnimation('idle');
                    }
                }),
                button = ClickButton({
                    image: Bento.assets.getImage('bunnygirlsmall'),
                    position: new Vector2(80, 80),
                    frameWidth: 32,
                    frameHeight: 32,
                    onClick: function () {
                        console.log('clicked')
                    }
                });
            Bento.objects.add(bunny1);
            Bento.objects.add(button);

            setTimeout(function () {
                Bento.objects.remove(bunny1);
            }, 2000);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});