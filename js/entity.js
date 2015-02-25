/*
 * A base object to hold components
 * @copyright (C) HeiGames
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
                var i, component;
                while (removedComponents.length) {
                    component = removedComponents.pop();
                    // should destroy be called?
                    /*if (component.destroy) {
                        component.destroy();
                    }*/
                    Utils.removeObject(components, component);
                }
            },
            entity = {
                z: 0,
                timer: 0,
                global: false,
                updateWhenPaused: false,
                name: '',
                destroy: function (data) {
                    var i,
                        l,
                        component;
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.destroy) {
                            component.destroy(data);
                        }
                    }
                },
                update: function (data) {
                    var i,
                        l,
                        component;

                    data.entity = this;
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
                draw: function (data) {
                    var i,
                        l,
                        component;
                    if (!visible) {
                        return;
                    }
                    data.entity = this;
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
                addToFamily: function (name) {
                    family.push(name);
                },
                getFamily: function () {
                    return family;
                },
                extend: function (object) {
                    return Utils.extend(entity, object);
                },
                getPosition: function () {
                    return position;
                },
                setPosition: function (value) {
                    position.x = value.x;
                    position.y = value.y;
                },
                setPositionX: function (value) {
                    position.x = value;
                },
                setPositionY: function (value) {
                    position.y = value;
                },
                getDimension: function () {
                    return dimension;
                },
                setDimension: function (value) {
                    dimension = value;
                },
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
                setBoundingBox: function (value) {
                    rectangle = value;
                },
                getRectangle: function () {
                    return rectangle;
                },
                setOrigin: function (value) {
                    origin.x = value.x;
                    origin.y = value.y;
                },
                setOriginRelative: function (value) {
                    origin.x = value.x * dimension.width;
                    origin.y = value.y * dimension.height;
                },
                getOrigin: function () {
                    return origin;
                },
                isVisible: function () {
                    return visible;
                },
                setVisible: function (value) {
                    visible = value;
                },
                attach: function (component, name) {
                    var mixin = {};
                    components.push(component);
                    if (component.setParent) {
                        component.setParent(entity);
                    }
                    if (component.init) {
                        component.init();
                    }
                    if (name) {
                        mixin[name] = component;
                        Utils.extend(entity, mixin);
                    }
                    return entity;
                },
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
                        components[index] = null;
                    }
                    return entity;
                },
                getComponents: function () {
                    return components;
                },
                getComponentByName: function (name) {
                    var i, l, component;
                    for (i = 0, i = components.length; i < l; ++i) {
                        component = components[i];
                        if (component.name === name) {
                            return component;
                        }
                    }
                },
                setParent: function (obj) {
                    parent = obj;
                },
                getParent: function () {
                    return parent;
                },
                getId: function () {
                    return uniqueId;
                },
                collidesWith: function (other, offset) {
                    if (!Utils.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    return entity.getBoundingBox().offset(offset).intersect(other.getBoundingBox());
                },
                collidesWithGroup: function (array, offset) {
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
                            return obj;
                        }
                    }
                    return null;
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

            if (settings.addNow) {
                Bento.objects.add(entity);
            }

        }
        return entity;
    };
});