/**
 * Simple container that masks the children's sprites in a rectangle. Does not work with rotated children.
 * The container's boundingbox is used as mask. 
 * @moduleName MaskedContainer
 */
bento.define('bento/maskedcontainer', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/gui/clickbutton',
    'bento/gui/counter',
    'bento/gui/text',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    ClickButton,
    Counter,
    Text,
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        /*settings = {
            // describe your settings object parameters
            position: Vector2 // positions the entity
        }*/
        var viewport = Bento.getViewport();
        var components = settings.components || [];
        var container;
        var maskedDraw = function (data) {
            // target rectangle to draw, determine x and y below
            var target;
            // mask is local to the container
            var mask = container.getBoundingBox();
            if (!this.currentAnimation || !this.visible) {
                return;
            }

            // do the sprite update
            var entity = data.entity;
            var eOrigin = entity.origin;
            this.updateFrame();

            // determine target
            // target is local to the sprite 
            target = new Rectangle(
                (-eOrigin.x - this.origin.x) | 0, 
                (-eOrigin.y - this.origin.y) | 0, 
                this.frameWidth, 
                this.frameHeight
            );

            // we have to transform the mask to the sprite's local space
            // first to world
            var maskTopLeftWorld = container.toWorldPosition(mask.getCorner(Rectangle.TOPLEFT));
            var maskBottomRightWorld = container.toWorldPosition(mask.getCorner(Rectangle.BOTTOMRIGHT));
            // world to sprite's local
            var maskTopLeft = entity.toLocalPosition(maskTopLeftWorld);
            var maskBottomRight = entity.toLocalPosition(maskBottomRightWorld);
            // construct a rectangle using the topleft and bottomright positions
            var localMask = new Rectangle(maskTopLeft.x, maskTopLeft.y, maskBottomRight.x - maskTopLeft.x, maskBottomRight.y - maskTopLeft.y);
            // get the intersection between mask and target
            var intersection = localMask.intersection(target);

            if (!intersection.width && !intersection.height) {
                // there is nothing to draw
                return;
            }
            // console.log(intersection)

            data.renderer.drawImage(
                this.spriteImage,
                this.sourceX + (intersection.x - target.x),
                this.sourceY + (intersection.y - target.y),
                intersection.width,
                intersection.height,
                intersection.x,
                intersection.y,
                intersection.width,
                intersection.height
            );
        };
        // traverse through children, find sprites
        var traverse = function (children) {
            Utils.forEach(children, function (child, i, l, breakLoop) {
                // check if this is an entity
                if (child.components) {
                    traverse(child.components);
                }
                // overwrite the sprite's draw function
                if (child.name === 'sprite' && child.draw !== maskedDraw) {
                    child.draw = maskedDraw;
                }
            });
        };

        traverse(components);

        // TODO: add a "watcher" component that inspects newly attached components

        container = new Entity(settings);
        return container;
    };
});