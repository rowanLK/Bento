//TODO minimum dimensions

/**
 * Nineslice component
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
        this.entity = null;
        this.name = 'nineslice';
        this.visible = true;

        //component settings
        this.width = 0;
        this.height = 0;

        // sprite settings
        this.spriteImage = null;
        this.padding = 0;

        // drawing internals
        this.partWidth = 0;
        this.partHeight = 0;

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

        this.frameWidth = Math.floor((this.spriteImage.width - this.padding * 2) / 3);
        this.frameHeight = Math.floor((this.spriteImage.height - this.padding * 2) / 3);

        this.width = settings.width || 0;
        this.height = settings.height || 0;

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
        this.width = width || this.width;
        if (this.entity) {
            this.entity.dimension.width = this.width;
        }
    };

    NineSlice.prototype.setHeight = function (height) {
        this.height = height || this.height;
        if (this.entity) {
            this.entity.dimension.height = this.height;
        }
    };

    NineSlice.prototype.fillArea = function (renderer, frame, x, y, width, height) {
        var sx = (this.frameWidth + this.padding) * (frame % 3);
        var sy = (this.frameHeight + this.padding) * Math.floor(frame / 3);

        if (!width) {
            width = this.frameWidth;
        }
        if (!height) {
            height = this.frameHeight;
        }

        renderer.drawImage(this.spriteImage, sx, sy, this.frameWidth, this.frameHeight, x, y, width, height);
    };

    NineSlice.prototype.draw = function (data) {
        var entity = data.entity;
        var origin = data.entity.origin;

        var innerWidth = this.width - this.frameWidth * 2;
        var innerHeight = this.height - this.frameHeight * 2;

        if (this.width === 0 || this.height === 0) {
            return;
        }

        data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));

        //top left corner
        this.fillArea(data.renderer, 0, 0, 0);
        //top stretch
        this.fillArea(data.renderer, 1, this.frameWidth, 0, innerWidth, this.frameHeight);
        //top right corner
        this.fillArea(data.renderer, 2, this.width - this.frameWidth, 0);
        //left stretch
        this.fillArea(data.renderer, 3, 0, this.frameHeight, this.frameWidth, innerHeight);
        //center stretch
        this.fillArea(data.renderer, 4, this.frameWidth, this.frameHeight, innerWidth, innerHeight);
        //right stretch
        this.fillArea(data.renderer, 5, this.width - this.frameWidth, this.frameHeight, this.frameWidth, innerHeight);
        //bottom left corner
        this.fillArea(data.renderer, 6, 0, this.height - this.frameHeight);
        //bottom stretch
        this.fillArea(data.renderer, 7, this.frameWidth, this.height - this.frameHeight, innerWidth, this.frameHeight);
        //bottom right corner
        this.fillArea(data.renderer, 8, this.width - this.frameWidth, this.height - this.frameHeight);

        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };


    return NineSlice;
});