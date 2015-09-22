/**
 * A base object to hold components
 * <br>Exports: Function
 * @entity {Entity} bento/entity
 * @param {Object} settings - settings (all properties are optional)
 * @param {Function} settings.init - Called when entity is initialized
 * @param {Function} settings.onCollide - Called when object collides in HSHG
 * @param {Array} settings.components - Array of component module functions
 * @param {Array} settings.family - Array of family names
 * @param {Vector2} settings.position - Vector2 of position to set
 * @param {Vector2} settings.origin - Vector2 of origin to set
 * @param {Vector2} settings.originRelative - Vector2 of relative origin to set
 * @param {Boolean} settings.z - z-index to set
 * @param {Boolean} settings.updateWhenPaused - Should entity keep updating when game is paused
 * @param {Boolean} settings.global - Should entity remain after hiding a screen
 * @param {Boolean} settings.float - Should entity move with the screen
 * @param {Boolean} settings.useHshg - Should entity use HSHG for collisions
 * @param {Boolean} settings.staticHshg - Is entity a static object in HSHG (doesn't check collisions on others, but can get checked on)
 * @returns {Entity} Returns a new entity object
 */
bento.define('bento/entity', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/rectangle'
], function (Bento, Utils, Vector2, Rectangle) {
    'use strict';
    var cleanComponents = function (entity) {
            // remove null components
            var i;
            for (i = entity.components.length - 1; i >= 0; --i) {
                if (!entity.components[i]) {
                    entity.components.splice(i, 1);
                }
            }
        },
        id = 0;

    var entity = function (settings) {
        var i;
        this.id = id++;
        /**
         * z-index of an object
         * @instance
         * @default 0
         * @name z
         */
        this.z = 0;
        /**
         * Timer value, incremented every update step
         * @instance
         * @default 0
         * @name timer
         */
        this.timer = 0;
        /**
         * Indicates if an object should not be destroyed when a Screen ends
         * @instance
         * @default false
         * @name global
         */
        this.global = false;
        /**
         * Indicates if an object should move with the scrolling of the screen
         * @instance
         * @default false
         * @name float
         */
        this.float = false;
        /**
         * Indicates if an object should continue updating when the game is paused
         * @instance
         * @default false
         * @name updateWhenPaused
         */
        this.updateWhenPaused = false;
        /**
         * Name of an object
         * @instance
         * @default ''
         * @name name
         */
        this.name = '';
        this.isAdded = false;
        /**
         * Name of an object
         * @instance
         * @default ''
         * @name useHshg
         */
        this.useHshg = false;
        this.position = new Vector2(0, 0);
        this.origin = new Vector2(0, 0);
        this.family = [];
        this.components = [];
        this.dimension = new Rectangle(0, 0, 0, 0);
        this.boundingBox = null;
        this.scale = new Vector2(1, 1);
        this.rotation = 0;
        this.visible = true;
        this.parent = null;
        this.settings = settings;

        // read settings
        if (settings) {
            if (settings.components) {
                if (!Utils.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0; i < settings.components.length; ++i) {
                    this.attach(settings.components[i]);
                }
            }
            if (settings.position) {
                this.position = settings.position;
            }
            if (settings.origin) {
                this.origin = settings.origin;
            }
            if (settings.originRelative) {
                this.setOriginRelative(settings.originRelative);
            }
            if (settings.name) {
                this.name = settings.name;
            }
            if (settings.family) {
                if (!Utils.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0; i < settings.family.length; ++i) {
                    this.family.push(settings.family[i]);
                }
            }
            if (settings.init) {
                settings.init.apply(this);
            }

            this.z = settings.z || 0;
            this.updateWhenPaused = settings.updateWhenPaused || false;
            this.global = settings.global || false;
            this.float = settings.float || false;
            this.useHshg = settings.useHshg || false;
            this.staticHshg = settings.staticHshg || false;
            this.onCollide = settings.onCollide;

            if (settings.addNow) {
                Bento.objects.add(this);
            }
        }
    };

    /**
     * Calls start on every component
     * @function
     * @param {Object} data - gameData object
     * @instance
     * @name start
     */
    entity.prototype.start = function (data) {
        var i,
            l,
            component;
        data = data || {};
        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.start) {
                data.entity = this;
                component.start(data);
            }
        }
    };
    /**
     * Calls destroy on every component
     * @function
     * @param {Object} data - gameData object
     * @instance
     * @name destroy
     */
    entity.prototype.destroy = function (data) {
        var i,
            l,
            component;
        data = data || {};
        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.destroy) {
                data.entity = this;
                component.destroy(data);
            }
        }
    };
    /**
     * Calls update on every component
     * @function
     * @param {Object} data - gameData object
     * @instance
     * @name update
     */
    entity.prototype.update = function (data) {
        var i,
            l,
            component;

        data = data || {};
        // update components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.update) {
                data.entity = this;
                component.update(data);
            }
        }
        ++this.timer;

        // clean up
        cleanComponents(this);
    };
    /**
     * Calls draw on every component
     * @function
     * @param {Object} data - gameData object
     * @instance
     * @name draw
     */
    entity.prototype.draw = function (data) {
        var i,
            l,
            component;
        if (!this.visible) {
            return;
        }
        data = data || {};
        // call components
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.draw) {
                data.entity = this;
                component.draw(data);
            }
        }
        // post draw
        for (i = this.components.length - 1; i >= 0; i--) {
            component = this.components[i];
            if (component && component.postDraw) {
                data.entity = this;
                component.postDraw(data);
            }
        }
    };
    /**
     * Extends properties of entity
     * @function
     * @instance
     * @param {Object} object - other object
     * @see module:bento/utils#extend
     * @name extend
     */
    entity.prototype.extend = function (object) {
        return Utils.extend(this, object);
    };
    /**
     * Returns the bounding box of an entity. If no bounding box was set
     * previously, the dimension is returned.
     * @function
     * @returns {Rectangle} boundingbox - Entity's boundingbox
     * @instance
     * @name getBoundingBox
     */
    entity.prototype.getBoundingBox = function () {
        var scale, x1, x2, y1, y2, box;
        if (!this.boundingBox) {
            // TODO get rid of scale component dependency
            scale = this.scale ? this.scale : new Vector2(1, 1);
            x1 = this.position.x - this.origin.x * scale.x;
            y1 = this.position.y - this.origin.y * scale.y;
            x2 = this.position.x + (this.dimension.width - this.origin.x) * scale.x;
            y2 = this.position.y + (this.dimension.height - this.origin.y) * scale.y;
            // swap variables if scale is negative
            if (scale.x < 0) {
                x2 = [x1, x1 = x2][0];
            }
            if (scale.y < 0) {
                y2 = [y1, y1 = y2][0];
            }
            return new Rectangle(x1, y1, x2 - x1, y2 - y1);
        } else {
            // TODO: cloning could be expensive for polygons
            box = this.boundingBox.clone();
            scale = this.scale ? this.scale : new Vector2(1, 1);
            box.x *= Math.abs(scale.x);
            box.y *= Math.abs(scale.y);
            box.width *= Math.abs(scale.x);
            box.height *= Math.abs(scale.y);
            box.x += this.position.x;
            box.y += this.position.y;
            return box;
        }
    };
    /**
     * Sets the origin relatively (0...1)
     * @function
     * @param {Vector2} origin - Position of the origin (relative to upper left corner of the dimension)
     * @instance
     * @name setOriginRelative
     */
    entity.prototype.setOriginRelative = function (value) {
        this.origin.x = value.x * this.dimension.width;
        this.origin.y = value.y * this.dimension.height;
    };
    /**
     * Entity was attached, calls onParentAttach to all children
     * @param {Object} data - gameData
     * @instance
     * @name attached
     */
    entity.prototype.attached = function (data) {
        var i,
            l,
            component;

        if (data) {
            data.entity = this;
            data.parent = this.parent;
        } else {
            data = {
                entity: this,
                parent: this.parent
            };
        }
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
    /**
     * Calls onParentCollided on every child, additionally calls onCollide on self afterwards
     * @function
     * @param {Object} other - The other object/entity that collided
     * @instance
     * @name start
     */
    entity.prototype.collided = function (data) {
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
    /**
     * Attaches a child object to the entity. Entities can form a scenegraph.
     * Generally, entities act as nodes while components act like leaves.
     * Note that start will be called in the child.
     * @function
     * @param {Object} node - The child object to attach
     * @param {String} [name] - Name to expose in the entity. The child object can be reached by entity[name]
     * @instance
     * @name attach
     */
    entity.prototype.attach = function (child, name) {
        var mixin = {},
            parent = this;

        this.components.push(child);

        child.parent = this;

        if (child.init) {
            child.init();
        }
        if (child.attached) {
            child.attached({
                entity: this
            });
        }
        if (this.isAdded) {
            if (child.start) {
                child.start();
            }
        } else {
            if (parent.parent) {
                parent = parent.parent;
            }
            while (parent) {
                if (parent.isAdded) {
                    if (child.start) {
                        child.start();
                    }
                }
                parent = parent.parent;
            }
        }
        return this;
    };
    /**
     * Removes a child object from the entity. Note that destroy will be called in the child.
     * @function
     * @param {Object} node - The child object to remove
     * @instance
     * @name remove
     */
    entity.prototype.remove = function (child) {
        var i, type, index;
        if (!child) {
            return;
        }
        index = this.components.indexOf(child);
        if (index >= 0) {
            if (child.destroy) {
                child.destroy();
            }
            // TODO: clean child
            this.components[index] = null;
        }
        return this;
    };
    /**
     * Callback when component is found
     * this: refers to the component
     *
     * @callback FoundCallback
     * @param {Component} component - The component
     */
     /**
     * Returns the first child found with a certain name
     * @function
     * @instance
     * @param {String} name - name of the component
     * @param {FoundCallback} callback - called when component is found
     * @name getComponent
     */
    entity.prototype.getComponent = function (name, callback) {
        var i, l, component;
        for (i = 0, l = this.components.length; i < l; ++i) {
            component = this.components[i];
            if (component && component.name === name) {
                if (callback) {
                    callback.apply(component, [component]);
                }
                return component;
            }
        }
    };
    /**
     * Moves a child to a certain index in the array
     * @function
     * @instance
     * @param {Object} child - reference to the child
     * @param {Number} index - new index
     * @name moveComponentTo
     */
    entity.prototype.moveComponentTo = function (component, newIndex) {
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
     * Callback when entities collide.
     *
     * @callback CollisionCallback
     * @param {Entity} other - The other entity colliding
     */
    /**
     * Checks if entity is colliding with another entity
     * @function
     * @instance
     * @param {Entity} other - The other entity
     * @param {Vector2} [offset] - A position offset
     * @param {CollisionCallback} [callback] - Called when entities are colliding
     * @name collidesWith
     */
    entity.prototype.collidesWith = function (other, offset, callback) {
        var intersect;
        if (!Utils.isDefined(offset)) {
            offset = new Vector2(0, 0);
        }
        intersect = this.getBoundingBox().offset(offset).intersect(other.getBoundingBox());
        if (intersect && callback) {
            callback(other);
        }
        return intersect;
    };
    /**
     * Checks if entity is colliding with any entity in an array
     * Returns the first entity it finds that collides with the entity.
     * @function
     * @instance
     * @param {Array} other - Array of entities, ignores self if present
     * @param {Vector2} [offset] - A position offset
     * @param {CollisionCallback} [callback] - Called when entities are colliding
     * @name collidesWithGroup
     */
    entity.prototype.collidesWithGroup = function (array, offset, callback) {
        var i,
            obj,
            box;
        if (!Utils.isDefined(offset)) {
            offset = new Vector2(0, 0);
        }
        if (!Utils.isArray(array)) {
            // throw 'Collision check must be with an Array of object';
            console.log('Collision check must be with an Array of object');
            return;
        }
        if (!array.length) {
            return null;
        }
        box = this.getBoundingBox().offset(offset);
        for (i = 0; i < array.length; ++i) {
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
    entity.prototype.getAABB = function () {
        var box = this.getBoundingBox();
        return {
            min: [box.x, box.y],
            max: [box.x + box.width, box.y + box.height]
        };
    };
    return entity;
});