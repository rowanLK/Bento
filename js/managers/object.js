/**
 * Manager that controls mainloop and all objects. Attach entities to the object manager
 * to add them to the game. The object manager loops through every object's update and
 * draw functions. The settings object passed here is passed through Bento.setup().
 * <br>Exports: Constructor, can be accessed through Bento.objects namespace.
 * @module bento/managers/object
 * @param {Function} getGameData - Function that returns gameData object
 * @param {Object} settings - Settings object
 * @param {Object} settings.defaultSort - Use javascript default sorting with Array.sort (not recommended)
 * @param {Object} settings.debug - Show debug info
 * @param {Object} settings.useDeltaT - Use delta time (note: untested)
 * @returns ObjectManager
 */
bento.define('bento/managers/object', [
    'hshg',
    'bento/utils',
    'bento/eventsystem'
], function (Hshg, Utils, EventSystem) {
    'use strict';
    return function (getGameData, settings) {
        var objects = [],
            lastTime = new Date().getTime(),
            cumulativeTime = 0,
            minimumFps = 30,
            lastFrameTime = new Date().getTime(),
            quickAccess = {},
            isRunning = false,
            sortMode = settings.sortMode || 0,
            isPaused = 0,
            isStopped = false,
            fpsMeter,
            hshg = new Hshg(),
            suppressThrows,
            sortDefault = function () {
                // default array sorting method (unstable)
                objects.sort(function (a, b) {
                    return a.z - b.z;
                });

            },
            sort = function () {
                // default method for sorting: stable sort
                Utils.stableSort.inplace(objects, function (a, b) {
                    return a.z - b.z;
                });
            },
            cleanObjects = function () {
                var i;
                // loop objects array from end to start and remove null elements
                for (i = objects.length - 1; i >= 0; --i) {
                    if (objects[i] === null) {
                        objects.splice(i, 1);
                    }
                }
            },
            mainLoop = function (time) {
                var object,
                    i,
                    currentTime = new Date().getTime(),
                    deltaT = currentTime - lastTime,
                    data = getGameData();

                if (!isRunning) {
                    return;
                }

                if (settings.debug && fpsMeter) {
                    fpsMeter.tickStart();
                }

                lastTime = currentTime;
                cumulativeTime += deltaT;
                data = getGameData();
                data.deltaT = deltaT;
                if (settings.useDeltaT) {
                    cumulativeTime = 1000 / 60;
                }
                while (cumulativeTime >= 1000 / 60) {
                    cumulativeTime -= 1000 / 60;
                    if (cumulativeTime > 1000 / minimumFps) {
                        // deplete cumulative time
                        while (cumulativeTime >= 1000 / 60) {
                            cumulativeTime -= 1000 / 60;
                        }
                    }
                    if (settings.useDeltaT) {
                        cumulativeTime = 0;
                    }
                    update(data);
                }
                cleanObjects();
                if (sortMode === Utils.SortMode.ALWAYS) {
                    sort();
                }
                draw(data);

                lastFrameTime = time;
                if (settings.debug && fpsMeter) {
                    fpsMeter.tick();
                }

                requestAnimationFrame(mainLoop);
            },
            update = function (data) {
                var object,
                    i;

                data = data || getGameData();

                EventSystem.fire('preUpdate', data);
                for (i = 0; i < objects.length; ++i) {
                    object = objects[i];
                    if (!object) {
                        continue;
                    }
                    if (object.update && (object.updateWhenPaused >= isPaused)) {
                        object.update(data);
                    }
                }
                if (!isPaused) {
                    hshg.update();
                    hshg.queryForCollisionPairs();
                }
                EventSystem.fire('postUpdate', data);
            },
            draw = function (data) {
                var object,
                    i;
                data = data || getGameData();

                EventSystem.fire('preDraw', data);
                data.renderer.begin();
                for (i = 0; i < objects.length; ++i) {
                    object = objects[i];
                    if (!object) {
                        continue;
                    }
                    if (object.draw) {
                        object.draw(data);
                    }
                }
                data.renderer.flush();
                EventSystem.fire('postDraw', data);
            },
            attach = function (object) {
                var i,
                    type,
                    family,
                    data = getGameData();

                if (object.isAdded || object.parent) {
                    if (suppressThrows)
                        console.log('Warning: Entity ' + object.name + ' was already added.');
                    else
                        throw 'ERROR: Entity was already added.';
                    return;
                }

                object.z = object.z || 0;
                object.updateWhenPaused = object.updateWhenPaused || 0;
                objects.push(object);
                object.isAdded = true;
                if (object.init) {
                    object.init();
                }
                // add object to access pools
                if (object.family) {
                    family = object.family;
                    for (i = 0; i < family.length; ++i) {
                        type = family[i];
                        if (!quickAccess[type]) {
                            quickAccess[type] = [];
                        }
                        quickAccess[type].push(object);
                    }
                }
                if (object.useHshg && object.getAABB) {
                    hshg.addObject(object);
                }

                if (object.start) {
                    object.start(data);
                }
                if (object.attached) {
                    object.attached(data);
                }
                if (sortMode === Utils.SortMode.SORT_ON_ADD) {
                    sort();
                }
            },
            module = {
                /**
                 * Adds entity/object to the game. The object doesn't have to be an Entity. As long as the object
                 * has the functions update and draw, they will be called during the loop.
                 * @function
                 * @instance
                 * @param {Object} object - Any object, preferably an Entity
                 * @name attach
                 */
                attach: attach,
                add: attach,
                /**
                 * Removes entity/object
                 * @function
                 * @instance
                 * @param {Object} object - Reference to the object to be removed
                 * @name remove
                 */
                remove: function (object) {
                    var i,
                        type,
                        index,
                        family,
                        pool,
                        data = getGameData();
                    if (!object) {
                        return;
                    }
                    index = objects.indexOf(object);
                    if (index >= 0) {
                        objects[index] = null;
                        if (object.destroy) {
                            object.destroy(data);
                        }
                        object.isAdded = false;
                    }
                    if (object.useHshg && object.getAABB) {
                        hshg.removeObject(object);
                    }
                    // remove from access pools
                    if (object.family) {
                        family = object.family;
                        for (i = 0; i < family.length; ++i) {
                            type = family[i];
                            pool = quickAccess[type];
                            if (pool) {
                                Utils.removeObject(quickAccess[type], object);
                            }
                        }
                    }
                },
                /**
                 * Removes all entities/objects except ones that have the property "global"
                 * @function
                 * @instance
                 * @param {Boolean} removeGlobal - Also remove global objects
                 * @name removeAll
                 */
                removeAll: function (removeGlobal) {
                    var i,
                        object;
                    for (i = 0; i < objects.length; ++i) {
                        object = objects[i];
                        if (!object) {
                            continue;
                        }
                        if (!object.global || removeGlobal) {
                            module.remove(object);
                        }
                    }
                    // bug in hshg: objects don't get removed here, so we respawn hshg
                    hshg = new Hshg();
                    // re-add all global objects
                    cleanObjects();
                    for (i = 0; i < objects.length; ++i) {
                        object = objects[i];
                        if (object.useHshg && object.getAABB) {
                            hshg.addObject(object);
                        }
                    }
                },
                /**
                 * Returns the first object it can find with this name. Safer to use with a callback.
                 * The callback is called immediately if the object is found (it's not asynchronous).
                 * @function
                 * @instance
                 * @param {String} objectName - Name of the object
                 * @param {Function} [callback] - Called if the object is found
                 * @returns {Object} null if not found
                 * @name get
                 */
                get: function (objectName, callback) {
                    // retrieves the first object it finds by its name
                    var i,
                        object;

                    for (i = 0; i < objects.length; ++i) {
                        object = objects[i];
                        if (!object) {
                            continue;
                        }
                        if (!object.name) {
                            continue;
                        }
                        if (object.name === objectName) {
                            if (callback) {
                                callback(object);
                            }
                            return object;
                        }
                    }
                    return null;
                },
                /**
                 * Returns an array of objects with a certain name
                 * @function
                 * @instance
                 * @param {String} objectName - Name of the object
                 * @param {Function} [callback] - Called with the object array
                 * @returns {Array} An array of objects, empty if no objects found
                 * @name getByName
                 */
                getByName: function (objectName, callback) {
                    var i,
                        object,
                        array = [];

                    for (i = 0; i < objects.length; ++i) {
                        object = objects[i];
                        if (!object) {
                            continue;
                        }
                        if (!object.name) {
                            continue;
                        }
                        if (object.name === objectName) {
                            array.push(object);
                        }
                    }
                    if (callback && array.length) {
                        callback(array);
                    }
                    return array;
                },
                /**
                 * Returns an array of objects by family name. Entities are added to pools
                 * of each family you indicate in the Entity.family array the moment you call
                 * Bento.objects.attach() and are automatically removed with Bento.objects.remove().
                 * This allows quick access of a group of similar entities. Families are cached so you
                 * may get a reference to the array of objects even if it's not filled yet.
                 * @function
                 * @instance
                 * @param {String} familyName - Name of the family
                 * @param {Function} [callback] - Called with the object array
                 * @returns {Array} An array of objects, empty if no objects found
                 * @name getByFamily
                 */
                getByFamily: function (type, callback) {
                    var array = quickAccess[type];
                    if (!array) {
                        // initialize it
                        quickAccess[type] = [];
                        array = quickAccess[type];
                        console.log('Warning: family called ' + type + ' does not exist');
                    }
                    if (callback && array.length) {
                        callback(array);
                    }
                    return array;
                },
                /**
                 * Stops the mainloop on the next tick
                 * @function
                 * @instance
                 * @name stop
                 */
                stop: function () {
                    isRunning = false;
                },
                /**
                 * Starts the mainloop
                 * @function
                 * @instance
                 * @name run
                 */
                run: function () {
                    if (!isRunning) {
                        isRunning = true;
                        mainLoop();
                    }
                },
                /**
                 * Returns the number of objects
                 * @function
                 * @instance
                 * @returns {Number} The number of objects
                 * @name count
                 */
                count: function () {
                    return objects.length;
                },
                /**
                 * Stops calling update on every object. Note that draw is still
                 * being called. Objects with the property updateWhenPaused
                 * will still be updated.
                 * @function
                 * @instance
                 * @param {Number} level - Level of pause state, defaults to 1
                 * @name pause
                 */
                pause: function (level) {
                    isPaused = level;
                    if (Utils.isUndefined(level)) {
                        isPaused = 1;
                    }
                },
                /**
                 * Cancels the pause and resume updating objects. (Sets pause level to 0)
                 * @function
                 * @instance
                 * @name resume
                 */
                resume: function () {
                    isPaused = 0;
                },
                /**
                 * Returns pause level. If an object is passed to the function
                 * it checks if that object should be paused or not
                 * @function
                 * @instance
                 * @param {Object} [object] - Object to check if it's paused
                 * @name isPaused
                 */
                isPaused: function (obj) {
                    if (Utils.isDefined(obj)) {
                        return obj.updateWhenPaused < isPaused;
                    }
                    return isPaused;
                },
                /**
                 * Forces objects to be drawn (Don't call this unless you need it)
                 * @function
                 * @instance
                 * @param {GameData} [data] - Data object (see Bento.getGameData)
                 * @name draw
                 */
                draw: function (data) {
                    draw(data);
                },
                /**
                 * Gets the current HSHG grid instance
                 * @function
                 * @instance
                 * @name getHshg
                 */
                getHshg: function () {
                    return hshg;
                },
                /**
                 * Sets the sorting mode. Use the Utils.SortMode enum as input:<br>
                 * Utils.SortMode.ALWAYS - sort on every update tick<br>
                 * Utils.SortMode.NEVER - don't sort at all<br>
                 * Utils.SortMode.SORT_ON_ADD - sorts only when an object is attached<br>
                 * @function
                 * @instance
                 * @param {Utils.SortMode} mode - Sorting mode
                 * @name setSortMode
                 */
                setSortMode: function (mode) {
                    sortMode = mode;
                },
                /**
                 * Calls the update function. Be careful when using this in another
                 * update loop, as it will result in an endless loop.
                 * @function
                 * @instance
                 * @param {GameData} [data] - Data object (see Bento.getGameData)
                 * @name update
                 */
                update: function (data) {
                    update(data);
                }
            };

        if (!window.performance) {
            window.performance = {
                now: Date.now
            };
        }
        if (settings.debug && Utils.isDefined(window.FPSMeter)) {
            FPSMeter.defaults.graph = 1;
            fpsMeter = new FPSMeter();
        }

        // swap sort method with default sorting method
        if (settings.defaultSort) {
            sort = defaultSort;
        }

        suppressThrows = settings.dev ? false : true;

        return module;
    };
});