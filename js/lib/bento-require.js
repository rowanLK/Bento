/**
 * A very simple require system
 */
(function () {
    'use strict';
    var modules = {},
        waiting = {},
        searchCircular = function (name, parent) {
            var i, l;
            var module;
            var moduleName;
            var array;

            // check for circular dependency
            for (moduleName in waiting) {
                if (!waiting.hasOwnProperty(moduleName)) {
                    continue;
                }
                array = waiting[moduleName];
                for (i = 0, l = array.length; i < l; ++i) {
                    module = array[i];
                    if (module.parentName === name && parent === moduleName) {
                        throw 'Circular dependency for "' + name + '", found in "' + parent + '"';
                    }
                }
            }

        },
        getModule = function (name, onSuccess, parent) {
            if (modules[name]) {
                // module exists! return immediately
                onSuccess(modules[name]);
                return;
            }

            searchCircular(name, parent);

            // does not exist yet, put on waiting list
            waiting[name] = waiting[name] || [];
            waiting[name].push({
                parent: parent,
                onSuccess: onSuccess
            });
        },
        defineAndFlush = function (name, module) {
            var i, l,
                callbacksWaiting = waiting[name],
                onSuccess;

            // add to modules
            modules[name] = module;

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
                        getModule(dep[i], function (module) {
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
                getModule(dep[i], function (module) {
                    loaded += 1;
                    if (loaded === l) {
                        // all modules are loaded
                        end();
                    }
                });
            }
        },
        define = function (name, dep, fn) {
            var i, l,
                params = [],
                loaded = 0,
                ready,
                end = function () {
                    var params = [],
                        myModule;

                    // build param list and call function
                    for (i = 0, l = dep.length; i < l; ++i) {
                        getModule(dep[i], function (module) {
                            params.push(module);
                        });
                    }
                    myModule = fn.apply(window, params);
                    // add to modules list
                    defineAndFlush(name, myModule);
                };
            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0, l = dep.length; i < l; ++i) {
                getModule(dep[i], function (module) {
                    loaded += 1;
                    if (loaded === dep.length) {
                        // all modules are loaded
                        end();
                    }
                }, name);
            }
        };

    // export
    window.require = require;
    window.define = define;
})();