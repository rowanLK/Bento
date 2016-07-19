/** 
 * TODO: provide a proper explanation of whats going on here!
 */
bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/tween',
    'bento/utils',
    'bento/canvas',
    'bunny'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Tween,
    Utils,
    Canvas,
    Bunny
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 320, 240),
        assetGroups: {
            'assets': 'assets/assets.json'
        }
    }, function () {
        Bento.assets.load('assets', function (err) {
            console.log('ready')
            var viewport = Bento.getViewport(),
                background = new Entity({
                    addNow: true,
                    components: [new Fill({
                        color: [1, 1, 1, 1]
                    })]
                }),
                canvasEntity1 = new Canvas({
                    z: 1,
                    name: 'canvas1',
                    position: new Vector2(viewport.width / 2, viewport.height / 3),
                    originRelative: new Vector2(0.5, 0.5),
                    width: 64,
                    height: 64
                }),
                bunny1 = new Bunny(),
                canvasEntity2 = new Canvas({
                    z: 1,
                    name: 'canvas2',
                    position: new Vector2(viewport.width / 2, viewport.height * 2 / 3),
                    originRelative: new Vector2(0.5, 0.5),
                    width: 64,
                    height: 64
                }),
                triangle = new Entity({
                    name: 'triangle',
                    originRelative: new Vector2(1, 1),
                    components: [
                        new Sprite({
                            imageName: 'triangle'
                        }), {
                            update: function (data) {
                                triangle.rotation += 0.1;
                            }
                        }
                    ]
                }),
                bunny2 = new Bunny();

            // ==== example 1 ======
            // fill canvas with white
            // canvasEntity1.attach({
            //     draw: function (data) {
            //         data.renderer.fillRect([1, 1, 1, 1], -32, -32, 64, 64);
            //     }
            // });
            // rotate the bunny around its center!
            bunny1.attach({
                update: function () {
                    bunny1.position.x = 32 * Math.cos(bunny1.timer / 20);
                    bunny1.position.y = 32 * Math.sin(bunny1.timer / 20);
                }
            });

            canvasEntity1.attach(bunny1);
            Bento.objects.attach(canvasEntity1);

            // ==== example 2 ======
            // draw bunny first
            canvasEntity2.attach(bunny2);
            // draw only inside triangle by using destination-in
            canvasEntity2.attach({
                draw: function () {
                    canvasEntity2.getContext().globalCompositeOperation = 'destination-in';
                }
            });
            // draw the triangle
            canvasEntity2.attach(triangle);
            // reset globalcompositeoperation
            canvasEntity2.attach({
                draw: function () {
                    canvasEntity2.getContext().globalCompositeOperation = 'source-over';
                }
            });

            Bento.objects.attach(canvasEntity2);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});