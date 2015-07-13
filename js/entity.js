/**
 * A base object to hold components
 * <br>Exports: Function
 * @module {Entity} bento/entity
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
 * @param {Boolean} settings.staticHshg - Is entity a static object in HSHG
 * @returns {Entity} Returns a new entity object
 */
bento.define('bento/entity', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/rectangle'
], function (Bento, Utils, Vector2, Rectangle) {
    'use strict';
    var globalId = 0;
    return function (settings) {
        var i,
            name,
            visible = true,
            position = Vector2(0, 0),
            angle = 0,
            scale = Vector2(0, 0),
            origin = Vector2(0, 0),
            dimension = Rectangle(0, 0, 0, 0),
            rectangle,
            components = [],
            family = [],
            removedComponents = [],
            parent = null,
            uniqueId = ++globalId,
            cleanComponents = function () {
                /*var i, component;
                while (removedComponents.length) {
                    component = removedComponents.pop();
                    // should destroy be called?
                    if (component.destroy) {
                        component.destroy();
                    }
                    Utils.removeObject(components, component);
                }
                */

                // remove null components
                var i;
                for (i = components.length - 1; i >= 0; --i) {
                    if (!components[i]) {
                        components.splice(i, 1);
                    }
                }
            },
            entity = {
                /**
                 * z-index of an object
                 * @instance
                 * @default 0
                 * @name z
                 */
                z: 0,
                /**
                 * Timer value, incremented every update step
                 * @instance
                 * @default 0
                 * @name timer
                 */
                timer: 0,
                /**
                 * Indicates if an object should not be destroyed when a Screen ends
                 * @instance
                 * @default false
                 * @name global
                 */
                global: false,
                /**
                 * Indicates if an object should move with the scrolling of the screen
                 * @instance
                 * @default false
                 * @name float
                 */
                float: false,
                /**
                 * Indicates if an object should continue updating when the game is paused
                 * @instance
                 * @default false
                 * @name updateWhenPaused
                 */
                updateWhenPaused: false,
                /**
                 * Name of an object
                 * @instance
                 * @default ''
                 * @name name
                 */
                name: '',
                isAdded: false,
                /**
                 * Name of an object
                 * @instance
                 * @default ''
                 * @name useHshg
                 */
                useHshg: false,
                /**
                 * Calls start on every component
                 * @function
                 * @param {Object} data - gameData object
                 * @instance
                 * @name start
                 */
                start: function (data) {
                    var i,
                        l,
                        component;
                    if (data) {
                        data.entity = this;
                    }
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.start) {
                            component.start(data);
                        }
                    }
                },
                /**
                 * Calls destroy on every component
                 * @function
                 * @param {Object} data - gameData object
                 * @instance
                 * @name destroy
                 */
                destroy: function (data) {
                    var i,
                        l,
                        component;
                    if (data) {
                        data.entity = this;
                    }
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.destroy) {
                            component.destroy(data);
                        }
                    }
                },
                /**
                 * Calls update on every component
                 * @function
                 * @param {Object} data - gameData object
                 * @instance
                 * @name update
                 */
                update: function (data) {
                    var i,
                        l,
                        component;

                    if (data) {
                        data.entity = this;
                    }
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.update) {
                            component.update(data);
                        }
                    }
                    ++entity.timer;

                    // clean up
                    cleanComponents();
                },
                /**
                 * Calls draw on every component
                 * @function
                 * @param {Object} data - gameData object
                 * @instance
                 * @name draw
                 */
                draw: function (data) {
                    var i,
                        l,
                        component;
                    if (!visible) {
                        return;
                    }
                    if (data) {
                        data.entity = this;
                    }
                    // call components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.draw) {
                            component.draw(data);
                        }
                    }
                    // post draw
                    for (i = components.length - 1; i >= 0; i--) {
                        component = components[i];
                        if (component && component.postDraw) {
                            component.postDraw(data);
                        }
                    }
                },
                /**
                 * Pushes string to its family array (Bento adds family members during the attach)
                 * @function
                 * @param {String} name - family name
                 * @instance
                 * @name addToFamily
                 */
                addToFamily: function (name) {
                    family.push(name);
                },
                /**
                 * Get family array
                 * @function
                 * @instance
                 * @name getFamily
                 */
                getFamily: function () {
                    return family;
                },
                /**
                 * Extends properties of entity
                 * @function
                 * @instance
                 * @param {Object} object - other object
                 * @see module:bento/utils#extend
                 * @name extend
                 */
                extend: function (object) {
                    return Utils.extend(entity, object);
                },
                /**
                 * Returns reference to entity position
                 * @function
                 * @instance
                 * @name getPosition
                 */
                getPosition: function () {
                    return position;
                },
                /**
                 * Sets entity position (copies vector values)
                 * @function
                 * @param {Vector2} vector - new position vector
                 * @instance
                 * @name setPosition
                 */
                setPosition: function (value) {
                    position.x = value.x;
                    position.y = value.y;
                },
                /**
                 * Sets entity x position
                 * @function
                 * @param {Number} x - new x position
                 * @instance
                 * @name setPositionX
                 */
                setPositionX: function (value) {
                    position.x = value;
                },
                /**
                 * Sets entity y position
                 * @function
                 * @param {Number} y - new x position
                 * @instance
                 * @name setPositionY
                 */
                setPositionY: function (value) {
                    position.y = value;
                },
                /**
                 * Returns reference to entity's size
                 * @function
                 * @returns {Rectangle} dimension - Reference to entity's size rectangle
                 * @instance
                 * @name getDimension
                 */
                getDimension: function () {
                    return dimension;
                },
                /**
                 * Sets entity's size
                 * @function
                 * @param {Rectangle} dimension - Reference to entity's size rectangle
                 * @instance
                 * @name getDimension
                 */
                setDimension: function (value) {
                    dimension = value;
                },
                /**
                 * Returns the bounding box of an entity. If no bounding box was set
                 * previously, the dimension is returned.
                 * @function
                 * @returns {Rectangle} boundingbox - Entity's boundingbox
                 * @instance
                 * @name getBoundingBox
                 */
                getBoundingBox: function () {
                    var scale, x1, x2, y1, y2, box;
                    if (!rectangle) {
                        // TODO get rid of scale component dependency
                        scale = entity.scale ? entity.scale.getScale() : Vector2(1, 1);
                        x1 = position.x - origin.x * scale.x;
                        y1 = position.y - origin.y * scale.y;
                        x2 = position.x + (dimension.width - origin.x) * scale.x;
                        y2 = position.y + (dimension.height - origin.y) * scale.y;
                        // swap variables if scale is negative
                        if (scale.x < 0) {
                            x2 = [x1, x1 = x2][0];
                        }
                        if (scale.y < 0) {
                            y2 = [y1, y1 = y2][0];
                        }
                        return Rectangle(x1, y1, x2 - x1, y2 - y1);
                    } else {
                        box = rectangle.clone();
                        scale = entity.scale ? entity.scale.getScale() : Vector2(1, 1);
                        box.x *= Math.abs(scale.x);
                        box.y *= Math.abs(scale.y);
                        box.width *= Math.abs(scale.x);
                        box.height *= Math.abs(scale.y);
                        box.x += position.x;
                        box.y += position.y;
                        return box;
                    }
                },
                /**
                 * Sets the entity's boundingbox
                 * @function
                 * @param {Rectangle} boundingbox - The entity's new bounding box
                 * @instance
                 * @name setBoundingBox
                 */
                setBoundingBox: function (value) {
                    rectangle = value;
                },
                /**
                 * Returns the bounding box of an entity. If no bounding box was set
                 * previously, undefined is returned.
                 * @function
                 * @returns {Rectangle} boundingbox - Entity's boundingbox
                 * @instance
                 * @name getRectangle
                 */
                getRectangle: function () {
                    return rectangle;
                },
                /**
                 * Sets the origin (center of rotation)
                 * @function
                 * @param {Vector2} origin - Position of the origin (relative to upper left corner of the dimension)
                 * @instance
                 * @name setOrigin
                 */
                setOrigin: function (value) {
                    origin.x = value.x;
                    origin.y = value.y;
                },
                /**
                 * Sets the origin relatively (0...1)
                 * @function
                 * @param {Vector2} origin - Position of the origin (relative to upper left corner of the dimension)
                 * @instance
                 * @name setOriginRelative
                 */
                setOriginRelative: function (value) {
                    origin.x = value.x * dimension.width;
                    origin.y = value.y * dimension.height;
                },
                /**
                 * Returns the origin (center of rotation)
                 * @function
                 * @returns {Vector2} origin - Entity's origin
                 * @instance
                 * @name getOrigin
                 */
                getOrigin: function () {
                    return origin;
                },
                /**
                 * Whether the entity is set to visible or not
                 * @function
                 * @returns {Boolean} visible - Visibility state
                 * @instance
                 * @name isVisible
                 */
                isVisible: function () {
                    return visible;
                },
                /**
                 * Sets the entity's visibility state
                 * @function
                 * @param {Boolean} visible - Visibility state
                 * @instance
                 * @name setVisible
                 */
                setVisible: function (value) {
                    visible = value;
                },
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
                attach: function (component, name) {
                    var mixin = {},
                        parent = entity;
                    components.push(component);
                    if (component.setParent) {
                        component.setParent(entity);
                    }
                    if (component.init) {
                        component.init();
                    }
                    if (entity.isAdded) {
                        if (component.start) {
                            component.start();
                        }
                    } else {
                        if (parent.getParent) {
                            parent = parent.getParent();
                        }
                        while (parent) {
                            if (parent.isAdded) {
                                if (component.start) {
                                    component.start();
                                }
                            }
                            parent = parent.getParent();
                        }
                    }
                    if (name) {
                        mixin[name] = component;
                        Utils.extend(entity, mixin);
                    }
                    return entity;
                },
                /**
                 * Removes a child object from the entity. Note that destroy will be called in the child.
                 * @function
                 * @param {Object} node - The child object to remove
                 * @instance
                 * @name remove
                 */
                remove: function (component) {
                    var i, type, index;
                    if (!component) {
                        return;
                    }
                    index = components.indexOf(component);
                    if (index >= 0) {
                        if (component.destroy) {
                            component.destroy();
                        }
                        // TODO: clean component
                        components[index] = null;
                    }
                    return entity;
                },
                /**
                 * Returns the reference to the components array
                 * @function
                 * @instance
                 * @name getComponents
                 */
                getComponents: function () {
                    return components;
                },
                /**
                 * Returns the first child found with a certain name
                 * @function
                 * @instance
                 * @param {String} name - name of the component
                 * @name getComponentByName
                 */
                getComponentByName: function (name) {
                    var i, l, component;
                    for (i = 0, i = components.length; i < l; ++i) {
                        component = components[i];
                        if (component.name === name) {
                            return component;
                        }
                    }
                },
                /**
                 * Returns the index of a child
                 * @function
                 * @instance
                 * @param {Object} child - reference to the child
                 * @name getComponentIndex
                 */
                getComponentIndex: function (component) {
                    return components.indexOf(component);
                },
                /**
                 * Moves a child to a certain index in the array
                 * @function
                 * @instance
                 * @param {Object} child - reference to the child
                 * @param {Number} index - new index
                 * @name moveComponentTo
                 */
                moveComponentTo: function (component, newIndex) {
                    // note: currently dangerous to do during an update loop
                    var i, type, index;
                    if (!component) {
                        return;
                    }
                    index = components.indexOf(component);
                    if (index >= 0) {
                        // remove old
                        components.splice(index, 1);
                        // insert at new place
                        components.splice(newIndex, 0, component);
                    }
                },
                /**
                 * Assigns the parent
                 * @function
                 * @instance
                 * @param {Object} parent - reference to the parent object
                 * @name setParent
                 */
                setParent: function (obj) {
                    parent = obj;
                },
                /**
                 * Returns the reference to the parent object
                 * @function
                 * @instance
                 * @name getParent
                 */
                getParent: function () {
                    return parent;
                },
                /**
                 * Returns a unique entity ID number
                 * @function
                 * @instance
                 * @name getId
                 */
                getId: function () {
                    return uniqueId;
                },
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
                collidesWith: function (other, offset, callback) {
                    var intersect;
                    if (!Utils.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    intersect = entity.getBoundingBox().offset(offset).intersect(other.getBoundingBox());
                    if (intersect && callback) {
                        callback(other);
                    }
                    return intersect;
                },
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
                collidesWithGroup: function (array, offset, callback) {
                    var i,
                        obj,
                        box;
                    if (!Utils.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    if (!Utils.isArray(array)) {
                        // throw 'Collision check must be with an Array of object';
                        console.log('Collision check must be with an Array of object');
                        return;
                    }
                    if (!array.length) {
                        return null;
                    }
                    box = entity.getBoundingBox().offset(offset);
                    for (i = 0; i < array.length; ++i) {
                        obj = array[i];
                        if (obj === entity) {
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
                },
                getAABB: function () {
                    var box = entity.getBoundingBox();
                    return {
                        min: [box.x, box.y],
                        max: [box.x + box.width, box.y + box.height]
                    };
                }
            };

        // read settings
        if (settings) {
            if (settings.components) {
                if (!Utils.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0; i < settings.components.length; ++i) {
                    settings.components[i](entity, settings);
                }
            }
            if (settings.position) {
                entity.setPosition(settings.position);
            }
            if (settings.origin) {
                entity.setOrigin(settings.origin);
            }
            if (settings.originRelative) {
                entity.setOriginRelative(settings.originRelative);
            }
            if (settings.name) {
                entity.name = settings.name;
            }
            if (settings.family) {
                if (!Utils.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0; i < settings.family.length; ++i) {
                    entity.addToFamily(settings.family[i]);
                }
            }
            if (settings.init) {
                settings.init.apply(entity);
            }

            entity.z = settings.z || 0;
            entity.updateWhenPaused = settings.updateWhenPaused || false;
            entity.global = settings.global || false;
            entity.float = settings.float || false;
            entity.useHshg = settings.useHshg || false;
            entity.staticHshg = settings.staticHshg || false;
            entity.onCollide = settings.onCollide;

            if (settings.addNow) {
                Bento.objects.add(entity);
            }

        }
        return entity;
    };
});