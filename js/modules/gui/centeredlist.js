/**
 * List of entities that spaces the items equally. Note: do not use attach()/remove(), but addItem() and removeItem().
 *
 * <br>Exports: Constructor
 * @moduleName CenteredList
 * @module bento/gui/centeredlist
 * @returns Entity
 * @snippet CenteredList|snippet
CenteredList({
    spacing: ${1:16}, // in pixels
    useItemDimensions: ${2:false}, // note: uses last item's dimension
    direction: '${3:x}',
    position: new Vector2(0, 0),
    items: []
})
 */
bento.define('bento/gui/centeredlist', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
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
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport();
        var items = [];
        var spacing = settings.spacing || 8;
        var useItemDimensions = Utils.getDefault(settings.useItemDimensions, true);
        var direction = settings.direction || 'x';
        var dimension = direction === 'x' ? 'width' : 'height';
        var entitySettings = Utils.extend({
            z: 0,
            name: 'centeredList'
        }, settings, true);
        var entity = new Entity(entitySettings);
        var width = 0;
        var reposition = function () {
            var i = 0;
            var totalWidth = (width + spacing) * (items.length - 1);
            var item;
            for (i = 0; i < items.length; ++i) {
                item = items[i];
                item.position[direction] = -totalWidth / 2 + (width + spacing) * i;
            }
        };
        var addItem = function (item) {
            if (useItemDimensions) {
                // note: always uses the last item dimension
                width = item.dimension[dimension];
            }
            items.push(item);
            entity.attach(item);
            reposition();
            return item;
        };

        entity.extend({
            /*
             * Adds an item to the list
             * @instance
             * @function
             * @name addItem
             * @snippet #CenteredList.addItem|snippet
                addItem(${1:item})
             */
            addItem: addItem,
            /**
             * Remove item by index
             * @instance
             * @function
             * @name removeItem
             * @snippet #CenteredList.removeItem|snippet
                removeItem(${1:index})
             */
            removeItem: function (index) {
                var item = items.splice(index, 1);
                entity.remove(item);
                reposition();
            },
            /**
             * Iterate through items
             * @instance
             * @function
             * @name iterate
             * @snippet #CenteredList.iterate|snippet
iterate(function (item, i, l, breakLoop) {
    $1
})
             */
            iterate: function (callback) {
                var i, l;
                var stop = false;
                var breakLoop = function () {
                    stop = true;
                };
                for (i = 0, l = items.length; i < l; ++i) {
                    callback(items[i], i, l, breakLoop);

                    if (stop) {
                        return;
                    }
                }
            },
            /**
             * Get item by index
             * @instance
             * @function
             * @name get
             * @snippet #CenteredList.get|Object
                get(${1:index})
             */
            get: function (index) {
                return items[index];
            },
            /**
             * Removes all items
             * @instance
             * @function
             * @name clear
             * @snippet #CenteredList.clear|snippet
                clear()
             */
            clear: function () {
                var ii;
                for (ii = items.length - 1; ii >= 0; ii--) {
                    entity.remove(items[ii]);
                }
                reposition();
                items = [];
            },
            /**
             * Get index of an item
             * @instance
             * @function
             * @name getIndex
             * @snippet #CenteredList.getIndex|Number
                getIndex()
             */
            getIndex: function (item) {
                return items.indexOf(item);
            }
        });

        /**
         * Length property
         * @instance
         * @function
         * @name length
         * @snippet #CenteredList.length|Number
            length
         */
        Object.defineProperty(entity, 'length', {
            get: function () {
                return items.length;
            },
            set: function (value) {
                items.length = value;
            }
        });


        if (settings.items) {
            Utils.forEach(settings.items, function (item, i, l, breakLoop) {
                entity.addItem(item);
            });
        }

        return entity;
    };
});