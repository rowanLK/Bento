bento.define('screen1', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/fill',
    'bento/tween',
    'bento/screen',
    'bento/gui/text'
], function (
    Bento,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Fill,
    Tween,
    Screen,
    Text
) {
    'use strict';
    var object = new Screen({
        tiled: 'level1',
        onShow: function () {
            var viewport = Bento.getViewport();
            var fill = new Entity({
                z: -1,
                name: 'fill',
                components: [new Fill({
                    color: [0.8, 0.8, 1, 1]
                })]
            });
            var text = new Text({
                z: 1,
                position: new Vector2(0, 0),
                text: 'Click on the bunny to change screen',
                font: 'font',
                fontSize: 12,
                fontColor: '#ffffff',
                maxWidth: viewport.width,
                align: 'left',
                textBaseline: 'top'
            });
            Bento.objects.attach(fill);
            Bento.objects.attach(text);
            console.log('screen 1 loaded');
        }
    });
    return object;
});