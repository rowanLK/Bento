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
                    z: -100,
                    addNow: true,
                    components: [new Fill({
                        color: [1, 1, 1, 1]
                    })]
                }),
                button1,
                button2,
                button3,
                button4,
                makeButton = function () {
                    var color = [1, 0, 0, 1],
                        button = ClickButton({
                            image: Bento.assets.getImage('bunnygirlsmall'),
                            position: new Vector2(0, 0),
                            originRelative: new Vector2(0.5, 0.5),
                            frameWidth: 32,
                            frameHeight: 32,
                            onClick: function () {
                                console.log('clicked');
                            },
                            onHoverEnter: function (evt) {
                                color = [0, 1, 0, 1];
                            },
                            onHoverLeave: function () {
                                color = [1, 0, 0, 1];
                            },
                            onHold: function (evt) {
                                rotationComponent.addAngleDegree(1);
                            }
                        }),
                        rotationComponent = button.getComponent('rotation');
                    button.attach({
                        draw: function (data) {
                            var box = button.getBoundingBox(),
                                position = button.position;
                            data.renderer.strokeRect(color, box.x - position.x, box.y - position.y, box.width, box.height);
                        }
                    });
                    return button;
                };

            button1 = makeButton();
            button1.name = 'button1';
            button1.position = new Vector2(80, 80);
            button1.attach({
                update: function () {
                    // if (Bento.input.isKeyDown('left')) {
                    //     button1.getComponent('rotation').addAngleDegree(1);
                    // }
                    // if (Bento.input.isKeyDown('right')) {
                    //     button1.getComponent('rotation').addAngleDegree(-1);
                    // }
                    // if (Bento.input.isKeyDown('down')) {
                    //     viewport.y += 1;
                    // }

                    // if (Bento.input.isKeyDown('up')) {
                    //     viewport.y -= 1;
                    // }
                }
            });
            button2 = makeButton();
            button2.name = 'button2';
            // button2.rotation.setAngleDegree(45);
            button2.position = new Vector2(0, 32);

            button3 = makeButton();
            button3.name = 'button3';
            button3.position = new Vector2(32, 32);

            button1.attach(
                button2.attach(
                    button3
                )
            );

            // floating button by setting a fake parent
            button4 = makeButton();
            button4.name = 'button4';
            button4.position = new Vector2(32, 32);
            button4.float = true;

            Bento.objects.add(button1);
            // Bento.objects.add(button4);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});