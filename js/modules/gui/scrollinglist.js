/**
 * Scrolling list of items, designed for touch input. Note: do not use attach()/remove(), but addItem() and removeItem().
 * <br>Exports: Constructor
 * @moduleName ScrollingList
 * @module bento/gui/scrollinglist
 * @returns Entity
 * @snippet ScrollingList|constructor
ScrollingList({
    z: 0,
    position: new Vector2(0, 0),
    updateWhenPaused: 0,
    area: new Rectangle(0, 0, 0, 0), // area that user can grab
    direction: 'x', // 'x' or 'y'
    spacing: 0, // additional spacing between items
    maxOffset: 0, // additional max scrolling distance
    minOffset: 0, // additional min scrolling distance
    snap: false, // snap items (cancels maxOffset and minOffset)
    snapNextOffset: 0, // distance to scroll to snap to next, in screen pixels. Used with snap:true, best with damping:0
    onSnap: function (item, index) {}, // called when snap focus changed
    onLoseFocus: function (index) {}, // called when snap focus changed
    onScrollStart: function () {}, // callback when scrolling has started
    snapMinSlideSpeed: 1, // minimum slidespeed before starting to snap
    snapSpeed: 0.3, // speed of snapping
    damping: 0.9 // speed decrease,
});
 */
bento.define('bento/gui/scrollinglist', [
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
        /*settings = {
            z: Number
            position: Vector2
            updateWhenPaused: Boolean
            subPixel: Boolean
            area: Rectangle // area that user can grab
            direction: String // 'x' or 'y'
            spacing: Number // additional spacing between items
            maxOffset: Number // additional max scrolling distance
            minOffset: Number // additional min scrolling distance
            snap: Boolean // snap items (cancels maxOffset and minOffset)
            onSnap: Function // called when snap focus changed
            onLoseFocus: Function // called when snap focus changed
            onScrollStart: Function // callback when scrolling has started
            snapMinSlideSpeed: Number // minimum slidespeed before starting to snap
            snapSpeed: Number // speed of snapping
            damping: Number // speed decrease,
        }*/
        var viewport = Bento.getViewport();
        var items = [];

        // scroll variables
        var originalPos = 0;
        var holdPos = 0;
        var grabX = 0;
        var diffX = 0;
        var isHolding = null;
        var speedX = 0;
        var avgSpeedX = 0;
        var slideSpeed = 0;
        var selectionBeforeHold = 0;
        var previousSelection = 0;
        var currentSelection = 0;
        var release = false;
        var dir = settings.direction || 'y'; // 'x' or 'y'
        var dim = (dir === 'x' ? 'width' : 'height');
        var otherDim = (dir === 'x' ? 'height' : 'width');
        var spacing = settings.spacing || 0;
        var snap = settings.snap || false;
        var snapNextOffset = settings.snapNextOffset || 0;
        var maxOffset = snap ? 0 : settings.maxOffset || 0; // snap and extra offset doesn't make sense
        var minOffset = snap ? 0 : settings.minOffset || 0;
        var clamp = settings.clamp || false;
        var snapMinSlideSpeed = settings.snapMinSlideSpeed || 1;
        var snapSpeed = settings.snapSpeed || 0.3;
        var damping = settings.damping || 0.9;
        var forcedSnap = -1;
        var totalSize = 0;
        var itemWidth = 0;
        var previousPos = 0;
        var currentPos = 0;
        var active = true;
        // components
        var clickable = new Clickable({
            pointerDown: function (evt) {
                if (!active) {
                    return;
                }
                if (isHolding !== null) {
                    // already scrolling
                    return;
                }
                var y = container.position[dir];
                grabX = evt.position[dir];

                holdPos = evt.position[dir];
                originalPos = container.position[dir];
                selectionBeforeHold = currentSelection;
                // TEMP don't scroll if only 1 item (there should be a nicer solution for this)
                if (items.length <= 1) {
                    return;
                }
                if (settings.area) {
                    if (settings.area.hasPosition(evt.localPosition)) {
                        isHolding = evt.id;
                        if (settings.onScrollStart) {
                            settings.onScrollStart();
                        }
                    }
                } else {
                    isHolding = evt.id;
                    if (settings.onScrollStart) {
                        settings.onScrollStart();
                    }
                }
                // if (evt.position.y > 48 && evt.position.y < viewport.height - 64) {
                //     isHolding = true;
                // }
            },
            pointerMove: function (evt) {
                if (isHolding === evt.id) {
                    // measure speed
                    speedX = evt.position[dir] - grabX;
                    if (Math.abs(speedX) > Math.abs(avgSpeedX)) {
                        avgSpeedX = speedX;
                    }
                    diffX = evt.position[dir] - grabX;
                    // container.position[dir] += diffX;
                    container.position[dir] = originalPos + (evt.position[dir] - holdPos);
                    grabX = evt.position[dir];
                    if (settings.onScroll) {
                        settings.onScroll(container.position[dir]);
                    }
                }
            },
            pointerUp: function (evt) {
                var diff;
                if (isHolding === evt.id) {
                    isHolding = null;
                    slideSpeed = avgSpeedX;

                    // snap to next with snapNextOffset
                    diff = holdPos - evt.position[dir];
                    if (snap && snapNextOffset) {
                        if (diff > snapNextOffset) {
                            entity.snapTo(selectionBeforeHold + 1);
                        } else if (diff < -snapNextOffset) {
                            entity.snapTo(selectionBeforeHold - 1);
                        }
                    }
                }
            }
        });
        var behavior = {
            pointers: [],
            start: function () {
                this.pointers = Bento.input.getPointers();
            },
            update: function () {
                if (isHolding !== null && this.pointers.length === 0) {
                    // missed a pointerUp somehow
                    isHolding = null;
                }
            }
        };
        // item container
        var scrollBehavior = {
            name: 'scrollBehavior',
            update: function () {
                var // diff position
                    containerX = container.position[dir],
                    //
                    size = (itemWidth + spacing),
                    maxSel = items.length - 1,
                    minSel = 0,
                    selection = Utils.clamp(-maxSel, size === 0 ? 0 : Math.round(containerX / size), minSel),
                    index,
                    // focus
                    target = selection * size;

                if (release) {
                    release = false;
                    isHolding = null;
                    slideSpeed = 0;
                    return;
                }

                if (previousSelection !== selection) {
                    if (settings.onLoseFocus) {
                        settings.onLoseFocus(items[Utils.clamp(0, -previousSelection, items.length - 1)]);
                    }
                    previousSelection = selection;
                    currentSelection = -selection;
                    if (settings.onSnap) {
                        index = Utils.clamp(0, currentSelection, items.length - 1);
                        settings.onSnap(items[index], index);
                    }
                }

                // force snap
                if (forcedSnap >= 0 && selection !== -forcedSnap) {
                    target = -forcedSnap * size;
                } else {
                    forcedSnap = -1;
                }

                avgSpeedX = avgSpeedX * 0.6;

                if (isHolding === null) {
                    // snap
                    if (snap) {
                        if (Math.abs(slideSpeed) < snapMinSlideSpeed) {
                            container.position[dir] += (target - containerX) * snapSpeed;
                        } else {
                            container.position[dir] += slideSpeed;
                        }
                    }

                    // move
                    container.position[dir] += slideSpeed;

                    // limits
                    if (containerX <= -totalSize - maxOffset) {
                        target = -totalSize - maxOffset;
                        container.position[dir] += (target - containerX) * 0.1;
                        slideSpeed /= 2;
                    } else if (containerX > minOffset) {
                        target = minOffset;
                        container.position[dir] += (target - containerX) * 0.1;
                        slideSpeed /= 2;
                    }
                }

                // set item positions, because they can change due to expanding/collapsing
                setItemPos();

                // damping
                if (Math.abs(slideSpeed) < 2) {
                    slideSpeed *= damping;
                } else {
                    slideSpeed *= damping;
                }

                if (clamp) {
                    if (container.position[dir] > minOffset) {
                        container.position[dir] = minOffset;
                        slideSpeed = 0;
                    } else if (container.position[dir] <= -totalSize - maxOffset) {
                        container.position[dir] = -totalSize - maxOffset;
                        slideSpeed = 0;
                    }
                }

                currentPos = container.position[dir];
            }
        };
        var container = new Entity({
            name: 'container',
            updateWhenPaused: settings.updateWhenPaused || 0,
            components: []
        });
        // main entity
        var entitySettings = Utils.extend({
            z: 0,
            name: 'scrollingList'
        }, settings, true);
        // merge components array
        entitySettings.components = [
            clickable,
            container,
            scrollBehavior,
            behavior
        ].concat(settings.components || []);

        var entity = new Entity(entitySettings);
        var setItemPos = function () {
            var i, l,
                item,
                size = 0;

            totalSize = 0;
            for (i = 0, l = items.length; i < l; ++i) {
                item = items[i];
                item.position[dir] = size;
                if (i !== l - 1) { // don't count last part
                    itemWidth = item.dimension[dim];
                    size += itemWidth + spacing;
                }

            }
            totalSize = size;
        };

        // public
        entity.extend({
            /**
             * Adds an item to the list
             * @instance
             * @function
             * @name addItem
             * @snippet #ScrollingList.addItem|snippet
                addItem(${1:item})
             */
            addItem: function (item) {
                // item.position[dir] = (item.dimension[dim] + spacing) * items.length;
                items.push(item);
                container.attach(item);
                setItemPos();
                return entity;
            },
            /**
             * Remove item by index and returns the removed item
             * @instance
             * @function
             * @name removeItem
             * @snippet #ScrollingList.removeItem|Entity
                removeItem(${1:index})
             */
            removeItem: function (index) {
                var item = items.splice(index, 1);
                container.remove(item[0]);
                setItemPos();
                return item;
            },
            /**
             * Did list move within tolerance?
             * Useful for the onClick callback in ClickButton if they reside in a ScrollingList.
             * @instance
             * @function
             * @name didMove
             * @snippet #ScrollingList.didMove|Number
                didMove(${1:tolerance})
             */
            didMove: function (tolerance) {
                return Math.abs(currentPos - originalPos) > tolerance;
            },
            /**
             * Iterate through items
             * @instance
             * @function
             * @name iterate
             * @snippet #ScrollingList.iterate|snippet
iterate(function (item, i, l, breakLoop) {
    $1
})
             */
            iterate: function (callback) {
                var i = 0;
                var l = items.length;
                var stop = false;
                var breakLoop = function () {
                    stop = true;
                };
                for (i = 0; i < l; ++i) {
                    callback(items[i], i, l, breakLoop);
                    if (stop) {
                        return;
                    }
                }
            },
            /**
             * Force scrolling position
             * @instance
             * @function
             * @name forceTo
             * @snippet #ScrollingList.forceTo|snippet
                forceTo(${1:scrollPosition})
             */
            forceTo: function (value) {
                container.position[dir] = value;
                entity.update();
            },
            /**
             * Get scrolling position
             * @instance
             * @function
             * @name getScroll
             * @snippet #ScrollingList.getScroll|snippet
                getScroll()
             */
            getScroll: function () {
                return container.position[dir];
            },
            /**
             * Get item by index
             * @instance
             * @function
             * @name get
             * @snippet #ScrollingList.get|Object
                get(${1:index})
             */
            get: function (index) {
                return items[index];
            },
            /**
             * Retrieve array of all items (reference)
             * @instance
             * @function
             * @name getItems
             * @snippet #ScrollingList.getItems|Array
                getItems()
             */
            getItems: function () {
                return items;
            },
            /**
             * Retrieve total width/height of all items
             * @instance
             * @function
             * @name getTotalSize
             * @snippet #ScrollingList.getTotalSize|Number
                getTotalSize()
             */
            getTotalSize: function () {
                return totalSize;
            },
            /**
             * Sets area in which the touch input is active (area in local coordinates)
             * @instance
             * @function
             * @name setArea
             * @snippet #ScrollingList.setArea|snippet
                setArea(${1:rectangle})
             */
            setArea: function (area) {
                settings.area = area;
            },
            /**
             * Snap to index (snap setting must be true)
             * @instance
             * @function
             * @name snapTo
             * @snippet #ScrollingList.snapTo|snippet
                snapTo(${1:index})
             */
            snapTo: function (index) {
                forcedSnap = Utils.clamp(0, index, items.length - 1);
            },
            /**
             * Get "selection", the index that is currently at the center of scrolling
             * @instance
             * @function
             * @name getSelection
             * @snippet #ScrollingList.getSelection|Number
                getSelection()
             */
            getSelection: function () {
                return currentSelection;
            },
            /**
             * Cancel any scrolling immediately 
             * @instance
             * @function
             * @name cancel
             * @snippet #ScrollingList.cancel|snippet
                cancel()
             */
            cancel: function () {
                release = true;
            },
            /**
             * Is currently scrolling/moving?
             * @instance
             * @function
             * @name isScrolling
             * @snippet #ScrollingList.isScrolling|Boolean
                isScrolling()
             */
            isScrolling: function () {
                return Math.abs(slideSpeed) > 0.2;
            },
            /**
             * Set minimum value that can be scrolled to
             * @instance
             * @function
             * @name setMinOffset
             * @snippet #ScrollingList.setMinOffset|snippet
                setMinOffset(${1:pixels})
             */
            setMinOffset: function (value) {
                minOffset = value;
            },
            /**
             * Set maximum value that can be scrolled to
             * @instance
             * @function
             * @name setMaxOffset
             * @snippet #ScrollingList.setMaxOffset|snippet
                setMaxOffset(${1:pixels})
             */
            setMaxOffset: function (value) {
                maxOffset = value;
            },
            /**
             * Set spacing between items
             * @instance
             * @function
             * @name setSpacing
             * @snippet #ScrollingList.setSpacing|snippet
                setSpacing(${1:pixels})
             */
            setSpacing: function (size) {
                spacing = size;
                setItemPos();
            },
            /**
             * Stop sliding immediately
             * @instance
             * @function
             * @name stopSliding
             * @snippet #ScrollingList.stopSliding|snippet
                stopSliding()
             */
            stopSliding: function () {
                slideSpeed = 0;
            },
            /**
             * Set active (alternatively, set the active property)
             * @instance
             * @function
             * @name setActive
             * @snippet #ScrollingList.setActive|snippet
                setActive(${1:boolean})
             */
            setActive: function (value) {
                active = value;
            }
        });

        /**
         * Length property
         * @instance
         * @function
         * @name length
         * @snippet #ScrollingList.length|Number
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

        /**
         * Active property
         * @instance
         * @function
         * @name active
         * @snippet #ScrollingList.active|Number
            active
         */
        Object.defineProperty(entity, 'active', {
            get: function () {
                return active;
            },
            set: entity.setActive
        });

        return entity;
    };
});