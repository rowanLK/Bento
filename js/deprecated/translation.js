/*
 * Component that sets the context translation for drawing.
 * <br>Exports: Constructor
 * @module bento/components/translation
 * @param {Object} settings - Settings
 * @param {Boolean} settings.subPixel - Turn on to prevent drawing positions to be rounded down
 * @returns Returns a component object.
 */
bento.define('bento/components/translation', [
    'bento',
    'bento/utils',
    'bento/math/vector2'
], function (Bento, Utils, Vector2) {
    'use strict';
    var bentoSettings;
    var Translation = function (settings) {
        if (!bentoSettings) {
            bentoSettings = Bento.getSettings();
        }
        settings = settings || {};
        this.name = 'translation';
        this.subPixel = settings.subPixel || false;
        this.entity = null;
        /*
         * Additional x translation (superposed on the entity position)
         * @instance
         * @default 0
         * @name x
         */
        this.x = 0;
        /*
         * Additional y translation (superposed on the entity position)
         * @instance
         * @default 0
         * @name y
         */
        this.y = 0;
    };
    Translation.prototype.draw = function (data) {
        var entity = data.entity,
            parent = entity.parent,
            position = entity.position,
            origin = entity.origin,
            scroll = data.viewport;

        entity.transform.x = this.x;
        entity.transform.y = this.y;
        /*data.renderer.save();
        if (this.subPixel || bentoSettings.subPixel) {
            data.renderer.translate(entity.position.x + this.x, entity.position.y + this.y);
        } else {
            data.renderer.translate(Math.round(entity.position.x + this.x), Math.round(entity.position.y + this.y));
        }
        // scroll (only applies to parent objects)
        if (!parent && !entity.float) {
            data.renderer.translate(-scroll.x, -scroll.y);
        }*/
    };
    Translation.prototype.postDraw = function (data) {
        // data.renderer.restore();
    };
    Translation.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    Translation.prototype.toString = function () {
        return '[object Translation]';
    };

    return Translation;
});