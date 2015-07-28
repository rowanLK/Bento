/**
 * Manager that controls mainloop and all objects
 * <br>Exports: Function
 * @module bento/managers/object
 * @param {Object} data - gameData object
 * @param {Object} settings - Settings object
 * @param {Object} settings.defaultSort - Use javascript default sorting (not recommended)
 * @param {Object} settings.debug - Show debug info
 * @param {Object} settings.useDeltaT - Use delta time (untested)
 * @returns ObjectManager
 */
bento.define('bento/managers/object', [
    'hshg',
    'bento/utils'
], function (Hshg, Utils) {
    'use strict';
    return function (data, settings) {
        var objects = [],
            lastTime = new Date().getTime(),
            cumulativeTime = 0,
            minimumFps = 30,
            lastFrameTime = new Date().getTime(),
            gameData,
            quickAccess = {},
            isRunning = false,
            useSort = true,
            isPaused = false,
            isStopped = false,
            fpsMeter,
            hshg = new Hshg(),
            sort = function () {
                if (!settings.defaultSort) {
                    Utils.stableSort.inplace(objects, function (a, b) {
                        return a.z - b.z;
                    });
                } else {
                    // default behavior
                    objects.sort(function (a, b) {
                        return a.z - b.z;
                    });
                }
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
                    deltaT = currentTime - lastTime;

                if (!isRunning) {
                    return;
                }

                if (settings.debug && fpsMeter) {
                    fpsMeter.tickStart();
                }

                lastTime = currentTime;
                cumulativeTime += deltaT;
                gameData.deltaT = deltaT;
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
                    update();
                }
                cleanObjects();
                if (useSort) {
                    sort();
                }
                draw();

                lastFrameTime = time;
                if (settings.debug && fpsMeter) {
                    fpsMeter.tick();
                }

                requestAnimationFrame(mainLoop);
            },
            update = function () {
                var object,
                    i;
                if (!isPaused) {
                    hshg.update();
                    hshg.queryForCollisionPairs();
                }
                for (i = 0; i < objects.length; ++i) {
                    object = objects[i];
                    if (!object) {
                        continue;
                    }
                    if (object.update && ((isPaused && object.updateWhenPaused) || !isPaused)) {
                        object.update(gameData);
                    }
                }
            },
            draw = function () {
                var object,
                    i;
                gameData.renderer.begin();
                for (i = 0; i < objects.length; ++i) {
                    object = objects[i];
                    if (!object) {
                        continue;
                    }
                    if (object.draw) {
                        object.draw(gameData);
                    }
                }
                gameData.renderer.flush();
            },
            attach = function (object) {
                var i, type, family;
                object.z = object.z || 0;
                objects.push(object);
                if (object.init) {
                    object.init();
                }
                if (object.start) {
                    object.start(gameData);
                }
                object.isAdded = true;
                if (object.useHshg && object.getAABB) {
                    hshg.addObject(object);
                }
                // add object to access pools
                if (object.getFamily) {
                    family = object.getFamily();
                    for (i = 0; i < family.length; ++i) {
                        type = family[i];
                        if (!quickAccess[type]) {
                            quickAccess[type] = [];
                        }
                        quickAccess[type].push(object);
                    }
                }
            },
            module = {
                /**
                 * Adds entity/object to the game. If the object has the
                 * functions update and draw, they will be called in the loop.
                 * @function
                 * @instance
                 * @param {Object} object - You can add any object, preferably an Entity
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
                    var i, type, index, family;
                    if (!object) {
                        return;
                    }
                    index = objects.indexOf(object);
                    if (index >= 0) {
                        objects[index] = null;
                        if (object.destroy) {
                            object.destroy(gameData);
                        }
                        object.isAdded = false;
                    }
                    if (object.useHshg && object.getAABB) {
                        hshg.removeObject(object);
                    }
                    // remove from access pools
                    if (object.getFamily) {
                        family = object.getFamily();
                        for (i = 0; i < family.length; ++i) {
                            type = family[i];
                            Utils.removeObject(quickAccess[type], object);
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
                },
                /**
                 * Returns the first object it can find with this name
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
                 * Returns an array of objects by family name
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
                 * Stops the mainloop
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
                 * @name pause
                 */
                pause: function () {
                    isPaused = true;
                },
                /**
                 * Cancels the pause and resume updating objects.
                 * @function
                 * @instance
                 * @name resume
                 */
                resume: function () {
                    isPaused = false;
                },
                /**
                 * Returns true if paused
                 * @function
                 * @instance
                 * @name isPaused
                 */
                isPaused: function () {
                    return isPaused;
                },
                /**
                 * Forces objects to be drawn (Don't call this unless you need it)
                 * @function
                 * @instance
                 * @name draw
                 */
                draw: function () {
                    draw();
                }
            };

        if (!window.performance) {
            window.performance = {
                now: Date.now
            };
        }
        gameData = data;
        if (settings.debug && Utils.isDefined(window.FPSMeter)) {
            FPSMeter.defaults.graph = 1;
            fpsMeter = new FPSMeter();
        }

        return module;
    };
});