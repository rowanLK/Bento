/**
 * A very simple require system
 */
(function () {
    'use strict';
    var modules = {},
        defines = {},
        waiting = {},
        getModule = function (name, history, onSuccess, parent) {
            if (modules[name] !== void(0)) {
                // module exists! return immediately
                // note: a module may be null if a circular dependency exists
                onSuccess(modules[name]);
                return;
            }
            // does not exist yet, put on waiting list
            waiting[name] = waiting[name] || [];
            waiting[name].push({
                parent: parent,
                onSuccess: onSuccess
            });
            // not loaded yet, but in defines
            if (defines[name]) {
                loadModule(name, defines[name].dep, defines[name].fn, history);
            } else {
                console.log("FATAL: module " + name + " was never declared before.");
            }
        },
        loadModule = function (name, dep, fn, history) {
            var i, l,
                historyNode,
                params = [],
                loaded = 0,
                ready,
                end = function () {
                    var params = [],
                        myModule;

                    // build param list and call function
                    for (i = 0, l = dep.length; i < l; ++i) {
                        getModule(dep[i], historyNode, function (module) {
                            params.push(module);
                        });
                    }
                    myModule = fn.apply(window, params);
                    // add to modules list
                    defineAndFlush(name, myModule);
                };

            // check for circular dependencies
            if (history.indexOf(name) >= 0) {
                // circular dependency!
                console.log('Circular dependency by ' + name + ': ', JSON.stringify(history));

                // continue by nulling the module
                defineAndFlush(name, null);
                return;
            }
            // none found
            historyNode = history.concat([name]);

            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0, l = dep.length; i < l; ++i) {
                getModule(dep[i], historyNode, function (module) {
                    loaded += 1;
                    if (loaded === dep.length) {
                        // all modules are loaded
                        end();
                    }
                }, name);
            }
        },
        defineAndFlush = function (name, module) {
            var i, l,
                callbacksWaiting = waiting[name],
                onSuccess;

            // add to modules
            modules[name] = module;
            // remove from define list
            if (module !== null) {
                delete defines[name];
            }
            // flush waiting
            if (!callbacksWaiting) {
                return;
            }
            for (i = 0, l = callbacksWaiting.length; i < l; ++i) {
                onSuccess = callbacksWaiting[i].onSuccess;
                onSuccess(module);
            }
            waiting[name] = [];
        },
        require = function (dep, fn) {
            var i, l,
                loaded = 0,
                ready,
                end = function () {
                    var params = [];

                    // build param list and call function
                    for (i = 0, l = dep.length; i < l; ++i) {
                        getModule(dep[i], [], function (module) {
                            params.push(module);
                        });
                    }
                    fn.apply(window, params);
                };
            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0, l = dep.length; i < l; ++i) {
                getModule(dep[i], [], function (module) {
                    loaded += 1;
                    if (loaded === l) {
                        // all modules are loaded
                        end();
                    }
                });
            }
        },
        define = function (name, dep, fn) {
            // put it in the defines list
            defines[name] = {
                dep: dep,
                fn: fn
            };
        };

    // export
    window.require = require;
    window.define = define;
})();