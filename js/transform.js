/**
 * Transform module
 * @moduleName Transform
 */
bento.define('bento/transform', [
    'bento',
    'bento/math/vector2',
    'bento/math/transformmatrix',
], function (
    Bento,
    Vector2,
    Matrix
) {
    'use strict';
    var twoPi = Math.PI * 2;

    var Transform = function (entity) {
        if (!(this instanceof Transform)) {
            return new Transform(entity);
        }
        this.matrix = new Matrix();
        this.entity = entity;

        // cache values
        this.sin = 0;
        this.cos = 1;
        this.rotationCache = 0;
        this.oldAlpha = 1;

        // additional transforms
        this.x = 0;
        this.y = 0;
    };

    Transform.prototype.draw = function (data) {
        var entity = this.entity;
        var matrix = this.matrix;
        var alpha = entity.alpha;
        var rotation = entity.rotation;
        var sin = this.sin;
        var cos = this.cos;
        var renderer = data.renderer;
        var viewport = data.viewport;

        // cache sin and cos
        if (rotation !== this.rotationCache) {
            this.rotationCache = rotation;
            this.sin = Math.sin(rotation);
            this.cos = Math.cos(rotation);
            sin = this.sin;
            cos = this.cos;
        }

        // save
        renderer.save();

        // translate
        if (Transform.subPixel) {
            renderer.translate(entity.position.x + this.x, entity.position.y + this.y);
        } else {
            renderer.translate(Math.round(entity.position.x + this.x), Math.round(entity.position.y + this.y));
        }
        // scroll (only applies to parent objects)
        if (!entity.parent && !entity.float) {
            renderer.translate(-viewport.x, -viewport.y);
        }

        if (entity.rotation % twoPi) {
            // rotated?
            renderer.rotate(rotation, sin, cos);
        }
        // scale
        renderer.scale(entity.scale.x, entity.scale.y);
        // alpha
        this.oldAlpha = data.renderer.getOpacity();
        renderer.setOpacity(this.oldAlpha * alpha);
    };

    Transform.prototype.postDraw = function (data) {
        var renderer = data.renderer;

        // restore
        renderer.setOpacity(this.oldAlpha);
        renderer.restore();
    };

    Transform.prototype.getWorldPosition = function () {
        return this.toWorldPosition(this.entity.position);
    };

    Transform.prototype.toWorldPosition = function (localPosition) {
        var positionVector,
            matrix,
            entity = this.entity,
            position,
            parent,
            parents = [],
            i,
            isFloating = false;

        // no parents: is already a world position
        if (!entity.parent) {
            if (entity.float) {
                return localPosition.add(Bento.getViewport().getCorner());
            } else {
                return localPosition.clone();
            }
        }

        // get all parents
        parent = entity;
        while (parent.parent) {
            parent = parent.parent;
            parents.push(parent);
        }
        // is top parent floating?
        if (parents.length && parents[parents.length - 1].float) {
            isFloating = true;
        }

        // make a copy
        if (entity.float || isFloating) {
            positionVector = localPosition.add(Bento.getViewport().getCorner());
        } else {
            positionVector = localPosition.clone();
        }

        /**
         * transform the position vector with each component
         */
        for (i = parents.length - 1; i >= 0; --i) {
            parent = parents[i];

            // construct a scaling matrix and apply to position vector
            matrix = new Matrix().scale(parent.scale.x, parent.scale.y);
            matrix.multiplyWithVector(positionVector);
            // construct a rotation matrix and apply to position vector
            if (parent.rotation % twoPi) {
                matrix = new Matrix().rotate(parent.rotation);
                matrix.multiplyWithVector(positionVector);
            }
            // construct a translation matrix and apply to position vector
            matrix = new Matrix().translate(parent.position.x, parent.position.y);
            matrix.multiplyWithVector(positionVector);
        }

        return positionVector;
    };

    Transform.prototype.toLocalPosition = function (worldPosition) {
        // get the comparable position and reverse transform once more to get into the local space
        var positionVector = this.toComparablePosition(worldPosition);

        // construct a translation matrix and apply to position vector
        var entity = this.entity;
        var position = entity.position;
        var matrix = new Matrix().translate(-position.x, -position.y);
        matrix.multiplyWithVector(positionVector);
        // construct a rotation matrix and apply to position vector
        if (entity.rotation % twoPi) {
            matrix = new Matrix().rotate(-entity.rotation);
            matrix.multiplyWithVector(positionVector);
        }
        // construct a scaling matrix and apply to position vector
        matrix = new Matrix().scale(1 / entity.scale.x, 1 / entity.scale.y);
        matrix.multiplyWithVector(positionVector);

        return positionVector;
    };

    Transform.prototype.toComparablePosition = function (worldPosition) {
        var positionVector,
            matrix,
            entity = this.entity,
            position,
            parent,
            parents = [],
            i,
            isFloating = false;

        // no parents
        if (!entity.parent) {
            if (entity.float) {
                return worldPosition.subtract(Bento.getViewport().getCorner());
            } else {
                return worldPosition;
            }
        }

        // get all parents
        parent = entity;
        while (parent.parent) {
            parent = parent.parent;
            parents.push(parent);
        }
        // is top parent floating?
        if (parents.length && parents[parents.length - 1].float) {
            isFloating = true;
        }

        // make a copy
        if (entity.float || isFloating) {
            positionVector = worldPosition.subtract(Bento.getViewport().getCorner());
        } else {
            positionVector = worldPosition.clone();
        }

        /**
         * Reverse transform the position vector with each component
         */
        for (i = parents.length - 1; i >= 0; --i) {
            parent = parents[i];

            // construct a translation matrix and apply to position vector
            position = parent.position;
            matrix = new Matrix().translate(-position.x, -position.y);
            matrix.multiplyWithVector(positionVector);
            // construct a rotation matrix and apply to position vector
            if (parent.rotation % twoPi) {
                matrix = new Matrix().rotate(-parent.rotation);
                matrix.multiplyWithVector(positionVector);
            }
            // construct a scaling matrix and apply to position vector
            matrix = new Matrix().scale(1 / parent.scale.x, 1 / parent.scale.y);
            matrix.multiplyWithVector(positionVector);
        }

        return positionVector;
    };

    Transform.subPixel = true;

    return Transform;
});