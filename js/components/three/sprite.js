/**
 * Sprite component with a three mesh exposed. Must be used with three renderer.
 * <br>Exports: Constructor
 * @module bento/components/three/sprite
 * @moduleName ThreeSprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/three/sprite', [
    'bento',
    'bento/utils',
    'bento/components/canvas2d/sprite'
], function (
    Bento,
    Utils,
    Sprite
) {
    'use strict';
    var THREE = window.THREE;

    var positions = new Float32Array([
         0.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
    ]);
    var uvs = new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
    ]);
    var indices = new Uint16Array([
        0, 1, 2,
        2, 3, 0
    ]);
    var positionAttribute = new THREE.BufferAttribute(positions, 3);
    var indexAttribute = new THREE.BufferAttribute(indices, 1);

    var ThreeSprite = function (settings) {
        if (!(this instanceof ThreeSprite)) {
            return new ThreeSprite(settings);
        }

        this.settings = settings || {};

        // ThreeJS specific
        /**
         * ThreeJS material, used on this sprite
         * @instance
         * @name material
         * @type {THREE.Material}
         */
        this.material = null;
        /**
         * ThreeJS geometry, used on this sprite
         * @instance
         * @name geometry
         * @type {THREE.BufferGeometry}
         */
        this.geometry = null;
        /**
         * Current ThreeJS texture, used on this sprite
         * @instance
         * @name texture
         * @type {THREE.Texture}
         */
        this.texture = null;
        /**
         * Current ThreeJS mesh, used for the sprite
         * @instance
         * @name mesh
         * @type {THREE.Mesh}
         */
        this.mesh = null;
        /**
         * Container object, use this to append any ThreeJS objects
         * @instance
         * @name object3D
         * @type {THREE.Object3D}
         */
        this.object3D = new THREE.Object3D();
        this.object3D.visible = false;
        this.antiAlias = Utils.getDefault(settings.antiAlias, Bento.getAntiAlias());

        // checking if frame changed
        this.lastFrame = null;
        this.lastAnimation = null;

        // debugging
        // var axesHelper = new THREE.AxesHelper( 1 );
        // this.object3D.add(axesHelper);

        Sprite.call(this, settings);

        this.name = settings.name || 'sprite';
    };
    ThreeSprite.prototype = Object.create(Sprite.prototype);
    ThreeSprite.prototype.constructor = ThreeSprite;

    ThreeSprite.prototype.start = function (data) {
        // add the parent object to the main scene
        data.renderer.three.scene.add(this.object3D);
    };
    ThreeSprite.prototype.destroy = function (data) {
        // remove the parent object from the main scene
        data.renderer.three.scene.remove(this.object3D);
        this.dispose();
    };
    ThreeSprite.prototype.draw = function (data) {
        // the draw function prepares the transforms and sets up origin position
        var origin = this.origin;
        var mesh = this.mesh;
        var currentFrame = Math.round(this.currentFrame);
        var currentAnimation = this.currentAnimation;

        if (!this.currentAnimation || !this.visible || !this.spriteImage) {
            // there is nothing to draw
            this.object3D.visible = false;
            return;
        }

        if (this.lastFrame !== currentFrame || this.lastAnimation !== currentAnimation) {
            // prevent updating the uvs all the time
            this.updateFrame();
            this.updateUvs();
            this.lastFrame = currentFrame;
            this.lastAnimation = currentAnimation;
        }

        // origin: to achieve this offset effect, we move the mesh (child of the object3d)
        mesh.position.x = -origin.x;
        mesh.position.y = origin.y - this.frameHeight;

        // opacity will be overwritten by renderer
        this.material.opacity = 1;

        // move it to the render list
        data.renderer.render(this.object3D, this.material);
    };

    ThreeSprite.prototype.setup = function (data) {
        var packedImage;
        var threeTexture;
        var mesh;

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
                alphaTest: Utils.getDefault(this.settings.alphaTest, ThreeSprite.alphaTest), // --> prevents glitchy clipping
                transparent: true
            });

            this.geometry = new THREE.BufferGeometry();
            this.geometry.setIndex(indexAttribute);
            this.geometry.setAttribute('position', positionAttribute);
            this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs.slice(), 2));

            // remove existing mesh
            if (this.mesh) {
                this.object3D.remove(this.mesh);
                this.mesh = null;
            }

            mesh = new THREE.Mesh(this.geometry, this.material);
            this.mesh = mesh;

            this.object3D.add(mesh);
        } else {
            // remove existing mesh
            if (this.mesh) {
                this.object3D.remove(this.mesh);
                this.mesh = null;
            }
        }
    };

    ThreeSprite.prototype.updateUvs = function () {
        var sourceX = this.sourceX;
        var sourceY = this.sourceY;
        var spriteImage = this.spriteImage;
        var image = spriteImage.image;
        var imageWidth = image.width;
        var imageHeight = image.height;

        var sx = sourceX + spriteImage.x;
        var sy = sourceY + spriteImage.y;

        var u0 = sx / imageWidth;
        var v0 = sy / imageHeight;
        var u1 = u0 + this.frameWidth / imageWidth;
        var v1 = v0 + this.frameHeight / imageHeight;

        var uv, arr;

        this.mesh.scale.x = this.frameWidth;
        this.mesh.scale.y = this.frameHeight;

        if (this.geometry && this.mesh) {
            uv = this.geometry.attributes.uv;
            arr = uv.array;
            arr[0] = u0; arr[1] = v1;
            arr[2] = u1; arr[3] = v1;
            arr[4] = u1; arr[5] = v0;
            arr[6] = u0; arr[7] = v0;
            uv.needsUpdate = true;
        }
    };

    ThreeSprite.prototype.attached = function (data) {
        Sprite.prototype.attached.call(this, data);

        // inherit name
        this.object3D.name = this.parent.name + '.' + this.name;
        if (this.mesh) {
            this.mesh.name = this.object3D.name + '.mesh';
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

    /*
     * Converts imagePack to THREE.Texture
     */
    ThreeSprite.imageToTexture = function (image, antiAlias) {
        var imagePack = Utils.isString(image) ? Bento.assets.getImage(image) : image;
        var texture = new THREE.Texture(imagePack.image);
        texture.needsUpdate = true;
        texture.flipY = false;
        if (!antiAlias) {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
        }
        return texture;
    };

    return ThreeSprite;
});