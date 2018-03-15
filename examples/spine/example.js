bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/components/spine',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Sprite,
    Fill,
    Clickable,
    Spine,
    Tween
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
        // animations of spineboy
        var animationIndex = 0;
        var animations = ['idle', 'walk', 'run', 'shoot', 'hit', 'death'];
        var isHovering = false; // for checking the bounding box
        var drawBoundingBox = {
            draw: function (data) {
                var r = isHovering ? 0 : 1;
                var g = isHovering ? 1 : 0;
                var b = 0;
                data.renderer.fillRect([r, g, b, 0.5], spineBoy.dimension.x, spineBoy.dimension.y, spineBoy.dimension.width, spineBoy.dimension.height);
            }
        };
        // clicking on spineboy will change animation
        var clickable = new Clickable({
            onClick: function (data) {
                animationIndex += 1;
                animationIndex %= animations.length;
                spineComponent.setAnimation(animations[animationIndex]);
            },
            onHoverEnter: function () {
                isHovering = true;
            },
            onHoverLeave: function () {
                isHovering = false;
            }
        });
        // the spine component
        var spineComponent = new Spine({
            spine: 'spineboy',
            animation: 'idle',
            scale: 0.5,
            triangleRendering: false
        });
        // spineboy entity
        var spineBoy = new Entity({
            z: 0,
            name: 'spineBoy',
            position: new Vector2(320, 640),
            components: [
                spineComponent,
                clickable,
                // drawBoundingBox
            ]
        });
        Bento.objects.attach(spineBoy);


        // Experiment: triangle rendering
        /*var spineComponent2 = new Spine({
            spine: 'atlas2',
            animation: 'animation',
            scale: 1,
            triangleRendering: true
        });
        var orangeGirl = new Entity({
            z: 0,
            name: 'orangeGirl',
            position: new Vector2(320, 640),
            components: [
                spineComponent2
            ]
        });
        Bento.objects.attach(orangeGirl);*/
    };
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 640, 960),
        renderer: 'canvas2d',
        smoothing: false,
        pixelSize: 1
    }, function () {
        console.log('ready');
        Bento.assets.load('example', onShow, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});