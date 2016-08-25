bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween',
    'clickbutton'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Tween,
    ClickButton
) {
    var onShow = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            z: -100,
            addNow: true,
            components: [new Fill({
                color: [1, 1, 1, 1]
            })]
        });
        // cursor test with getLocalPosition
        var cursor = new Entity({
            z: 10,
            name: 'cursor',
            position: new Vector2(0, 0),
            originRelative: new Vector2(0.5, 0.5),
            components: [
                new Sprite({
                    imageName: 'cursor'
                }),
                new Clickable({
                    pointerMove: function (evt) {
                        var localPos = cursor.getLocalPosition(evt.worldPosition);
                        cursor.position.x = localPos.x;
                        cursor.position.y = localPos.y;
                    }
                })
            ]
        });
        var button1;
        var button2;
        var button3;
        var button4;

        // Makes a bunny with its bounding box drawn
        // Click on a bunny to rotate it
        var makeButton = function () {
            var color = [1, 0, 0, 1],
                button = new ClickButton({
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
                        button.rotation += 0.02;
                    }
                });
            button.attach({
                name: 'drawAABB',
                draw: function (data) {
                    var box = button.getBoundingBox(),
                        position = button.position;
                    // draw AABB: need to unrotate the local rotation
                    data.renderer.rotate(-button.rotation);
                    data.renderer.strokeRect(color, box.x - position.x, box.y - position.y, box.width, box.height);
                    data.renderer.rotate(button.rotation);
                }
            });
            return button;
        };

        // setup buttons
        button1 = makeButton();
        button1.name = 'button1';
        button1.position = new Vector2(80, 80);
        button1.attach({
            update: function () {
                // test: cursor overlap should still be correct with scrolling
                if (Bento.input.isKeyDown('down')) {
                    viewport.y += 1;
                }

                if (Bento.input.isKeyDown('up')) {
                    viewport.y -= 1;
                }
            }
        });
        button2 = makeButton();
        button2.name = 'button2';
        button2.position = new Vector2(0, 32);

        button3 = makeButton();
        button3.name = 'button3';
        button3.position = new Vector2(32, 32);

        button1.attach(
            button2.attach(
                button3
            )
        );

        
        Bento.objects.add(button1);

        // floating button test 
        // button4 = makeButton();
        // button4.name = 'button4';
        // button4.position = new Vector2(32, 32);
        // button4.float = true;
        // Bento.objects.add(button4);

        // button3.attach(cursor);

    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 160, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'canvas2d',
        pixelSize: 3
    }, function () {
        console.log('ready');
        Bento.assets.load('assets', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});