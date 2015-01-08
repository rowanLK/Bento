/*
 * A base object to hold components
 * @base Base
 * @copyright (C) 1HandGaming
 */
rice.define('rice/base', [
    'rice/sugar',
    'rice/math/vector2',
    'rice/math/rectangle'
], function (Sugar, Vector2, Rectangle) {
    'use strict';
    var globalId = 0;
    return function (settings) {
        var i,
            name,
            visible = true,
            position = Vector2(0, 0),
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
                    Sugar.removeObject(components, component);
                }
            },
            base = {
                z: 0,
                timer: 0,
                global: false,
                updateWhenPaused: false,
                name: '',
                update: function (data) {
                    var i,
                        l,
                        component;
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.update) {
                            component.update(data);
                        }
                    }
                    ++base.timer;

                    // clean up
                    cleanComponents();
                },
                draw: function (data) {
                    var scroll = data.viewport,
                        context = data.context,
                        i,
                        l,
                        component;
                    if (!visible) {
                        return;
                    }
                    context.save();
                    context.translate(Math.round(position.x), Math.round(position.y));

                    // scroll (only applies to parent objects)
                    if (parent === null) {
                        context.translate(Math.round(-scroll.x), Math.round(-scroll.y));
                    }
                    // call components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.draw) {
                            component.draw(data);
                        }
                    }

                    context.restore();
                },
                addToFamily: function (name) {
                    family.push(name);
                },
                getFamily: function () {
                    return family;
                },
                add: function (object) {
                    return Sugar.combine(base, object);
                },
                getPosition: function () {
                    return position;
                },
                setPosition: function (value) {
                    position.x = value.x;
                    position.y = value.y;
                },
                getDimension: function () {
                    return dimension;
                },
                setDimension: function (value) {
                    if (Sugar.isDimension(value)) {
                        dimension = value;
                    }
                },
                getBoundingBox: function () {
                    var scale, x1, x2, y1, y2, box;
                    if (!rectangle) {
                        scale = base.scale ? base.scale.getScale() : Vector2(1, 1);
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
                        scale = base.scale ? base.scale.getScale() : Vector2(1, 1);
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
                        component.setParent(base);
                    }
                    if (component.init) {
                        component.init();
                    }
                    if (name) {
                        mixin[name] = component;
                        Sugar.combine(base, mixin);
                    }
                    return base;
                },
                remove: function (component) {
                    var i, type, index;
                    if (!component) {
                        return;
                    }
                    index = components.indexOf(component);
                    if (index >= 0) {
                        components[index] = null;
                    }
                    return base;
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
                    if (!Sugar.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    return base.getBoundingBox().offset(offset).intersect(other.getBoundingBox());
                },
                collidesWithGroup: function (array, offset) {
                    var i,
                        obj,
                        box;
                    if (!Sugar.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    if (!Sugar.isArray(array)) {
                        // throw 'Collision check must be with an Array of object';
                        console.log('Collision check must be with an Array of object');
                        return;
                    }
                    if (!array.length) {
                        return null;
                    }
                    box = base.getBoundingBox().offset(offset);
                    for (i = 0; i < array.length; ++i) {
                        obj = array[i];
                        if (obj === base) {
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
                if (!Sugar.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0; i < settings.components.length; ++i) {
                    settings.components[i](base, settings);
                }
            }
            if (settings.position) {
                base.setPosition(settings.position);
            }
            if (settings.origin) {
                base.setOrigin(settings.origin);
            }
            if (settings.originRelative) {
                base.setOriginRelative(settings.originRelative);
            }
            if (settings.name) {
                base.setName(settings.name);
            }
            if (settings.family) {
                if (!Sugar.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0; i < settings.family.length; ++i) {
                    base.addToFamily(settings.family[i]);
                }
            }
            if (settings.init) {
                settings.init.apply(base);
            }

            base.updateWhenPaused = settings.updateWhenPaused || false;
            base.global = settings.global || false;
        }
        return base;
    };
});