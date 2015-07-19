/**
 * Helper function that attaches the translate, scale, rotation, opacity and animation components
 * <br>Exports: Function
 * @module bento/components/sprite
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
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