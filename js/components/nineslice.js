/**
 * Nineslice component
 * @moduleName NineSlice
 */
bento.define('bento/components/nineslice', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    /**
     * Describe your settings object parameters
     * @param {Object} settings
     */
    var NineSlice = function (settings) {
        if (!(this instanceof NineSlice)) {
            return new NineSlice(settings);
        }
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'nineslice';
        this.visible = true;

        //component settings
        this.width = 0;
        this.height = 0;

        // sprite settings
        this.spriteImage = null;
        this.padding = 0;

        // drawing internals
        this.sliceWidth = 0;
        this.sliceHeight = 0;

        this.setup(settings);
    };

    NineSlice.prototype.setup = function (settings) {
        var self = this;

        if (settings.image) {
            this.spriteImage = settings.image;
        } else if (settings.imageName) {
            // load from string
            if (Bento.assets) {
                this.spriteImage = Bento.assets.getImage(settings.imageName);
            } else {
                throw 'Bento asset manager not loaded';
            }
        } else if (settings.imageFromUrl) {
            // load from url
            if (!this.spriteImage && Bento.assets) {
                Bento.assets.loadImageFromUrl(settings.imageFromUrl, settings.imageFromUrl, function (err, asset) {
                    self.spriteImage = Bento.assets.getImage(settings.imageFromUrl);
                    self.setup(settings);

                    if (settings.onLoad) {
                        settings.onLoad();
                    }
                });
                // wait until asset is loaded and then retry
                return;
            }
        } else {
            // no image specified
            return;
        }

        this.padding = settings.padding || 0;

        if (this.spriteImage) {
            this.sliceWidth = Math.floor((this.spriteImage.width - this.padding * 2) / 3);
            this.sliceHeight = Math.floor((this.spriteImage.height - this.padding * 2) / 3);
        }

        if (settings.width) {
            this.width = Math.max(settings.width || 0, this.sliceWidth * 2);
        }
        if (settings.height) {
            this.height = Math.max(settings.height || 0, this.sliceHeight * 2);
        }

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.width = this.width;
            this.entity.dimension.height = this.height;
        }
    };

    NineSlice.prototype.attached = function (data) {
        this.entity = data.entity;
        // set dimension of entity object
        this.entity.dimension.width = this.width;
        this.entity.dimension.height = this.height;
    };

    NineSlice.prototype.setWidth = function (width) {
        this.width = Utils.isDefined(width) ? width : this.width;
        this.width = Math.max(this.width, this.sliceWidth * 2);
        if (this.entity) {
            var relOriginX = this.entity.origin.x / this.entity.dimension.width;
            this.entity.dimension.width = this.width;
            this.entity.origin.x = relOriginX * this.width;
        }
    };

    NineSlice.prototype.setHeight = function (height) {
        this.height = Utils.isDefined(height) ? height : this.height;
        this.height = Math.max(this.height, this.sliceHeight * 2);
        if (this.entity) {
            var relOriginY = this.entity.origin.y / this.entity.dimension.height;
            this.entity.dimension.height = this.height;
            this.entity.origin.y = relOriginY * this.height;
        }
    };

    NineSlice.prototype.fillArea = function (renderer, frame, x, y, width, height) {
        var sx = (this.sliceWidth + this.padding) * (frame % 3);
        var sy = (this.sliceHeight + this.padding) * Math.floor(frame / 3);

        if (width === 0 || height === 0) {
            return;
        }

        if (!width) {
            width = this.sliceWidth;
        }
        if (!height) {
            height = this.sliceHeight;
        }

        renderer.drawImage(this.spriteImage, sx, sy, this.sliceWidth, this.sliceHeight, x, y, width, height);
    };

    NineSlice.prototype.draw = function (data) {
        var entity = data.entity;
        var origin = data.entity.origin;

        var innerWidth = this.width - this.sliceWidth * 2;
        var innerHeight = this.height - this.sliceHeight * 2;

        if (this.width === 0 || this.height === 0) {
            return;
        }

        data.renderer.translate(-Math.round(origin.x), -Math.round(origin.y));

        //top left corner
        this.fillArea(data.renderer, 0, 0, 0);
        //top stretch
        this.fillArea(data.renderer, 1, this.sliceWidth, 0, innerWidth, this.sliceHeight);
        //top right corner
        this.fillArea(data.renderer, 2, this.width - this.sliceWidth, 0);
        //left stretch
        this.fillArea(data.renderer, 3, 0, this.sliceHeight, this.sliceWidth, innerHeight);
        //center stretch
        this.fillArea(data.renderer, 4, this.sliceWidth, this.sliceHeight, innerWidth, innerHeight);
        //right stretch
        this.fillArea(data.renderer, 5, this.width - this.sliceWidth, this.sliceHeight, this.sliceWidth, innerHeight);
        //bottom left corner
        this.fillArea(data.renderer, 6, 0, this.height - this.sliceHeight);
        //bottom stretch
        this.fillArea(data.renderer, 7, this.sliceWidth, this.height - this.sliceHeight, innerWidth, this.sliceHeight);
        //bottom right corner
        this.fillArea(data.renderer, 8, this.width - this.sliceWidth, this.height - this.sliceHeight);

        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };

    return NineSlice;
});