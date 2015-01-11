/**
 *  Manager that controls all objects
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
rice.define('rice/managers/object', [
    'rice/sugar'
], function (Sugar) {
    'use strict';
    var objects = [],
        lastTime = new Date().getTime(),
        cumulativeTime = 0,
        minimumFps = 30,
        lastFrameTime = new Date().getTime(),
        gameData,
        debug,
        isRunning = false,
        useSort = true,
        isPaused = false,
        sort = function () {
            Sugar.stableSort.inplace(objects, function (a, b) {
                return a.z - b.z;
            });
            /*// default behavior
            objects.sort(function (a, b) {
                return a.z - b.z;
            });*/
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
        predraw = function () {},
        cycle = function (time) {
            var object,
                i,
                currentTime = new Date().getTime(),
                deltaT = currentTime - lastTime;

            if (debug && debug.debugBar) {
                debug.fps = Math.round(1000 / (window.performance.now() - debug.lastTime), 2);
                debug.fpsAccumulator += debug.fps;
                debug.fpsTicks += 1;
                debug.avg = Math.round(debug.fpsAccumulator / debug.fpsTicks);
                if (debug.fpsTicks > debug.fpsMaxAverage) {
                    debug.fpsAccumulator = 0;
                    debug.fpsTicks = 0;
                }
                debug.debugBar.innerHTML = 'fps: ' + debug.avg;
                debug.lastTime = window.performance.now();
            }

            lastTime = currentTime;
            cumulativeTime += deltaT;
            gameData.deltaT = deltaT;
            while (cumulativeTime >= 1000 / 60) {
                cumulativeTime -= 1000 / 60;
                if (cumulativeTime > 1000 / minimumFps) {
                    // deplete cumulative time
                    while (cumulativeTime >= 1000 / 60) {
                        cumulativeTime -= 1000 / 60;
                    }
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
            predraw();
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

            requestAnimationFrame(cycle);
        };

        if (!window.performance) {
            window.performance = {
                now: Date.now
            };
        }

    return {
        init: function (data, debugObj) {
            gameData = data;
            debug = debugObj;
        },
        add: function (object) {
            var i, type, family;
            object.z = object.z || 0;
            objects.push(object);
            if (object.init) {
                object.init();
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
                    Sugar.removeObject(quickAccess[type], object);
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
                    this.remove(object);
                }
            }
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
                cycle();
                isRunning = true;
            }
        }
    };
});