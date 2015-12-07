/**
 * Helper component that attaches the translate, scale, rotation, opacity and animation/pixi components. Automatically detects the renderer.
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
    var renderer,
        component = function (settings) {
            this.entity = null;
            // detect renderer
            if (!renderer) {
                renderer = Bento.getRenderer();
            }

            // use pixi or default sprite renderer
            if (renderer.name === 'pixi') {
                this.opacity = new Opacity(settings);
                this.animation = new Pixi(settings);
            } else {
                this.translation = new Translation(settings);
                this.rotation = new Rotation(settings);
                this.scale = new Scale(settings);
                this.opacity = new Opacity(settings);
                this.animation = new Animation(settings);
            }

            this.components = settings.components || [];
        };

    component.prototype.attached = function (data) {
        var i = 0;
        this.entity = data.entity;
        // attach all components!
        if (this.translation) {
            this.entity.attach(this.translation);
        }
        if (this.rotation) {
            this.entity.attach(this.rotation);
        }
        if (this.scale) {
            this.entity.attach(this.scale);
        }
        this.entity.attach(this.opacity);

        // wedge in extra components in before the animation component
        for (i = 0; i < this.components.length; ++i) {
            this.entity.attach(this.components[i]);
        }
        this.entity.attach(this.animation);

        // remove self?
        this.entity.remove(this);
    };
    component.prototype.insertBefore = function (array) {
        if (!Utils.isArray(array)) {
            array = [array];
        }
        this.components = array;
        return this;
    },
    component.prototype.toString = function () {
        return '[object Sprite]';
    };

    return component;
});