/**
 * Helper function that attaches the translate, scale, rotation, opacity and animation components
 * <br>Exports: Function
 * @module bento/components/sprite
 * @param {Entity} entity - The entity to attach the component to
 * @param {Object} settings - Settings
 * @returns Returns the entity passed. The entity will have the component attached.
 */
bento.define('bento/components/sprite', [
    'bento',
    'bento/utils',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/opacity',
    'bento/components/animation',
    'bento/components/pixi'
], function (Bento, Utils, Translation, Rotation, Scale, Opacity, Animation, Pixi) {
    'use strict';
    var renderer;
    return function (entity, settings) {
        // detect renderer
        if (!renderer) {
            renderer = Bento.getRenderer();
        }
        Translation(entity, settings);
        Scale(entity, settings);
        Rotation(entity, settings);
        Opacity(entity, settings);
        // use pixi or default sprite renderer
        if (renderer.name === 'pixi') {
            if (settings.sprite) {
                settings.pixi = settings.sprite;
            }
            Pixi(entity, settings);
            entity.sprite = entity.pixi;
        } else {
            if (settings.sprite) {
                settings.animation = settings.sprite;
            }
            Animation(entity, settings);
            entity.sprite = entity.animation;
        }
        Utils.extend(entity.sprite, entity.scale);
        Utils.extend(entity.sprite, entity.rotation);
        Utils.extend(entity.sprite, entity.opacity);

        return entity;
    };
});