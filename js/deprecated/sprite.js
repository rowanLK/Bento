/**
 * Helper component that attaches the Translation, Scale, Rotation, Opacity
 * and Animation (or Pixi) components. Automatically detects the renderer.
 * <br>Exports: Constructor
 * @module bento/components/sprite
 * @param {Object} settings - Settings object, this object is passed to all other components
 * @param {Array} settings.components - This array of objects is attached to the entity BEFORE
 * the Animation component is attached. Same as Sprite.insertBefore.
 * @param {} settings.... - See other components
 * @returns Returns a component object.
 */
bento.define('bento/components/sprite_old', [
    'bento',
    'bento/utils',
    'bento/components/translation',
    'bento/components/rotation',
    'bento/components/scale',
    'bento/components/opacity',
    'bento/components/animation'
], function (Bento, Utils, Translation, Rotation, Scale, Opacity, Animation) {
    'use strict';
    var renderer,
        component = function (settings) {
            this.entity = null;
            this.settings = settings;

            /**
             * Reference to the Translation component
             * @instance
             * @name translation
             */
            this.translation = new Translation(settings);
            /**
             * Reference to the Rotation component
             * @instance
             * @name rotation
             */
            this.rotation = new Rotation(settings);
            /**
             * Reference to the Scale component
             * @instance
             * @name scale
             */
            this.scale = new Scale(settings);
            /**
             * Reference to the Opacity component
             * @instance
             * @name rotation
             */
            this.opacity = new Opacity(settings);
            /**
             * If renderer is set to pixi, this property is the Pixi component.
             * Otherwise it's the Animation component
             * @instance
             * @name animation
             */
            this.animation = new Animation(settings);


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
    /**
     * Allows you to insert components/children entities BEFORE the animation component.
     * This way you can draw objects behind the sprite.
     * This function should be called before you attach the Sprite to the Entity.
     * @function
     * @param {Array} array - Array of entities to attach
     * @instance
     * @name insertBefore
     */
    component.prototype.insertBefore = function (array) {
        if (!Utils.isArray(array)) {
            array = [array];
        }
        this.components = array;
        return this;
    };

    component.prototype.toString = function () {
        return '[object Sprite]';
    };

    component.prototype.getSettings = function () {
        return this.settings;
    };

    return component;
});