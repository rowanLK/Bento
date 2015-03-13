/**
 *  Manager that controls mainloop and all objects
 *  @copyright (C) 2014 HeiGames
 *  @author Hernan Zhou
 */
bento.define('bento/managers/object', [
    'bento/utils'
], function (Utils) {
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
            fpsMeter,
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

                if (settings.debug) {
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
                    for (i = 0; i < objects.length; ++i) {
                        object = objects[i];
                        if (!object) {
                            continue;
                        }
                        if (object.update && ((isPaused && object.updateWhenPaused) || !isPaused)) {
                            object.update(gameData);
                        }
                    }
                }
                cleanObjects();
                if (useSort) {
                    sort();
                }
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

                lastFrameTime = time;
                if (settings.debug) {
                    fpsMeter.tick();
                }

                requestAnimationFrame(mainLoop);
            },
            module = {
                add: function (object) {
                    var i, type, family;
                    object.z = object.z || 0;
                    objects.push(object);
                    if (object.init) {
                        object.init();
                    }
                    if (object.start) {
                        object.start();
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
                get: function (objectName) {
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
                            return object
                        }
                    }
                    return null;
                },
                getByName: function (objectName) {
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
                    return array;
                },
                getByFamily: function (type) {
                    var array = quickAccess[type];
                    if (!array) {
                        // initialize it
                        quickAccess[type] = [];
                        array = quickAccess[type];
                        console.log('Warning: family called ' + type + ' does not exist');
                    }
                    return array;
                },
                run: function () {
                    if (!isRunning) {
                        mainLoop();
                        isRunning = true;
                    }
                },
                count: function () {
                    return objects.length;
                },
                pause: function () {
                    isPaused = true;
                },
                resume: function () {
                    isPaused = false;
                },
                isPaused: function () {
                    return isPaused;
                }
            };

        if (!window.performance) {
            window.performance = {
                now: Date.now
            };
        }
        gameData = data;
        if (settings.debug) {
            FPSMeter.defaults.graph = 1;
            fpsMeter = new FPSMeter();
        }

        return module;
    };
});