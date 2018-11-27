/** 
 * TODO: provide a proper explanation of whats going on here!
 */
bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/clickable',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/tween',
    'bento/utils',
    'bento/canvas',
    'bento/maskedcontainer',
    'bunny'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Clickable,
    Sprite,
    Fill,
    Tween,
    Utils,
    Canvas,
    MaskedContainer,
    Bunny
) {
    var loadAssets = function () {
        Bento.assets.loadAllAssets({
            onComplete: onLoaded
        });
    };
    var onLoaded = function (err) {
        var viewport = Bento.getViewport();
        var background = new Entity({
            name: 'background',
            addNow: true,
            components: [new Fill({
                color: [1, 1, 1, 1]
            })]
        });
        var canvasEntity1 = new Canvas({
            z: 1,
            name: 'canvas1',
            position: new Vector2(viewport.width / 2, viewport.height / 3),
            originRelative: new Vector2(0.5, 0.5),
            width: 64,
            height: 64
        });
        var bunny1 = new Bunny();
        var canvasEntity2 = new Canvas({
            z: 1,
            name: 'canvas2',
            position: new Vector2(viewport.width / 2, viewport.height * 2 / 3),
            originRelative: new Vector2(0.5, 0.5),
            width: 64,
            height: 64
        });
        var triangle = new Entity({
            name: 'triangle',
            components: [
                new Sprite({
                    originRelative: new Vector2(1, 1),
                    imageName: 'triangle'
                }), {
                    update: function (data) {
                        triangle.rotation += 0.1;
                    }
                }
            ]
        });
        var bunny2 = new Bunny();

        // ==== example 1 ======
        // fill canvas with white
        // canvasEntity1.attach({
        //     draw: function (data) {
        //         data.renderer.fillRect([1, 1, 1, 1], -32, -32, 64, 64);
        //     }
        // });
        // rotate the bunny around its center!
        bunny1.attach({
            name: 'rotateBehavior',
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
            name: 'preDrawBehavior',
            draw: function () {
                canvasEntity2.getContext().globalCompositeOperation = 'destination-in';
            }
        });
        // draw the triangle
        canvasEntity2.attach(triangle);
        // reset globalcompositeoperation
        canvasEntity2.attach({
            name: 'postDrawBehavior',
            draw: function () {
                canvasEntity2.getContext().globalCompositeOperation = 'source-over';
            }
        });

        Bento.objects.attach(canvasEntity2);

        // ==== example 3 ======
        // using MaskedContainer
        /*var bunny3 = new Bunny().attach(new Clickable({
            pointerDown: function () {
                // bunny3.scale.x -= 0.1;
                // bunny3.scale.y -= 0.1;

                // maskedContainer.scale.x += 0.2;
                // maskedContainer.scale.y += 0.2;

                // bunny3.rotation += 0.1;

                // TODO: rotation is supposed to work
                // maskedContainer.rotation += 0.1;
            },
            pointerMove: function (data) {
                bunny3.position = bunny3.toComparablePosition(data.worldPosition);
            },
        }));
        var maskedContainer = new MaskedContainer({
            z: 0,
            name: 'maskedContainer',
            position: new Vector2(viewport.width / 2, viewport.height / 3),
            boundingBox: new Rectangle(-32, -32, 64, 64),
            components: [ //
                {
                    name: 'fillRect',
                    draw: function (data) {
                        data.renderer.fillRect([1, 0, 0, 1], -32, -32, 64, 64);
                    }
                },
                bunny3
            ]
        });
        Bento.objects.attach(maskedContainer);*/
    };
    Bento.setup({
        canvasId: 'canvas',
        antiAlias: false,
        canvasDimension: new Rectangle(0, 0, 320, 240),
        onComplete: loadAssets
    });
});