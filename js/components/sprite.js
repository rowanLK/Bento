bento.define('bento/components/sprite', [
    'bento/utils',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/opacity',
    'bento/components/animation'
], function (Utils, Translation, Rotation, Scale, Opacity, Animation) {
    'use strict';
    return function (entity, settings) {
        if (settings.sprite) {
            settings.animation = settings.sprite;
        }
        Translation(entity, settings);
        Scale(entity, settings);
        Rotation(entity, settings);
        Opacity(entity, settings);
        Animation(entity, settings);
        entity.sprite = entity.animation;
        Utils.extend(entity.sprite, entity.scale);
        Utils.extend(entity.sprite, entity.rotation);
        Utils.extend(entity.sprite, entity.opacity);
        return entity;
    };
});