bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/polygon',
    'bento/entity',
    'bento/components/animation',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/fill',
    'bento/components/clickable',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Polygon,
    Entity,
    Animation,
    Translation,
    Rotation,
    Scale,
    Fill,
    Clickable,
    Tween
) {
    Bento.setup({
        canvasId: 'canvas',
        canvasDimension: new Rectangle(0, 0, 600, 600),
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        renderer: 'canvas2d'
    }, function () {
        Bento.assets.load('assets', function (err) {
            var viewport = Bento.getViewport(),
                background = new Entity({
                    addNow: true,
                    components: [new Fill({
                        color: [1, 1, 1, 1]
                    })]
                }),
                polygon,
                polygonOther,
                pts = [],
                colliding = false,
                set = function () {
                    // move polygon with the object
                    var pos = object.position,
                        points = [];
                    //
                    points.push(new Vector2(pos.x, pos.y));
                    points.push(new Vector2(pos.x + 32, pos.y + 32));
                    points.push(new Vector2(pos.x + 8, pos.y + 32));
                    points.push(new Vector2(pos.x + 8, pos.y + 64));
                    points.push(new Vector2(pos.x - 8, pos.y + 64));
                    points.push(new Vector2(pos.x - 8, pos.y + 32));
                    points.push(new Vector2(pos.x - 32, pos.y + 32));
                    polygon = Polygon(points);

                    colliding = polygon.intersect(polygonOther);
                },
                once,
                object = new Entity({
                    z: 0,
                    name: '',
                    addNow: false,
                    useHshg: false,
                    position: new Vector2(0, 0),
                    originRelative: new Vector2(0, 0),
                    components: [new Clickable({
                        pointerUp: function (e) {
                            if (object.hold) {
                                object.hold = false;
                                set();
                            }
                        },
                        pointerDown: function (e) {
                            var position = object.position;
                            if (polygon.hasPosition(e.worldPosition)) {
                                object.offset = new Vector2(position.x - e.worldPosition.x, position.y - e.worldPosition.y);
                                object.position = new Vector2(e.worldPosition.x + object.offset.x, e.worldPosition.y + object.offset.y);
                                object.hold = true;
                                set();
                            }
                        },
                        pointerMove: function (e) {
                            if (object.hold) {
                                object.position = new Vector2(e.worldPosition.x + object.offset.x, e.worldPosition.y + object.offset.y);
                                set();
                            }
                        }
                    })],
                    family: [''],
                    init: function () {}
                });
            console.log(object)
            object.attach({
                draw: function (data) {
                    if (!polygon) {
                        return;
                    }
                    // draw the polygon
                    var i,
                        ctx = Bento.getCanvas().getContext('2d'),
                        points = polygon.points,
                        point,
                        next;
                    ctx.beginPath();
                    ctx.lineWidth = "2";
                    ctx.strokeStyle = colliding ? 'green' : "black";
                    for (i = 0; i <= points.length; ++i) {
                        point = points[i % points.length];
                        next = points[(i + 1) % points.length];
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(next.x, next.y);
                        ctx.stroke(); // Draw it
                    }
                    ctx.closePath();

                    // draw other
                    points = polygonOther.points;
                    ctx.beginPath();
                    ctx.lineWidth = "2";
                    ctx.strokeStyle = colliding ? 'green' : "black";
                    for (i = 0; i <= points.length; ++i) {
                        point = points[i % points.length];
                        next = points[(i + 1) % points.length];
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(next.x, next.y);
                        ctx.stroke(); // Draw it
                    }
                    ctx.closePath();
                }
            });
            // star shape
            pts.push(new Vector2(300, 200));
            pts.push(new Vector2(350, 300));
            pts.push(new Vector2(450, 300));
            pts.push(new Vector2(370, 370));
            pts.push(new Vector2(400, 500));
            pts.push(new Vector2(300, 410));
            pts.push(new Vector2(200, 500));
            pts.push(new Vector2(230, 370));
            pts.push(new Vector2(150, 300));
            pts.push(new Vector2(250, 300));
            polygonOther = Polygon(pts);
            object.position = new Vector2(80, 80);
            set();

            Bento.objects.add(object);

        }, function (current, total) {
            console.log(current + '/' + total);
        });
    });
});