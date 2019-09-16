/**
 * Component that fills a rectangle using the ThreeJs renderer
 * <br>Exports: Constructor
 * @module bento/components/three/fill
 * @moduleName ThreeFill
 * @extends {Canvas2DFill}
 */
bento.define('bento/components/three/fill', [
    'bento/utils',
    'bento',
    'bento/math/vector2',
    'bento/components/canvas2d/fill'
], function (
    Utils,
    Bento,
    Vector2,
    Canvas2DFill
) {
    'use strict';
    var THREE = window.THREE;
    var ThreeFill = function (settings) {
        if (!(this instanceof ThreeFill)) {
            return new ThreeFill(settings);
        }
        Canvas2DFill.call(this, settings);

        this.material = null;
        this.geometry = null;
        this.plane = null;
        this.object3D = new THREE.Object3D();
        this.opacity = 1;

        // if this.dimension is edited, the fill should be redone
        this.cacheDimension = null;
    };
    ThreeFill.prototype = Object.create(Canvas2DFill.prototype);
    ThreeFill.prototype.constructor = ThreeFill;

    ThreeFill.prototype.startFill = function () {
        var dimension = this.dimension;
        var origin = this.origin;
        var color = this.color;
        var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);

        // could be optimized by reusing the materials when updating dimension
        this.dispose();
        this.opacity = color[3]; // need to cache opacity, material's opacity is overwritten during draw
        this.material = new THREE.MeshBasicMaterial({
            color: colorInt,
            opacity: color[3],
            transparent: true
        });
        this.geometry = new THREE.PlaneGeometry(
            dimension.width,
            dimension.height,
            1,
            1
        );
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.object3D.add(this.plane);

        // cache dimension
        this.cacheDimension = dimension.clone();
    };
    ThreeFill.prototype.update = function (data) {
        var dimension = this.dimension;
        var cacheDimension = this.cacheDimension;
        // update fill
        if (
            dimension.width !== cacheDimension.width ||
            dimension.height !== cacheDimension.height
        ) {
            this.startFill();
        }
    };
    ThreeFill.prototype.draw = function (data) {
        // origin: to achieve this offset effect, we move the plane (child of the object3d)
        // take into account that threejs already assumes middle of the mesh to be origin
        var dimension = this.dimension;
        var origin = this.origin;
        var plane = this.plane;
        plane.position.x = dimension.x - (origin.x - dimension.width / 2);
        plane.position.y = -dimension.y + (origin.y - dimension.height / 2);

        this.material.opacity = this.opacity;

        // move it to the render list
        data.renderer.render({
            object3D: this.object3D,
            material: this.material
        });
    };
    ThreeFill.prototype.start = function (data) {
        this.startFill();
        data.renderer.three.scene.add(this.object3D);
    };
    ThreeFill.prototype.destroy = function (data) {
        data.renderer.three.scene.remove(this.object3D);
        this.dispose();
    };
    
    ThreeFill.prototype.dispose = function () {
        if (this.geometry) {
            this.geometry.dispose();
            this.geometry = null;
        }
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        if (this.plane) {
            this.object3D.remove(this.plane);
            this.plane = null;
        }
    };

    ThreeFill.prototype.toString = function () {
        return '[object ThreeFill]';
    };

    return ThreeFill;
});