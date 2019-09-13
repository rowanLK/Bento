/**
 * Sprite component with a three plane exposed. Must be used with three renderer.
 * <br>Exports: Constructor
 * @module bento/components/three/sprite
 * @moduleName ThreeSprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/three/sprite', [
    'bento',
    'bento/utils',
    'bento/components/canvas2d/sprite',
    'bento/renderers/three'
], function (
    Bento,
    Utils,
    Sprite,
    ThreeJsRenderer
) {
    'use strict';
    var THREE = window.THREE;
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
        this.object3D = new THREE.Object3D();
        this.autoAttach = Utils.getDefault(settings.autoAttach, true);
        this.antiAlias = Utils.getDefault(settings.antiAlias, Bento.getAntiAlias());

        // checking if frame changed
        this.lastFrame = null;

        // debugging
        // var axesHelper = new THREE.AxesHelper( 1 );
        // this.object3D.add(axesHelper);

        Sprite.call(this, settings);

        this.name = settings.name || 'sprite';
    };
    ThreeSprite.prototype = Object.create(Sprite.prototype);
    ThreeSprite.prototype.constructor = ThreeSprite;

    ThreeSprite.prototype.start = function (data) {
        data.renderer.three.scene.add(this.object3D);
    };
    ThreeSprite.prototype.destroy = function (data) {
        data.renderer.three.scene.remove(this.object3D);
        this.dispose();
    };

    ThreeSprite.prototype.setup = function (data) {
        var packedImage;
        var threeTexture;
        var plane;

        Sprite.prototype.setup.call(this, data);

        packedImage = this.spriteImage;

        // check if we have an image and convert it to a texture
        if (packedImage) {
            threeTexture = packedImage.image.texture;
            if (!threeTexture) {
                // initialize texture for the first time
                threeTexture = ThreeSprite.imageToTexture(packedImage, this.antiAlias);
                packedImage.image.texture = threeTexture;
            }
            this.texture = threeTexture;
        } else {
            // un-set
            this.texture = null;
        }

        // create new material
        if (this.texture) {
            // dispose previous objects
            this.dispose();

            this.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                color: 0xffffff,
                // side: THREE.DoubleSide,
                alphaTest: Utils.getDefault(this.settings.alphaTest, ThreeSprite.alphaTest), // --> prevents glitchy clipping
                transparent: true
            });
            // possibly move this if user wants to edit target width and height to be drawn
            this.geometry = new THREE.PlaneGeometry(
                this.frameWidth,
                this.frameHeight,
                1,
                1
            );
            // remove existing mesh
            if (this.plane) {
                this.object3D.remove(this.plane);
                this.plane = null;
            }

            plane = new THREE.Mesh(this.geometry, this.material);
            this.plane = plane;

            this.object3D.add(plane);
        } else {
            // remove existing mesh
            if (this.plane) {
                this.object3D.remove(this.plane);
                this.plane = null;
            }
        }
    };

    ThreeSprite.prototype.draw = function (data) {
        // origin: to achieve this offset effect, we move the plane (child of the object3d)
        // take into account that threejs already assumes middle of the mesh to be origin
        var origin = this.origin;
        var plane = this.plane;
        var currentFrame = Math.round(this.currentFrame);

        if (this.lastFrame !== currentFrame) {
            // prevent updating the uvs all the time
            this.updateFrame();
            this.updateUvs();
            this.lastFrame = currentFrame;
        }

        plane.position.x = -(origin.x - this.frameWidth / 2);
        plane.position.y = (origin.y - this.frameHeight / 2);

        // opacity will be overwritten by renderer
        this.material.opacity = 1;

        // move it to the render list
        data.renderer.render({
            object3D: this.object3D,
            material: this.material
        });
    };

    ThreeSprite.prototype.updateUvs = function () {
        //
        var sourceX = this.sourceX;
        var sourceY = this.sourceY;
        var spriteImage = this.spriteImage;
        var image = spriteImage.image;
        var imageWidth = image.width;
        var imageHeight = image.height;
        // var origin = this.origin; // -> what to do with this

        var sx = sourceX + spriteImage.x;
        var sy = sourceY + spriteImage.y;

        var u = sx / imageWidth;
        var v = 1 - sy / imageHeight;
        var w = this.frameWidth / imageWidth;
        var h = this.frameHeight / imageHeight;

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
        this.object3D.name = this.parent.name + '.' + this.name;
        if (this.plane) {
            this.plane.name = this.object3D.name + '.plane';
        }
    };

    /**
     * (Internal) Clean up memory
     */
    ThreeSprite.prototype.dispose = function () {
        if (this.geometry) {
            this.geometry.dispose();
            this.geometry = null;
        }
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }

        // note: textures are not disposed, they are owned by the image objects and my be reused by other instances
    };

    ThreeSprite.prototype.toString = function () {
        return '[object ThreeSprite]';
    };

    // default alpha test
    ThreeSprite.alphaTest = 0;

    /**
     * Converts imagePack to THREE.Texture
     * @snippet Sprite.imageToTexture()|Texture from renderer
Sprite.imageToTexture('${1:imageName}', ${2:false});
     */
    ThreeSprite.imageToTexture = function (image, antiAlias) {
        var imagePack = Utils.isString(image) ? Bento.assets.getImage(image) : image;
        var texture = new THREE.Texture(imagePack.image);
        texture.needsUpdate = true;
        if (!antiAlias) {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
        }
        return texture;
    };

    return ThreeSprite;
});