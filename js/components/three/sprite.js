/**
 * Sprite component with a three plane exposed. Must be used with three renderer.
 * <br>Exports: Constructor
 * @module bento/components/pixi/three
 * @moduleName ThreeSprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/three/sprite', [
    'bento',
    'bento/utils',
    'bento/components/sprite',
    'bento/renderers/three'
], function (
    Bento,
    Utils,
    Sprite,
    ThreeJsRenderer
) {
    'use strict';
    var ThreeSprite = function (settings) {
        if (!(this instanceof ThreeSprite)) {
            return new ThreeSprite(settings);
        }

        this.settings = settings || {};

        // ThreeJS specific
        this.material = null;
        this.geometry = null;
        this.texture = null;
        this.plane = null;
        this.container = new window.THREE.Object3D();
        this.autoAttach = Utils.getDefault(settings.autoAttach, true);

        // checking if frame changed
        this.lastFrame = null;

        // debugging
        // var axesHelper = new window.THREE.AxesHelper( 1 );
        // this.container.add(axesHelper);

        this.sprite = settings.sprite;
        Sprite.call(this, settings);

        this.name = settings.name || 'planeSprite';
    };
    ThreeSprite.prototype = Object.create(Sprite.prototype);
    ThreeSprite.prototype.constructor = ThreeSprite;

    ThreeSprite.prototype.start = function (data) {
        if (this.autoAttach && data.renderer.three) {
            data.renderer.three.scene.add(this.container);
        }
    };
    ThreeSprite.prototype.destroy = function (data) {
        if (this.autoAttach && data.renderer.three) {
            data.renderer.three.scene.remove(this.container);
        }

        // todo: memory management
        this.dispose();
    };

    ThreeSprite.prototype.setup = function (data) {
        var spriteImage;
        var threeTexture;
        var plane;
        var sprite = this.sprite || this;

        if (this.sprite) {
            // sprite already exists
            sprite = this.sprite;
        } else {
            Sprite.prototype.setup.call(this, data);
        }

        spriteImage = sprite.spriteImage;

        // check if we have an image and convert it to a texture
        if (spriteImage) {
            threeTexture = spriteImage.image.threeTexture;
            if (!threeTexture) {
                threeTexture = new window.THREE.Texture(spriteImage.image);
                threeTexture.needsUpdate = true;
                threeTexture.magFilter = window.THREE.NearestFilter;
                threeTexture.minFilter = window.THREE.NearestFilter;
                spriteImage.threeTexture = threeTexture;
            }
            this.texture = threeTexture;
        } else {
            this.texture = null;
        }

        // create new material
        if (this.texture) {
            // dispose previous objects
            this.dispose();

            // move this also to a image property?
            this.material = new window.THREE.MeshBasicMaterial({
                map: this.texture,
                color: 0xffffff,
                // side: window.THREE.DoubleSide,
                alphaTest: Utils.getDefault(this.settings.alphaTest, ThreeSprite.alphaTest), // --> prevents glitchy clipping
                transparent: true
            });
            this.geometry = new window.THREE.PlaneGeometry(
                sprite.frameWidth,
                sprite.frameHeight,
                1,
                1
            );
            // remove existing mesh
            if (this.plane) {
                this.container.remove(this.plane);
                this.plane = null;
            }

            plane = new window.THREE.Mesh(this.geometry, this.material);
            this.plane = plane;

            // game specific?
            this.plane.rotation.x = Math.PI; // makes the mesh stand up, note: local axis changes

            this.lastFrame = sprite.currentFrame;
            sprite.updateFrame();
            this.updateUvs();

            this.container.add(plane);

            // origin
            // take into account that threejs already assumes middle of the mesh to be origin
            plane.position.x = (sprite.origin.x - sprite.frameWidth / 2);
            plane.position.y = -(sprite.origin.y - sprite.frameHeight / 2); // reversed due to rotation

            // var axesHelper = new window.THREE.AxesHelper(sprite.frameWidth);
            // this.container.add(axesHelper);
        } else {
            // remove existing mesh
            if (this.plane) {
                this.container.remove(this.plane);
                this.plane = null;
            }
        }
    };
    ThreeSprite.prototype.update = function (data) {
        var sprite = this.sprite || this;
        Sprite.prototype.update.call(sprite, data);

        if (this.lastFrame !== sprite.currentFrame) {
            // prevent updating the uvs all the time
            sprite.updateFrame();
            this.updateUvs();
        }
        this.lastFrame = sprite.currentFrame;
    };

    ThreeSprite.prototype.draw = function (data) {
        // ThreeSprite is not responsible for drawing on screen, only calculating the UVs and positioning
        data.renderer.render(this.container, this.parent.z || 0);
    };

    ThreeSprite.prototype.updateUvs = function () {
        //
        var sprite = this.sprite || this;
        var sourceX = sprite.sourceX;
        var sourceY = sprite.sourceY;
        var spriteImage = sprite.spriteImage;
        var image = spriteImage.image;
        var imageWidth = image.width;
        var imageHeight = image.height;
        // var origin = sprite.origin; // -> what to do with this

        var sx = sourceX + spriteImage.x;
        var sy = sourceY + spriteImage.y;

        var u = sx / imageWidth;
        var v = 1 - sy / imageHeight;
        var w = sprite.frameWidth / imageWidth;
        var h = sprite.frameHeight / imageHeight;

        var uvs;

        if (this.geometry && this.plane) {
            uvs = this.geometry.faceVertexUvs[0];
            uvs[0][0].set(u, v);
            uvs[0][1].set(u, v - h);
            uvs[0][2].set(u + w, v);
            uvs[1][0].set(u, v - h);
            uvs[1][1].set(u + w, v - h);
            uvs[1][2].set(u + w, v);

            this.geometry.uvsNeedUpdate = true;
        }
    };

    ThreeSprite.prototype.attached = function (data) {
        Sprite.prototype.attached.call(this, data);

        // inherit name
        this.container.name = this.parent.name + '.' + this.name;
        if (this.plane) {
            this.plane.name = this.container.name + '.plane';
        }
    };

    ThreeSprite.prototype.dispose = function () {
        if (this.geometry) {
            this.geometry.dispose();
            this.geometry = null;
        }

        // not needed?
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }

        // note: textures are not disposed, they are owned by the image objects and my be reused by other instances
    };

    ThreeSprite.alphaTest = 0;

    return ThreeSprite;
});