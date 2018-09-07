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
    var cleanComponents = function (entity) {
        // remove null components
        var i;
        for (i = entity.components.length - 1; i >= 0; --i) {
            if (!entity.components[i]) {
                entity.components.splice(i, 1);
            }
        }
    };
    var id = 0;

    var Entity = function (settings) {
        if (!(this instanceof Entity)) {
            return new Entity(settings);
        }
        var i, l;
        /**
         * Name of the entity
         * @instance
         * @default ''
         * @name name
         * @snippet #Entity.name|String
            name
         * @snippet #Entity.isAdded|read-only
            isAdded
         */
        this.name = '';
        /**
         * Position of the entity
         * @instance
         * @default Vector2(0, 0)
         * @name position
         * @snippet #Entity.position|Vector2
            position
         */
        this.position = new Vector2(0, 0);
        /*
         * UNLISTED developer should never edit this array directly
         * Families of the entity. Note: edit this before the entity is attached.
         * @instance
         * @default []
         * @see module:bento/managers/object#getByFamily
         * @name family
         */
        this.family = [];
        /*
         * UNLISTED developer should never edit this array directly
         * Components of the entity
         * @instance
         * @default []
         * @name components
         * @snippet #Entity.components|Array
            components
         */
        this.components = [];

        this.global = false;
        /**
         * Indicates if an object should move with the scrolling of the screen
         * @instance
         * @default false
         * @name float
         * @snippet #Entity.float|Boolean
            float
         */
        this.float = false;
        /**
         * Indicates if an object should continue updating when the game is paused.
         * If updateWhenPaused is larger or equal than the pause level then the
         * game ignores the pause.
         * @instance
         * @default 0
         * @name updateWhenPaused
         * @snippet #Entity.updateWhenPaused|Number
            updateWhenPaused
         */
        this.updateWhenPaused = 0;
        this.isAdded = false;
        /**
         * Dimension of the entity
         * @instance
         * @default Rectangle(0, 0, 0, 0)
         * @name dimension
         * @snippet #Entity.dimension|Rectangle
            dimension
         */
        this.dimension = new Rectangle(0, 0, 0, 0);
        /**
         * Boundingbox of the entity
         * @instance
         * @default null
         * @see module:bento/entity#getBoundingBox for usage
         * @name boundingBox
         * @snippet #Entity.boundingBox|Rectangle
            boundingBox
         */
        this.boundingBox = settings.boundingBox || null;
        /**
         * Scale of the entity
         * @instance
         * @default Vector2(1, 1)
         * @name scale
         * @snippet #Entity.scale|Vector2
            scale
         */
        this.scale = new Vector2(1, 1);
        /**
         * Rotation of the entity in radians
         * @instance
         * @default 0
         * @name rotation
         * @snippet #Entity.rotation|Number
            rotation
         */
        this.rotation = 0;
        /**
         * Opacity of the entity
         * @instance
         * @default 1
         * @name alpha
         * @snippet #Entity.alpha|Number
            alpha
         */
        this.alpha = 1;
        /**
         * Whether the entity calls the draw function
         * @instance
         * @default true
         * @name visible
         * @snippet #Entity.visible|Boolean
            visible
         */
        this.visible = true;
        /**
         * Unique id
         * @instance
         * @name id
         * @snippet #Entity.id|Number
            id
         */
        this.id = id++;
        /**
         * z-index of an object
         * @instance
         * @default 0
         * @name z
         * @snippet #Entity.z|Number
            z
         */
        this.z = 0;
        /**
         * Index position of its parent (if any)
         * @instance
         * @default -1
         * @name rootIndex
         */
        this.rootIndex = -1;
        /**
         * Timer value, incremented every update step (dependent on game speed)
         * @instance
         * @default 0
         * @name timer
         * @snippet #Entity.timer|Number
            timer
         */
        this.timer = 0;
        /**
         * Ticker value, incremented every update step (independent of game speed)
         * @instance
         * @default 0
         * @name ticker
         * @snippet #Entity.ticker|Number
            ticker
         */
        this.ticker = 0;
        /**
         * Indicates if an object should not be destroyed when a Screen ends
         * @instance
         * @default false
         * @name global
         * @snippet #Entity.global|Boolean
            global
         */
        /**
         * Transform module
         * @instance
         * @name transform
         * @snippet #Entity.transform|Transform
            transform
         */
        this.transform = new Transform(this);
        /**
         * Entity's parent object, is set by the attach function, not recommended to set manually unless you know what you're doing.
         * @instance
         * @default null
         * @see module:bento/entity#attach
         * @name parent
         * @snippet #Entity.parent|read-only
            parent
         */
        this.parent = null;
        /**
         * Reference to the settings parameter passed to the constructor
         * @instance
         * @name settings
         * @snippet #Entity.settings|Object
            settings
         */
        this.settings = settings;
        // Current component that is being processed, useful for debugging
        this.currentComponent = null;

        // read settings
        if (settings) {
            if (settings.position) {
                this.position = settings.position; // should this be cloned?
            }
            if (settings.dimension) {
                this.dimension = settings.dimension;
            }
            if (settings.scale) {
                this.scale = settings.scale;
            }
            if (settings.name) {
                this.name = settings.name;
            }
            if (settings.family) {
                if (!Utils.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0, l = settings.family.length; i < l; ++i) {
                    this.family.push(settings.family[i]);
                }
            }
            if (Utils.isDefined(settings.alpha)) {
                this.alpha = settings.alpha;
            }
            if (Utils.isDefined(settings.rotation)) {
                this.rotation = settings.rotation;
            }
            if (Utils.isDefined(settings.visible)) {
                this.visible = settings.visible;
            }

            this.z = settings.z || 0;
            this.updateWhenPaused = settings.updateWhenPaused || 0;
            this.global = settings.global || false;
            this.float = settings.float || false;

            // attach components after initializing other variables
            if (settings.components) {
                if (!Utils.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0, l = settings.components.length; i < l; ++i) {
                    this.attach(settings.components[i]);
                }
            }
            // you might want to do things before the entity returns
            if (settings.init) {
                settings.init.apply(this);
            }

            if (settings.addNow) {
                Bento.objects.add(this);
            }
        }
    };
    Entity.prototype.isEntity = function () {
        return true;
    };

    /**
     * Extends properties of entity
     * @function
     * @instance
     * @param {Object} object - other object
     * @see module:bento/utils#extend
     * @example
var entity = new Entity({});

entity.extend({
    addX: function (x) {
        entity.position.x += x;
        // alternatively, this.position.x would work too.
    }
});

entity.addX(10);
    * @snippet #Entity.extend|Entity
extend(${1:{}});
     * @returns {Entity} Returns itself
     * @name extend
     */
    Entity.prototype.extend = function (object) {
        return Utils.extend(this, object);
    };
    /**
     * Returns the bounding box of an entity that's ready to be compared for collisions.
     * If no bounding box was set to entity.boundingBox, the dimension assumed as bounding box size.
     * entity.boundingBox is a Rectangle relative the entity's position, while getBoundingBox returns
     * a rectangle that's positioned in world space and scaled appropiately (AABB only, does not take into account rotation)
     * @function
     * @returns {Rectangle} boundingbox - Entity's boundingbox with translation and scaling
     * @instance
     * @name getBoundingBox
    * @snippet #Entity.getBoundingBox|Rectangle
getBoundingBox();
     * @returns {Rectangle} A rectangle representing the boundingbox of the entity
     */
    var correctBoundingBox = function (entity, boundingBox) {
        // this function offsets a boundingbox with an entity's position and scale
        var box = boundingBox.clone();
        var position = entity.position;
        var scale = entity.scale;
        // note that we need the abs of scale to prevent negative widths
        box.x *= Math.abs(scale.x);
        box.y *= Math.abs(scale.y);
        box.width *= Math.abs(scale.x);
        box.height *= Math.abs(scale.y);
        box.x += position.x;
        box.y += position.y;
        return box;
    };
    Entity.prototype.getBoundingBox = function () {
        return correctBoundingBox(this, this.boundingBox || this.dimension);
    };

    /**
     * Attaches a child object to the entity. Entities can form a scenegraph this way.
     * This is one of the most important functions in Bento. It allows you to attach new behaviors
     * to the entity by attaching components or other Entities.
     * The parent entity calls start(), destroy(), update() and draw() in the child.
     * The child will have a 'parent' property, which references the parent entity.
     * @function
     * @param {Object} child - The child object to attach (can be anything)
     * @param {Boolean} force - Allow duplicate attaching
     * @instance
     * @example
var entity = new Entity({}),
    // we define a simple object literal that acts as a container for functions
    child = {
        name: 'childObject', // for retrieving the child later if needed
        start: function (data) {
            console.log('Logged when entity is attached (not when child is attached)');
        },
        destroy: function (data) {
            console.log('Logged when child is removed or when entity is removed');
        },
        update: function (data) {
            console.log('Logged every tick during the update loop');
        },
        draw: function (data) {
            console.log('Logged every tick during the draw loop');
        }
    };

// You can use object literals to attach or define new classes. The child could also be another Entity with a sprite!
entity.attach(child);

// attach the entity to the game
Bento.objects.attach(entity);
     * @name attach
     * @snippet #Entity.attach|Entity
attach(${1});
     * @returns {Entity} Returns itself (useful for chaining attach calls)
     */
    Entity.prototype.attach = function (child, force) {
        var parent = this,
            data = Bento.getGameData();

        if (!child) {
            Utils.log("ERROR: trying to attach " + child);
            return;
        }

        if (!force && (child.isAdded || child.parent)) {
            Utils.log("ERROR: Child " + child.name + " was already attached.");
            return;
        }

        data.entity = this;

        // attach the child
        // NOTE: attaching will always set the properties "parent" and "rootIndex"
        child.parent = this;
        child.rootIndex = this.components.length;
        this.components.push(child);
        // call child.attached
        if (child.attached) {
            child.attached(data);
        }

        // the parent entity was already added: call start on the child
        if (this.isAdded) {
            if (child.start) {
                child.start(data);
            }
        } else {
            // maybe the parent entity itself is a child, search for any grandparent that's added
            if (parent.parent) {
                parent = parent.parent;
            }
            while (parent) {
                if (parent.isAdded) {
                    if (child.start) {
                        child.start(data);
                    }
                    break;
                }
                parent = parent.parent;
            }
        }
        return this;
    };
    /**
     * Removes a child object from the entity. Note that destroy will be called in the child.
     * @function
     * @param {Object} child - The child object to remove
     * @instance
     * @name remove
     * @snippet #Entity.remove|Entity
remove();
     * @returns {Entity} Returns itself
     */
    Entity.prototype.remove = function (child) {
        var i, type, index;
        var parent = this;
        var data = Bento.getGameData();

        if (!child) {
            return;
        }
        index = this.components.indexOf(child);
        this.components[index] = null;

        if (index >= 0) {
            // the parent entity is an added entity: call destroy on the child
            if (this.isAdded) {
                if (child.destroy) {
                    child.destroy(data);
                }
            } else {
                // maybe the parent entity itself is a child, search for any grandparent that's added
                if (parent.parent) {
                    parent = parent.parent;
                }
                while (parent) {
                    if (parent.isAdded) {
                        if (child.destroy) {
                            child.destroy(data);
                        }
                        break;
                    }
                    parent = parent.parent;
                }
            }

            if (child.removed) {
                child.removed(data);
            }
            child.parent = null;
            child.rootIndex = -1; // note that sibling rootIndex may be incorrect until the next update loop
        }
        return this;
    };
    /**
     * Searches a child with certain name and removes the first result. Does nothing if not found
     * @function
     * @param {String} name - The name of the child object to remove
     * @instance
     * @name removeByName
     * @snippet #Entity.removeByName|Entity
removeByName('$1');
     * @returns {Entity} Returns itself
     */
    Entity.prototype.removeByName = function (name) {
        var entity = this;

        entity.getComponent(name, function (component) {
            entity.remove(component);
        });
        return this;
    };
    /**
     * Removes self from game (either from Bento.objects or its parent)
     * @function
     * @instance
     * @name removeSelf
     * @snippet #Entity.removeSelf|Entity
removeSelf();
     * @returns {Entity} Returns itself
     */
    Entity.prototype.removeSelf = function (name) {
        var entity = this;

        if (entity.parent) {
            // remove from parent
            entity.parent.remove(entity);
        } else if (entity.isAdded) {
            // remove from Bento.objects
            Bento.objects.remove(entity);
        }

        return this;
    };
    /**
     * Callback when component is found
     * this: refers to the component
     *
     * @callback FoundCallback
     * @param {Component} component - The component
     * @param {Number} index - Index of the component
     */
    /**
     * Returns the first child found with a certain name
     * @function
     * @instance
     * @param {String} name - name of the component
     * @param {FoundCallback} callback - called when component is found
     * @name getComponent
     * @snippet #Entity.getComponent|Entity
getComponent('${1}', function (${1:component}) {
    $2
});
     * @returns {Entity} Returns the component, null if not found
     */
    Entity.prototype.getComponent = function (name, callback) {
        var i, l, component;
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.name === name) {
                if (callback) {
                    callback.apply(component, [component, i]);
                }
                return component;
            }
        }
        return null;
    };

    /**
     * Moves a child to a certain index in the array
     * @function
     * @instance
     * @param {Object} child - reference to the child
     * @param {Number} index - new index
     * @name moveComponentTo
     * @snippet #Entity.moveComponentTo|Entity
moveComponentTo(${1:component}, ${2:index});
     */
    Entity.prototype.moveComponentTo = function (component, newIndex) {
        // note: currently dangerous to do during an update loop
        var i, type, index;
        if (!component) {
            return;
        }
        index = this.components.indexOf(component);
        if (index >= 0) {
            // remove old
            this.components.splice(index, 1);
            // insert at new place
            this.components.splice(newIndex, 0, component);
        }
    };
    /**
     * Add this entity to a family
     * @function
     * @instance
     * @param {String} family - the family that the entity should be added to
     */
    Entity.prototype.addToFamily = function (f) {
        if (this.family.indexOf(f) !== -1) {
            return;
        }
        this.family.push(f);
        Bento.objects.addObjectToFamily(this, f);
    };
    /**
     * Remove this entity from a family
     * @function
     * @instance
     * @param {String} family - the family that this entity should be removed from
     */
    Entity.prototype.removeFromFamily = function (f) {
        var idx = this.family.indexOf(f);
        if (idx === -1) {
            return;
        }
        this.family.splice(idx, 1);
        Bento.objects.removeObjectFromFamily(this, f);
    };
    /**
     * Check if the entity is part of a family
     * @function
     * @instance
     * @param {String} family
     */
    Entity.prototype.isFamily = function (f) {
        return (this.family.indexOf(f) !== -1);
    };
    /**
     * Callback when entities collide.
     *
     * @callback CollisionCallback
     * @param {Entity} other - The other entity colliding
     */
    /**
     * Checks if entity is colliding with another entity or entities
     * @function
     * @instance
     * @param {Object} settings
     * @param {Entity} settings.entity - The other entity
     * @param {Array} settings.entities - Or an array of entities to check with
     * @param {String} settings.name - Or the other entity's name (use family for better performance)
     * @param {String} settings.family - Or the name of the family to collide with
     * @param {Entity} settings.rectangle - Or if you want to check collision with a shape directly instead of entity
     * @param {Vector2} [settings.offset] - A position offset
     * @param {CollisionCallback} [settings.onCollide] - Called when entities are colliding
     * @param {Boolean} [settings.firstOnly] - For detecting only first collision or more, default true
     * @name collidesWith
     * @snippet #Entity.collidesWith|Entity/Array
collidesWith({
    entity: obj, // when you have the reference
    entities: [], // or when colliding with this array
    name: '', // or when colliding with a single entity
    family: '', // or when colliding with a family
    rectangle: rect, // or when colliding with a rectangle
    offset: vec2, // offset the collision check on original entity's position
    firstOnly: true, // onCollide stops after having found single collision 
    onCollide: function (other) {
        // other is the other entity that is collided with
        // onCollide is not called if no collision occurred 
    }
});
     * @returns {Entity/Array} The collided entity/entities, otherwise null
     */
    // * @param {Array} settings.families - multiple families
    Entity.prototype.collidesWith = function (settings, deprecated_offset, deprecated_callback) {
        var intersect = false;
        var box;
        var otherBox;
        var i, l;
        var obj;
        var array = [];
        var offset = new Vector2(0, 0);
        var callback;
        var firstOnly = true;
        var collisions = null;
        var component;

        if (settings.isEntity) {
            // old method with parameters: collidesWith(entity, offset, callback)
            array = [settings];
            offset = deprecated_offset || offset;
            callback = deprecated_callback;
        } else if (Utils.isArray(settings)) {
            // old method with parameters: collidesWith(array, offset, callback)
            array = settings;
            offset = deprecated_offset || offset;
            callback = deprecated_callback;
        } else {
            // read settings
            offset = settings.offset || offset;
            if (Utils.isDefined(settings.firstOnly)) {
                firstOnly = settings.firstOnly;
            }
            callback = settings.onCollide;

            if (settings.entity) {
                // single entity
                if (!settings.entity.isEntity) {
                    Utils.log("WARNING: settings.entity is not an entity");
                    return null;
                }
                array = [settings.entity];
            } else if (settings.entities) {
                if (!Utils.isArray(settings.entities)) {
                    Utils.log("WARNING: settings.entities is not an array");
                    return null;
                }
                array = settings.entities;
            } else if (settings.name) {
                array = Bento.objects.getByName(settings.name);
            } else if (settings.family) {
                array = Bento.objects.getByFamily(settings.family);
            } else if (settings.rectangle) {
                array = [settings.rectangle];
            }
        }

        if (!array.length) {
            return null;
        }
        box = this.getBoundingBox().offset(offset);
        for (i = 0, l = array.length; i < l; ++i) {
            obj = array[i];

            if (obj.isEntity) {
                // ignore self collision
                if (obj.id === this.id) {
                    continue;
                }
                otherBox = obj.getBoundingBox();
            } else if (obj.isRectangle) {
                otherBox = obj;
            }
            if (box.intersect(otherBox)) {
                if (callback) {
                    callback(obj);
                }
                if (firstOnly) {
                    // return the first collision it can find
                    return obj;
                } else {
                    // collect other collisions
                    collisions = collisions || [];
                    collisions.push(obj);
                }
            }

        }
        return collisions;
    };
    /* DEPRECATED
     * Checks if entity is colliding with any entity in an array
     * Returns the first entity it finds that collides with the entity.
     * @function
     * @instance
     * @param {Object} settings
     * @param {Array} settings.entities - Array of entities, ignores self if present
     * @param {Array} settings.family - Name of family
     * @param {Vector2} [settings.offset] - A position offset
     * @param {CollisionCallback} [settings.onCollide] - Called when entities are colliding
     * @name collidesWithGroup
     * @returns {Entity} Returns the entity it collides with, null if none found
     */
    Entity.prototype.collidesWithGroup = function (settings, deprecated_offset, deprecated_callback) {
        var i, l, obj, box;
        var array, offset, callback;

        // old method with parameters
        if (Utils.isArray(settings) || Utils.isDefined(deprecated_offset) || Utils.isDefined(deprecated_callback)) {
            array = settings;
            offset = deprecated_offset || new Vector2(0, 0);
            callback = deprecated_callback;
        } else {
            array = settings.other;
            offset = settings.offset;
            callback = settings.onCollide;
        }

        if (!Utils.isArray(array)) {
            Utils.log("ERROR: Collision check must be with an Array of object");
            return;
        }
        if (!array.length) {
            return null;
        }
        box = this.getBoundingBox().offset(offset);
        for (i = 0, l = array.length; i < l; ++i) {
            obj = array[i];
            if (obj.id && obj.id === this.id) {
                continue;
            }
            if (obj.getBoundingBox && box.intersect(obj.getBoundingBox())) {
                if (callback) {
                    callback(obj);
                }
                return obj;
            }
        }
        return null;
    };

    /**
     * Transforms this entity's position to the world position
     * @function
     * @instance
     * @name getWorldPosition
     * @returns {Vector2} Returns a position
     * @snippet #Entity.getWorldPosition|Entity
getWorldPosition();
     */
    Entity.prototype.getWorldPosition = function () {
        return this.transform.getWorldPosition();
    };

    /**
     * Transforms a position local to entity's space to the world position
     * @function
     * @instance
     * @name toWorldPosition
     * @param {Vector2} localPosition - A position to transform to world position
     * @returns {Vector2} Returns a position
     */
    Entity.prototype.toWorldPosition = function (localPosition) {
        return this.transform.toWorldPosition(localPosition);
    };
    /**
     * Transforms a world position to the entity's local position
     * @function
     * @instance
     * @name toLocalPosition
     * @param {Vector2} worldPosition - A position to transform to local position
     * @returns {Vector2} Returns a position relative to the entity
     */
    Entity.prototype.toLocalPosition = function (worldPosition) {
        return this.transform.toLocalPosition(worldPosition);
    };

    /**
     * Transforms a world position to the same space as the entity's
     * @function
     * @instance
     * @name toComparablePosition
     * @param {Vector2} worldPosition - A vector2 to transform
     * @returns {Vector2} Returns a position relative to the entity's parent
     * @snippet #Entity.toComparablePosition|Entity
toComparablePosition(${1:worldPosition});
     */
    Entity.prototype.toComparablePosition = function (worldPosition) {
        return this.transform.toComparablePosition(worldPosition);
    };

    /*
     * Implementations of callback functions from here on.
     * These are the functions that the Entity passes to it's children (components).
     * The developer shouldn't need to call these functions themselves.
     * Overwrite only if you know what you're doing
     */
    Entity.prototype.start = function (data) {
        var i,
            l,
            component;
        data = data || Bento.getGameData();
        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.start) {
                data.entity = this;
                component.start(data);
            }
        }
    };
    Entity.prototype.destroy = function (data) {
        var i,
            l,
            component,
            components = this.components;
        data = data || Bento.getGameData();
        // update components
        for (i = 0, l = components.length; i < l; ++i) {
            component = components[i];
            if (component && component.destroy) {
                data.entity = this;
                component.destroy(data);
            }
        }
    };
    Entity.prototype.update = function (data) {
        var i,
            l,
            component,
            components = this.components;

        data = data || Bento.getGameData();
        // update components
        for (i = 0, l = components.length; i < l; ++i) {
            component = components[i];
            if (component && component.update) {
                this.currentComponent = component;
                data.entity = this;
                component.rootIndex = i;
                component.update(data);
            }
        }

        this.timer += data.speed;
        this.ticker += 1;

        // clean up
        cleanComponents(this);
        this.currentComponent = null;
    };
    Entity.prototype.draw = function (data) {
        var i, l, component;
        var components = this.components;
        var matrix;
        if (!this.visible || !this.transform.visible) {
            return;
        }
        data = data || Bento.getGameData();

        if (!this.transform.draw(data)) {
            // transform invalid, no need to draw at all
            return;
        }

        // call components
        for (i = 0, l = components.length; i < l; ++i) {
            component = components[i];
            if (component && component.draw) {
                this.currentComponent = component;
                data.entity = this;
                component.draw(data);
            }
        }
        // post draw
        for (i = components.length - 1; i >= 0; i--) {
            component = components[i];
            if (component && component.postDraw) {
                data.entity = this;
                component.postDraw(data);
            }
        }

        this.transform.postDraw(data);
        this.currentComponent = null;
    };
    /*
     * Entity was attached, calls onParentAttach to all children
     */
    Entity.prototype.attached = function (data) {
        var i,
            l,
            component;

        data = data || Bento.getGameData();
        data.entity = this;
        data.parent = this.parent;

        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component) {
                if (component.onParentAttached) {
                    data.entity = this;
                    component.onParentAttached(data);
                }
            }
        }
    };
    /*
     * Entity was removed, calls onParentRemoved to all children
     */
    Entity.prototype.removed = function (data) {
        var i,
            l,
            component;

        data = data || Bento.getGameData();
        data.entity = this;
        data.parent = this.parent;

        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component) {
                if (component.onParentRemoved) {
                    data.entity = this;
                    component.onParentRemoved(data);
                }
            }
        }
    };
    /* DEPRECATED
     * Calls onParentCollided on every child, additionally calls onCollide on self afterwards
     */
    Entity.prototype.collided = function (data) {
        var i,
            l,
            component;

        if (data) {
            data.entity = this;
            data.parent = this.parent;
        } else {
            throw "Must pass a data object";
        }
        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component) {
                if (component.onParentCollided) {
                    data.entity = this;
                    component.onParentCollided(data);
                }
            }
        }
        if (this.onCollide) {
            this.onCollide(data.other);
        }
    };

    Entity.prototype.toString = function () {
        return '[object Entity]';
    };

    return Entity;
});