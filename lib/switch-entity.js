/**
 * A base object to hold components. Has dimension, position, scale and rotation properties (though these don't have much
 meaning until you attach a Sprite component). Entities can be added to the game by calling Bento.objects.attach().
 Entities can be visualized by using the Sprite component, or you can attach your own component and add a draw function.
 * <br>Exports: Constructor
 * @module {Entity} bento/entity
 * @moduleName Entity
 * @param {Object} settings - settings (all properties are optional)
 * @param {Function} settings.init - Called when entity is initialized
 * @param {Array} settings.components - Array of component module functions
 * @param {Array} settings.family - Array of family names. See {@link module:bento/managers/object#getByFamily}
 * @param {Vector2} settings.position - Vector2 of position to set
 * @param {Rectangle} settings.dimension - Size of the entity
 * @param {Rectangle} settings.boundingBox - Rectangle used for collision checking (if this does not exist, dimension is used as bounding box)
 * @param {Number} settings.z - z-index to set (note: higher values go on top)
 * @param {Number} settings.alpha - Opacity of the entity (1 = fully visible)
 * @param {Number} settings.rotation - Rotation of the entity in radians
 * @param {Vector2} settings.scale - Scale of the entity
 * @param {Boolean} settings.updateWhenPaused - Should entity keep updating when game is paused
 * @param {Boolean} settings.global - Should entity remain after hiding a screen
 * @param {Boolean} settings.float - Should entity move with the screen
 * @example
var entity = new Entity({
    z: 0,
    name: 'myEntity',
    position: new Vector2(32, 32),
    components: [new Sprite({
        imageName: 'myImage',
        originRelative: new Vector2(0.5, 1)    // bottom center origin
    })] // see Sprite module
 });
 * // attach entity to Bento Objects
 * Bento.objects.attach(entity);
 * @returns {Entity} Returns a new entity object
 * @snippet Entity|constructor
Entity({
    z: ${1:0},
    name: '$2',
    family: [''],
    position: new Vector2(${3:0}, ${4:0}),
    components: [
        $5
    ]
});
 */
bento.define('bento/entity', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/transformmatrix',
    'bento/transform'
], function (
    Bento,
    Utils,
    Vector2,
    Rectangle,
    Matrix,
    Transform
) {
    'use strict';
    return function (settings) {
        var i, l;
        var entity = new EJEntity();
        entity.family = [];
        entity.components = [];

        entity.collidesWith = function (settings) {
            // dissect the settings and then send them to the cpp side
            var thisEntity = this;
            var checkForCollision;
            var colType;
            if (settings.entity) {
                // single entity
                if (!settings.entity.isEntity) {
                    console.log("WARNING: settings.entity is not an entity");
                    return null;
                }
                checkForCollision = settings.entity;
                colType = 0;
            } else if (settings.entities) {
                if (!Utils.isArray(settings.entities)) {
                    console.log("WARNING: settings.entities is not an array");
                    return null;
                }
                checkForCollision = settings.entities;
                if (!checkForCollision.length) {
                    return null;
                }
                checkForCollision = checkForCollision.concat(settings.entities);
            } else if (settings.name) {
                checkForCollision = Bento.objects.getByName(settings.name);
                colType = 2;
            } else if (settings.family) {
                checkForCollision = [];
                var pool;
                Utils.forEach(settings.family, function (family, i, l, breakLoop) {
                    // code here
                    pool = Bento.objects.getByFamily(family);
                    if (pool) {
                        checkForCollision = checkForCollision.concat(pool);
                    }
                });
            } else if (settings.rectangle) {
                checkForCollision = settings.rectangle;
                colType = 1;
            }
            var offset;
            if (settings.offset) {
                offset = settings.offset;
            } else {
                offset = new Vector2();
            }

            var firstOnly = true;
            if (settings.firstOnly !== void(0)) {
                firstOnly = settings.firstOnly;
            }

            // onCollide used to be null but crashes on rare occasions, so define an empty function instead
            var onCollide = function () {};
            if (settings.onCollide !== void(0)) {
                onCollide = settings.onCollide;
            }

            if (Utils.isArray(checkForCollision)) {
                if (!checkForCollision.length) {
                    return null;
                }
                var colObj;
                var retArray = [];
                Utils.forEach(checkForCollision, function (item, i, l, breakLoop) {
                    if (firstOnly) {
                        colObj = thisEntity.jsCollidesWith(0, item, offset, onCollide, firstOnly);
                        if (colObj) {
                            breakLoop();
                        }
                    } else {
                        colObj = thisEntity.jsCollidesWith(0, item, offset, onCollide, firstOnly);
                        if (colObj) {
                            retArray.push(colObj);
                        }
                    }
                });
                if (!firstOnly) {
                    return retArray;
                }
                return colObj;
            }
            // check normally
            return thisEntity.jsCollidesWith(colType, checkForCollision, offset, onCollide, firstOnly);
        };

        entity.attach = function (child, force) {
            if (!child) {
                Utils.log("ERROR: trying to attach " + child);
                return;
            }
            if (!force && (child.isAdded || child.parent)) {
                Utils.log("ERROR: Child " + child.name + " was already attached.");
                return;
            }
            this.components.push(child);
            return this.jsAttach(child, force);
        };

        entity.remove = function (child) {
            if (!child) {
                return;
            }
            var index = this.components.indexOf(child);
            if (index >= 0) {
                this.components[index] = null;
            }
            return this.jsRemove(child);
        };

        entity.removeByName = function (name) {
            var entity = this;
            entity.getComponent(name, function (component) {
                return entity.remove(component);
            });
        };

        entity.extend = function (object) {
            return Utils.extend(this, object);
        };

        if (settings) {
            if (settings.position) {
                entity.position = settings.position; // should this be cloned?
            }
            if (settings.dimension) {
                entity.dimension = settings.dimension;
            }
            if (settings.boundingBox) {
                entity.boundingBox = settings.boundingBox;
            }
            if (settings.scale) {
                entity.scale = settings.scale;
            }
            if (settings.name) {
                entity.name = settings.name;
            }
            if (settings.family) {
                if (!Utils.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0, l = settings.family.length; i < l; ++i) {
                    // do not use this in game code unless you know what you are doing
                    entity.pushToFamily(settings.family[i]);
                    entity.family.push(settings.family[i]);
                }
            }
            if (settings.alpha !== void(0)) {
                entity.alpha = settings.alpha;
            }
            if (settings.rotation !== void(0)) {
                entity.rotation = settings.rotation;
            }
            if (settings.visible !== void(0)) {
                entity.visible = settings.visible;
            }

            entity.z = settings.z || 0;
            entity.updateWhenPaused = settings.updateWhenPaused || 0;
            entity.global = settings.global || false;
            entity.float = settings.float || false;

            // attach components after initializing other variables
            if (settings.components) {
                if (!Utils.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0, l = settings.components.length; i < l; ++i) {
                    entity.jsAttach(settings.components[i]);
                    entity.components.push(settings.components[i]);
                }
            }
            // you might want to do things before the entity returns
            if (settings.init) {
                settings.init.apply(entity);
            }

            if (settings.addNow) {
                Bento.objects.add(entity);
            }
        }

        return entity;
    };
});