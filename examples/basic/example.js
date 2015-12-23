bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Utils
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 320, 240)
    }, function () {
        // declare your variables
        var viewport = Bento.getViewport(),
            background = new Entity({
                components: [
                    new Fill({
                        color: [1, 1, 1, 1]
                    })
                ]
            }),
            bunnySprite = new Sprite({
                // loading images directly from URL is not recommended actually
                // you should preload using Bento.assets.load()
                imageFromUrl: './bunnygirl.png'
            }),
            bunny = new Entity({
                name: 'bunny',
                components: [
                    bunnySprite
                ]
            });

        // attach the background
        Bento.objects.attach(background);

        // set bunnygirl position
        bunny.position.x = viewport.width / 2 - 16;

        // attach a new behavior: dropping and bouncing when hits the bottom
        bunny.attach({
            speedY: 0,
            update: function (data) {
                // accelerate speed with gravity
                this.speedY += 0.1;

                // drop
                bunny.position.y += this.speedY;

                // bounce
                if (bunny.position.y > viewport.height - 32) {
                    this.speedY = -5;
                }
            }
        });

        // attach to game
        Bento.objects.attach(bunny);
    });
});